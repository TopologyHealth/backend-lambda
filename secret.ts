import { IAMClient, ListRoleTagsCommand } from '@aws-sdk/client-iam';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { APIGatewayEventRequestContextWithAuthorizer } from 'aws-lambda';

const iamClient = new IAMClient({});
export const secretsManagerClient = new SecretsManagerClient({});

const getSecretArnForRole = async (roleArn: string): Promise<string | null> => {
  const roleName = roleArn.split('/').pop();
  if (!roleName) {
    return null;
  }

  try {
    const command = new ListRoleTagsCommand({ RoleName: roleName });
    const tags = await iamClient.send(command);
    const secretTag = tags.Tags?.find(tag => tag.Key === 'SecretAccess');
    return secretTag?.Value || null;
  } catch (error) {
    console.error('Error getting role tags:', error);
    return null;
  }
};

export const getSecretValue = async (secretArn: string): Promise<string> => {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const secret = await secretsManagerClient.send(command);
    return secret.SecretString || '';
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
};

export async function getPrivateKey(eventRequestContext: APIGatewayEventRequestContextWithAuthorizer<{
  [name: string]: any;
}>) {
  const getRole = () => {
    if (!eventRequestContext || !eventRequestContext.identity || !eventRequestContext.identity.caller) {
      throw new Error('Role failed to be determined from event identity.')
    }
    return eventRequestContext.identity.caller
  }

  const roleArn = getRole();
  const secretArn = await getSecretArnForRole(roleArn);
  if (!secretArn) {
    console.error('Error retrieving secret:', "Secret not found for the given role'");
  }
  return await getSecretValue(secretArn);
}