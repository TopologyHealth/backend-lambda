import { IAMClient, ListRoleTagsCommand } from '@aws-sdk/client-iam';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { APIGatewayProxyEvent } from 'aws-lambda';

const stsClient = new STSClient({});
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

const getCallerIdentity = async (event: APIGatewayProxyEvent) => {
  const token = event.headers.Authorization?.split(' ')[1];
  if (!token) {
    return null;
  }

  try {
    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);
    return response;
  } catch (error) {
    console.error('Error getting caller identity:', error);
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

export async function getPrivateKey(event: APIGatewayProxyEvent) {

  //TODO: fix this when deployed
  // const callerIdentity = await getCallerIdentity(event);
  // if (!callerIdentity) {
  //   return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) };
  // }
  const roleArn = "arn:aws:iam::105227342372:role/josh-epic-sandbox-71acdb69-token-getter" //callerIdentity.Arn;

  const secretArn = await getSecretArnForRole(roleArn);
  if (!secretArn) {
    console.error('Error retrieving secret:', "Secret not found for the given role'");
  }
  return await getSecretValue(secretArn);
}