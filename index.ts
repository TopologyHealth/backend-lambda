import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { fetchBackendToken } from './TokenHandler';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  const tokenResponse = await initiateBackendAuth();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'hello world',
      tokenResponse: tokenResponse
    }),
  };
};

async function initiateBackendAuth() {
  try {
    const emrClientID = process.env.EMR_CLIENT_ID ?? ''

    try {
      const tokenResponse = await fetchBackendToken(emrClientID);
      console.log('Token Response: ', tokenResponse);
      return tokenResponse
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error(`Unknown Error: ${e}`)
    }
  }
  catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error(`Unknown Error: ${e}`)
  }
}