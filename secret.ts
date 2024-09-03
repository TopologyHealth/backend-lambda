import { IAMClient, ListRoleTagsCommand } from '@aws-sdk/client-iam';
import { GetSecretValueCommand, GetSecretValueCommandOutput, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import assert = require('assert');
import { APIGatewayEventRequestContextWithAuthorizer } from 'aws-lambda';

const iamClient = new IAMClient({});
export const secretsManagerClient = new SecretsManagerClient({});

export const getSecretArnForRole = async (roleArn: string): Promise<string> => {
  const roleName = roleArn.split('/')[1];
  try {
    assert(roleName)
    const command = new ListRoleTagsCommand({ RoleName: roleName });
    const tags = await iamClient.send(command);
    const secretTag = tags.Tags?.find(tag => tag.Key === 'SecretAccess');
    const secretTagValue = secretTag?.Value
    if (secretTagValue) return secretTagValue
    throw new Error('No Secret Tag value could be found.')
  } catch (error) {
    console.error('Error getting role tags:', error);
  }
};

export const getSecret = async (secretArn: string): Promise<GetSecretValueCommandOutput> => {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const secret = await secretsManagerClient.send(command);
    return secret;
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
};

export const getRoleArn = (eventRequestContext: APIGatewayEventRequestContextWithAuthorizer<{
  [name: string]: any;
}>) => {
  if (!eventRequestContext || !eventRequestContext.identity || !eventRequestContext.identity.userArn) {
    throw new Error('Role failed to be determined from event identity.')
  }
  return eventRequestContext.identity.userArn
}

export async function getPrivateKey(secretArn: string) {
  const secret = await getSecret(secretArn);
  return {
    secretName: secret.Name,
    privateKey: secret.SecretString
  };
}