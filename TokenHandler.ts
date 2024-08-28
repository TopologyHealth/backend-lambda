import { sign } from 'jsonwebtoken';
import fetch from "node-fetch";
import { v4 as uuidv4 } from 'uuid';
import SecretsManager = require("aws-sdk/clients/secretsmanager");
import { EMR_TYPE, tokenEndpoint } from ".";
import { TokenResponse } from "./TokenResponse";

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
    const fs = require('fs');
    const privateKey = fs.readFileSync('private.pem', 'utf-8');
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
  const kid = "7ab24557-a9de-4926-850e-5c3bcaaf8c31"
  const privateKey = await getPrivateKey();
  const signature = sign(message, privateKey, { algorithm: 'RS256', keyid: kid });
  return signature;
}
export async function fetchBackendToken(clientId: string) {
  if (process.env.AUTH_TYPE === "client_credentials") {
    return await fetchAuthTokenWithSecret(clientId);
  }
  console.log(`Fetching token for clientId: ${clientId} with key`);
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
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      ...(authorization ?? {})
    },
    body: new URLSearchParams(params)
  });
  const tokenResponse = await (tokenFetchResponse.json() as Promise<TokenResponse>);
  return tokenResponse;
}

const athenaScopes = [
  "athena/service/Athenanet.MDP.*",
  "system/AllergyIntolerance.read",
  "system/Binary.read",
  "system/CarePlan.read",
  "system/CareTeam.read",
  "system/Condition.read",
  "system/Device.read",
  "system/DiagnosticReport.read",
  "system/DocumentReference.read",
  "system/Encounter.read",
  "system/Goal.read",
  "system/Immunization.read",
  "system/Location.read",
  "system/Medication.read",
  "system/MedicationRequest.read",
  "system/Observation.read",
  "system/Organization.read",
  "system/Patient.read",
  "system/Practitioner.read",
  "system/PractitionerRole.read",
  "system/Procedure.read",
  "system/Provenance.read",
  "system/ServiceRequest.read",
];

async function fetchAuthTokenWithSecret(clientId: string) {
  console.log(`Fetching token for clientId: ${clientId} with secret`);
  const base64Credentials = btoa(`${clientId}:${process.env.EMR_CLIENT_SECRET}`);
  const token = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      // 'Authorization': `Basic ${base64Credentials}`
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "patient/*.read",
      client_id: clientId,
      client_secret: process.env.EMR_CLIENT_SECRET
    })
  })
  return await (token.json() as Promise<TokenResponse>);
}
