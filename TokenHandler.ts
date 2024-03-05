import { sign } from 'jsonwebtoken';
import fetch from "node-fetch";
import { v4 as uuidv4 } from 'uuid';
import SecretsManager = require("aws-sdk/clients/secretsmanager");
import { tokenEndpoint } from ".";
import { TokenResponse } from "./TokenResponse";
import * as path from 'path';
import * as fs from 'fs';

export interface JWTBodyOptions {
  iss: string;
  sub: string;
  aud: string[] | string;
  jti: string;
  exp: number;
  nbf: number | null;
  iat: number | null;
}

async function getPrivateKey(): Promise<string> {
  const privateKeySecretId = process.env.PRIVATE_KEY_SECRET_ID;
  if (!privateKeySecretId) {
    // throw new Error("PRIVATE_KEY_SECRET_ID is not set. It must be set to determine the secret to use for the private key.");
    // Try reading file "private.pem" from the current directory
    const privateKey = fs.readFileSync(path.join(__dirname, 'private.pem'), 'utf-8');
    return privateKey
  }
  const client = new SecretsManager({ region: "ca-central-1" });
  const data = await client.getSecretValue({ SecretId: privateKeySecretId }).promise();
  if (data.SecretString) {
    return data.SecretString;
  } else {
    throw new Error(`Secret referenced by environment variable "${privateKeySecretId}" not found`);
  }
}

export async function createJWT(clientId: string): Promise<string> {
  const tNow = Math.floor(Date.now() / 1000);
  const tEnd = tNow + 300;
  const message: JWTBodyOptions = {
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint,
    jti: uuidv4(),
    nbf: tNow,
    iat: tNow,
    exp: tEnd
  };
  // 14A92200E85F13CD8FAE318B0B879A4A8EEA50DB epic-himss
  // 68C68FAE09EF47FFCE795DAAB6875CFD3128A970 mindtrace
  const privateKey = await getPrivateKey();
  const kid = "14A92200E85F13CD8FAE318B0B879A4A8EEA50DB";
  const signature = sign(message, privateKey, { algorithm: 'RS384', keyid: kid });
  return signature;
}
export async function fetchBackendToken(clientId: string) {
  const token = await createJWT(clientId);
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

