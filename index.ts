import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as dotenv from "dotenv";
import { fetchBackendToken } from './TokenHandler';
dotenv.config();

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  try {
    const tokenResponse = await initiateBackendAuth(event.headers);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Result of token creation event attached in this body.',
        tokenResponse: tokenResponse
      }),
    };
  } catch (e) {
    if (e instanceof Error) {
      console.error('Error: ', e)
      return {
        statusCode: 500,
        body: 'Internal Server Error'
      }
    }
  }
};

async function initiateBackendAuth(eventHeaders: APIGatewayProxyEventHeaders) {
  const tokenResponse = await fetchBackendToken(eventHeaders);
  console.log('Token Response: ', tokenResponse);
  return tokenResponse
}