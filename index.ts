import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as dotenv from "dotenv";
import { fetchBackendToken } from './TokenHandler';
dotenv.config();
require('source-map-support').install();
import assert = require('assert');

/**
 * The above function is an asynchronous handler that logs event and context information, initiates backend authentication, and returns a response with token
 * creation details or an error message.
 * @param {APIGatewayProxyEvent} event - The `event` parameter in the code snippet refers to an object containing information about the event that triggered the
 * Lambda function. In this case, it is of type `APIGatewayProxyEvent`, which likely includes details about the HTTP request that the API Gateway received.
 * @param {Context} context - The `context` parameter in your AWS Lambda handler function contains information about the execution environment and runtime of your
 * function. It includes details such as the AWS request ID, function name, memory limit, and more. This information can be useful for logging and monitoring
 * purposes.
 * @returns The handler function is returning a response object with a status code of 200 if the execution is successful. The body of the response contains a
 * message indicating the result of the token creation event, along with the `tokenResponse` and `emrPath` values. If an error occurs during execution, a response
 * object with a status code of 500 and a body of 'Internal Server Error' is
 */
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

/**
 * The function `initiateBackendAuth` initiates backend authentication by fetching a token and EMR path.
 * @param {APIGatewayProxyEventHeaders} eventHeaders - The `eventHeaders` parameter in the `initiateBackendAuth` function likely contains the headers of an API
 * Gateway proxy event. These headers may include information such as content type, authorization token, and other metadata related to the incoming HTTP request.
 * @param eventRequestContext - The `eventRequestContext` parameter in the `initiateBackendAuth` function represents the request context of an API Gateway event
 * with an authorizer. It contains information about the request, such as the identity of the caller, the HTTP method, the request path, and any authorizer
 * context. In
 * @returns The function `initiateBackendAuth` is returning an object with two properties: `tokenResponse` and `emrPath`. The values of these properties are
 * obtained by calling the `fetchBackendToken` function with the provided `eventHeaders` and `eventRequestContext` parameters and awaiting the result. The function
 * then logs the `tokenResponse` to the console before returning the object with both `
 */
async function initiateBackendAuth(eventHeaders: APIGatewayProxyEventHeaders, eventRequestContext: APIGatewayEventRequestContextWithAuthorizer<{
  [name: string]: any;
}>) {
  const { tokenResponse, emrPath } = await fetchBackendToken(eventHeaders, eventRequestContext);
  console.log('Token Response: ', tokenResponse);
  return { tokenResponse, emrPath }
}