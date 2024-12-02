import { Tag } from '@aws-sdk/client-iam';
import { JWTBodyOptions } from './TokenHandler';

import { KMSClient, ListResourceTagsCommand, SignCommand, SignCommandInput, SignCommandOutput } from '@aws-sdk/client-kms';
import assert = require('assert');
import { getEmrPath, toBase64Url } from './utils';


export async function signJWTWithKMS(roleTag: Tag, messagePayload: JWTBodyOptions) {
  const kmsID = roleTag.Value;

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