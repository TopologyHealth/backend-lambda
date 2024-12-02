import { Tag } from '@aws-sdk/client-iam';
import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEventHeaders } from 'aws-lambda';
import fetch, { RequestInit } from "node-fetch";
import { v4 as uuidv4 } from 'uuid';
import { signJWTWithKMS } from './KMS';
import { TokenResponse } from "./TokenResponse";
import { getApiData } from './gateway';
import { getRoleArn, getTagForRole, signJWTWithSecret } from './secret';

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

  const { token, emrPath } = await createJWT(clientId, apiData.aud, roleTag);

  const tokenResponse = await fetchAuthToken(clientId, apiData.invokeUrl, {
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

  const tokenFetchResponse = await fetch(tokenEndpoint, fetchParams);
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