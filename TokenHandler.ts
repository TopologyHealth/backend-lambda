import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEventHeaders } from 'aws-lambda';
import { sign } from 'jsonwebtoken';
import fetch from "node-fetch";
import { v4 as uuidv4 } from 'uuid';
import { TokenResponse } from "./TokenResponse";
import { getApiData } from './gateway';
import { getEmrPath, getPrivateKey, getRoleArn, getTagForRole } from './secret';
import assert = require('assert');
import { Tag } from '@aws-sdk/client-iam';
import { KMSClient, ListResourceTagsCommand, SignCommand, SignCommandInput, SignCommandOutput } from '@aws-sdk/client-kms';

export interface JWTBodyOptions {
  iss: string;
  sub: string;
  aud: string[] | string;
  jti: string;
  exp: number;
  nbf: number | null;
  iat: number | null;
}

export async function createJWT(clientId: string, aud: string, roleTag: Tag): Promise<{
  token: any, emrPath: {
    customer: string;
    clientAppId: string;
  }
}> {
  const tNow = Math.floor(Date.now() / 1000);
  const tEnd = tNow + 300;
  const message: JWTBodyOptions = {
    iss: clientId,
    sub: clientId,
    aud: aud,
    jti: uuidv4(),
    nbf: tNow,
    iat: tNow,
    exp: tEnd
  };
  
  const tagKey = roleTag.Key;
  if (tagKey === 'SecretAccess') {
    return await signJWTWithSecret(roleTag, message);
  }

  if (tagKey === 'KMSAccess'){
    return await signJWTWithKMS(roleTag, message);
  }

  throw new Error(`Tag with key ${tagKey} is unsupported`)
}

async function signJWTWithKMS(roleTag: Tag, message: JWTBodyOptions) {
  const kmsID = roleTag.Value;
  const kmsClient = new KMSClient({ region: "us-east-2" });
  const input: SignCommandInput = {
    KeyId: kmsID,
    Message: Buffer.from(JSON.stringify(message)), // e.g. Buffer.from("") or new TextEncoder().encode("")   // required
    SigningAlgorithm: "RSASSA_PSS_SHA_384"
  };
  const signCommand = new SignCommand(input);
  const response: SignCommandOutput = await kmsClient.send(signCommand);

  const tags = await getKMSTags(kmsID, kmsClient);
  const clientIdTag = tags.find(tag => tag.TagKey === 'ClientID');
  assert(clientIdTag, `No Tag found for KMS with ID ${kmsID} with key 'ClientID'`);
  const tagValue = clientIdTag.TagValue;
  const emrPath = getEmrPath(tagValue);
  
  return { token: response.Signature, emrPath };
}

async function getKMSTags(kmsID: string, kmsClient: KMSClient) {
  const listTagsCommand = new ListResourceTagsCommand({ KeyId: kmsID });
  const kmsTagsList = await kmsClient.send(listTagsCommand);
  const tags = kmsTagsList.Tags;
  return tags;
}

async function signJWTWithSecret(roleTag: Tag, message: JWTBodyOptions) {
  const secretArn = roleTag.Value;
  const { privateKey, emrPath } = await getPrivateKey(secretArn);

  const signature = sign(message, privateKey, { algorithm: 'RS384' });
  return { token: signature, emrPath };
}

export async function fetchBackendToken(eventHeaders: APIGatewayProxyEventHeaders, eventRequestContext: APIGatewayEventRequestContextWithAuthorizer<{
  [name: string]: any;
}>) {
  const apiId = process.env.API_ID;
  assert(apiId, 'An apiId env variable must be included in the request (for the token endpoint)')
  const emrType = eventHeaders.emrType
  assert(emrType, 'An emrType header must be included in the request')
  const clientId = eventHeaders.clientId
  assert(clientId, 'A clientId header must be included in the request')

  const apiData = await getApiData(apiId, emrType)
  const roleArn = getRoleArn(eventRequestContext);
  const roleTag = await getTagForRole(roleArn);
  const {token, emrPath} = await createJWT(clientId, apiData.aud, roleTag);
  const tokenResponse = await fetchAuthToken(clientId, apiData.invokeUrl, {
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: token
  });
  return { tokenResponse, emrPath };
}

export async function fetchAuthToken(clientId: string, tokenEndpoint: string, params: { grant_type: string; } & Record<string, string>, authorization?: { Authorization: string; }) {
  const tokenFetchResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      accept: "application/x-www-form-urlencoded",
      ...(authorization ?? {})
    },
    body: new URLSearchParams(params),

  });
  if (!tokenFetchResponse.ok) throw new Error(JSON.stringify({ ...JSON.parse(await tokenFetchResponse.text()), clientId: clientId }))
  const tokenResponse = await (tokenFetchResponse.json() as Promise<TokenResponse>);
  return tokenResponse;
}

