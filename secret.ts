import { IAMClient, ListRoleTagsCommand, Tag } from '@aws-sdk/client-iam';
import { GetSecretValueCommand, GetSecretValueCommandOutput, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { APIGatewayEventRequestContextWithAuthorizer } from 'aws-lambda';
import assert = require('assert');

const iamClient = new IAMClient({});
export const secretsManagerClient = new SecretsManagerClient({});
const potentialTagKeys = ['SecretAccess', 'KMSAccess']

export const getTagForRole = async (roleArn: string): Promise<Tag> => {
  assert(roleArn.includes('/'), `RoleArn must include at least one '/'. Instead: ${roleArn}`)
  const roleName = roleArn.split('/')[1];
  const tags = await getTagsFromRoleName(roleName);
  const expectedTag: Tag = tags.find(tag => potentialTagKeys.includes(tag.Key))
  // const secretTag = tags.find(tag => tag.Key === 'SecretAccess');
  // const secretTagValue = secretTag.Value
  if (expectedTag) return expectedTag
  throw new Error(`No Tag with any key from ${potentialTagKeys} found in tags: ${tags} for role: ${roleName}`)
};

export const getSecret = async (secretArn: string): Promise<GetSecretValueCommandOutput> => {
  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const secret = await secretsManagerClient.send(command);
  return secret;
};

export const getRoleArn = (eventRequestContext: APIGatewayEventRequestContextWithAuthorizer<{
  [name: string]: any;
}>) => {
  if (!eventRequestContext || !eventRequestContext.identity || !eventRequestContext.identity.userArn) {
    throw new Error('Role failed to be determined from event identity.')
  }
  return eventRequestContext.identity.userArn
}

async function getTagsFromRoleName(roleName: string) {
  const command = new ListRoleTagsCommand({ RoleName: roleName });
  const roleTagsList = await iamClient.send(command);
  const tags = roleTagsList.Tags;
  return tags;
}

export async function getPrivateKey(secretArn: string) {
  const secret = await getSecret(secretArn);
  const secretName = secret.Name;
  const emrPath = getEmrPath(secretName);
  return {
    emrPath,
    privateKey: secret.SecretString
  };
}

export function getEmrPath(emrPathString: string) {
  assert(emrPathString.includes('/'), `EmrPathString must include at least one slash. Instead: ${emrPathString}`);
  const emrPathNameParts = emrPathString.split('/');
  assert(emrPathNameParts.length === 2, `EmrPathString should be split by one slash. Instead: ${emrPathString}`);
  const emrPath = {
    customer: emrPathNameParts[0],
    clientAppId: emrPathNameParts[1]
  };
  return emrPath;
}
