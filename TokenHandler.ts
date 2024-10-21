import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEventHeaders } from 'aws-lambda';
import { sign } from 'jsonwebtoken';
import fetch from "node-fetch";
import { v4 as uuidv4 } from 'uuid';
import { TokenResponse } from "./TokenResponse";
import { getApiData } from './gateway';
import { getRoleArn, getSecretArnForRole, getSecretValueDetails } from './secret';
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

export async function createJWT(clientId: string, aud: string, secretValue: string): Promise<string> {
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

  //TODO: need to add logic: check if secretValue is a privateKey or a keyId
  const isPrivateKey = (secretValue: string) => secretValue.includes("BEGIN PRIVATE KEY")
  const isKMSKeyId = (secretValue: string) => !isPrivateKey(secretValue) && secretValue.split('-').length > 0

  if (isPrivateKey(secretValue)) return sign(message, secretValue, { algorithm: 'RS384' });
  if (isKMSKeyId(secretValue)) {
    const signedToken = "TODO"
    return signedToken
  }
  throw new Error('Retreived Secret value is of unknown type. Failed to sign JWT.')

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
  const secretArn = await getSecretArnForRole(roleArn);
  const { secretValue, emrPath } = await getSecretValueDetails(secretArn)
  const token = await createJWT(clientId, apiData.aud, secretValue);
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

