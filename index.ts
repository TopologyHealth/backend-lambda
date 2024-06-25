import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as dotenv from "dotenv";
import { fetchBackendToken } from './TokenHandler';
dotenv.config();


const EMR_TYPE = process.env.EMR_TYPE;
export const tokenEndpoint = process.env.TOKEN_ENDPOINT;

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  
  try {
    const clientId = event.headers.clientId
    if (!clientId) throw new Error('A clientId header must be included in the request')
    const tokenResponse = await initiateBackendAuth(clientId);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Result of token creation event attached in this body.',
        tokenResponse: tokenResponse
      }),
    };
  } catch (e) {
    if (e instanceof Error) {
      return {
        statusCode: 500,
        body: e.message
      }
    }
  }
};

async function initiateBackendAuth(clientId: string) {
  const tokenResponse = await fetchBackendToken(clientId);
  console.log('Token Response: ', tokenResponse);
  return tokenResponse
}