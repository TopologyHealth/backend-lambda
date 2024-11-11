import { Tag } from '@aws-sdk/client-iam';
import { KMSClient, ListResourceTagsCommand, SignCommand, SignCommandInput, SignCommandOutput } from '@aws-sdk/client-kms';
import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEventHeaders } from 'aws-lambda';
import { sign } from 'jsonwebtoken';
import fetch, { RequestInit } from "node-fetch";
import { v4 as uuidv4 } from 'uuid';
import { TokenResponse } from "./TokenResponse";
import { getApiData } from './gateway';
import { getEmrPath, getPrivateKey, getRoleArn, getTagForRole } from './secret';

import assert = require('assert');

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
  token: string, emrPath: {
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

  if (tagKey === 'KMSAccess') {
    return await signJWTWithKMS(roleTag, message);
  }

  throw new Error(`Tag with key ${tagKey} is unsupported`)
}

async function signJWTWithKMS(roleTag: Tag, messagePayload: JWTBodyOptions) {
  const kmsID = roleTag.Value;

  console.log("kmsId: ", kmsID)

  const headers = {
    "alg": "RS384",
    "typ": "JWT",
    "kid": kmsID
  }

  const encodedHeader = toBase64Url(headers)
  const encodedPayload = toBase64Url(messagePayload)
  const message = `${encodedHeader}.${encodedPayload}`;
  const messageBuffer = Buffer.from(message);

  const kmsClient = new KMSClient({ region: "us-east-2" });
  const input: SignCommandInput = {
    KeyId: kmsID,
    Message: messageBuffer,
    SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_384",
    MessageType: 'RAW'
  };
  const signCommand = new SignCommand(input);
  const response: SignCommandOutput = await kmsClient.send(signCommand);

  const tags = await getKMSTags(kmsID, kmsClient);
  const clientIdTag = tags.find(tag => tag.TagKey === 'ClientID');
  assert(clientIdTag, `No Tag found for KMS with ID ${kmsID} with key 'ClientID'`);
  const tagValue = clientIdTag.TagValue;
  const emrPath = getEmrPath(tagValue);

  const signatureBase64Url = Buffer.from(response.Signature).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${encodedHeader}.${encodedPayload}.${signatureBase64Url}`;

  return { token: jwt, emrPath };
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
  //TODO: Change this before continuing
  const invokeUrl = "https://staging-oauthserver.ecwcloud.com/oauth/oauth2/token"

  const { token, emrPath } = await createJWT(clientId, invokeUrl, roleTag);

  console.log(token)

  const tokenResponse = await fetchAuthToken(clientId, invokeUrl, {
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: token,
    scope: "system/Patient.read system/Group.read"
  });
  return { tokenResponse, emrPath };
}

export async function fetchAuthToken(clientId: string, tokenEndpoint: string, params: { grant_type: string; } & Record<string, string>, authorization?: { Authorization: string; }) {
  const fetchParams: RequestInit = {
    method: "POST",
    headers: {
      accept: "application/x-www-form-urlencoded",
      ...(authorization ?? {})
    },
    body: (new URLSearchParams(params)),
  };
  console.log('tokenEndpoint: ', tokenEndpoint)
  console.log('fetchParams: ', fetchParams)
  const tokenFetchResponse = await fetch(tokenEndpoint, fetchParams);
  console.log(params)
  if (!tokenFetchResponse.ok) throw new Error(JSON.stringify(
    {
      status: tokenFetchResponse.status,
      text: await tokenFetchResponse.text(),
      statusText: tokenFetchResponse.statusText,
      clientId: clientId
    }
  ))
  const tokenResponse = await (tokenFetchResponse.json() as Promise<TokenResponse>);
  return tokenResponse;
}

function toBase64Url(obj: object): string {
  const json = JSON.stringify(obj);
  return Buffer.from(json).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
