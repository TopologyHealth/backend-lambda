import { IAMClient, ListRoleTagsCommand } from '@aws-sdk/client-iam';
import { GetSecretValueCommand, GetSecretValueCommandOutput, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { APIGatewayEventRequestContextWithAuthorizer } from 'aws-lambda';
import assert = require('assert');

const iamClient = new IAMClient({});
export const secretsManagerClient = new SecretsManagerClient({});

export const getSecretArnForRole = async (roleArn: string): Promise<string> => {
  assert(roleArn.includes('/'), `RoleArn must include at least one '/'. Instead: ${roleArn}`)
  const roleName = roleArn.split('/')[1];
  const tags = await getTagsFromRoleName(roleName);
  const secretTag = tags.find(tag => tag.Key === 'SecretAccess');
  const secretTagValue = secretTag.Value
  if (secretTagValue) return secretTagValue
  throw new Error(`No Tag with key 'SecretAccess' found in tags: ${tags} for role: ${roleName}`)
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

export async function getSecretValueDetails(secretArn: string): Promise<{ emrPath: { customer: string, clientAppId: string }, secretValue: string }> {
  const secret = await getSecret(secretArn);
  const secretName = secret.Name;
  assert(secretName.includes('/'), `SecretName must include at least one slash. Instead: ${secretName}`)
  const secretNameParts = secretName.split('/')
  assert(secretNameParts.length === 2, `SecretName should be split by one slash. Instead: ${secretName}`)
  const emrPath = {
    customer: secretNameParts[0],
    clientAppId: secretNameParts[1]
  }
  return {
    emrPath,
    secretValue: secret.SecretString
  };
}