import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as dotenv from "dotenv";
import { fetchBackendToken } from './TokenHandler';
dotenv.config();
require('source-map-support').install();
import assert = require('assert');

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  try {
    const eventHeaders = event.headers;
    assert(eventHeaders, "EventHeaders must be defined")
    const requestContext = event.requestContext;
    assert(requestContext, "RequestContext must be defined")
    const { tokenResponse, emrPath } = await initiateBackendAuth(eventHeaders, requestContext);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Result of token creation event attached in this body.',
        tokenResponse: tokenResponse,
        emrPath
      }),
    };
  } catch (e) {
    if (e instanceof Error) {
      console.error(e)
      return {
        statusCode: 500,
        body: 'Internal Server Error'
      }
    }
  }
};

async function initiateBackendAuth(eventHeaders: APIGatewayProxyEventHeaders, eventRequestContext: APIGatewayEventRequestContextWithAuthorizer<{
  [name: string]: any;
}>) {
  const { tokenResponse, emrPath } = await fetchBackendToken(eventHeaders, eventRequestContext);
  console.log('Token Response: ', tokenResponse);
  return { tokenResponse, emrPath }
}