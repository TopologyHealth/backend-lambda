import fs from "fs";
import { sign } from 'jsonwebtoken';
import fetch from "node-fetch";
import { v4 as uuidv4 } from 'uuid';
import { TokenResponse } from "./TokenResponse";

const EMR_TYPE = process.env.EMR_TYPE ?? '';
const tokenEndpoint = process.env.TOKEN_ENDPOINT ?? '';

export interface JWTBodyOptions {
  iss: string;
  sub: string;
  aud: string[] | string;
  jti: string;
  exp: number;
  nbf: number | null;
  iat: number | null;
}

export function createJWT(clientId: string): string {
  const tNow = Math.floor(Date.now() / 1000);
  const tEnd = tNow + 300;
  const message: JWTBodyOptions = {
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint.toString(),
    jti: uuidv4(),
    nbf: tNow,
    iat: tNow,
    exp: tEnd
  };

  const privateKey = fs.readFileSync('private.key', 'utf8')
  if (!privateKey) throw new Error('No Private Key provided. You must provide the privateKey explicitly as an env variable');
  const signature = sign(message, privateKey, { algorithm: 'RS384' });
  return signature;
}
export async function fetchBackendToken(clientId: string) {
  const token = createJWT(clientId);
  const tokenResponse = await fetchAuthToken({
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: token
  });
  return tokenResponse;
}

export async function fetchAuthToken(params: { grant_type: string; } & Record<string, string>, authorization?: { Authorization: string; }) {
  const tokenFetchResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      accept: "application/x-www-form-urlencoded",
      ...(authorization ?? {})
    },
    body: new URLSearchParams(params)
  });
  const tokenResponse = await (tokenFetchResponse.json() as Promise<TokenResponse>);
  return tokenResponse;
}

