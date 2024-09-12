import { ApiGatewayV2Client, GetApiCommand, GetApiCommandInput, GetApiCommandOutput, GetIntegrationCommand, GetIntegrationCommandInput, GetIntegrationCommandOutput, GetRoutesCommand, GetRoutesCommandInput, GetRoutesCommandOutput, Route } from "@aws-sdk/client-apigatewayv2";
import assert = require("assert");

const client = new ApiGatewayV2Client({ region: "ca-central-1" });

async function getRoute(apiId: string, emrType: string): Promise<Route> {
  const routes = await getRoutes(apiId)
  const routesItems = routes.Items;
  const emrRoute = routesItems.find(route => route.RouteKey.includes(emrType))
  assert(emrRoute, `No valid emrRoute found in ${JSON.stringify(routesItems)} for emrType '${emrType}'`)
  return emrRoute
}

async function getRoutes(apiId: string): Promise<GetRoutesCommandOutput> {
  const input: GetRoutesCommandInput = {
    ApiId: apiId,
  };
  const command = new GetRoutesCommand(input);
  const response: GetRoutesCommandOutput = await client.send(command);
  return response;
}

async function getIntegration(apiId: string, integrationId: string): Promise<GetIntegrationCommandOutput> {
  const input: GetIntegrationCommandInput = {
    ApiId: apiId,
    IntegrationId: integrationId,
  };
  const command = new GetIntegrationCommand(input);
  const response: GetIntegrationCommandOutput = await client.send(command);
  return response;
}

async function getApi(apiId: string): Promise<GetApiCommandOutput> {
  const input: GetApiCommandInput = {
    ApiId: apiId,
  };
  const command = new GetApiCommand(input);
  const response: GetApiCommandOutput = await client.send(command);
  return response
}


export async function getApiData(apiId: string, emrType: string) {
  const api = await getApi(apiId)
  const apiEndpoint = api.ApiEndpoint;
  const route = await getRoute(apiId, emrType)
  const routeKey = route.RouteKey
  assert(routeKey.includes('/'), `RouteKey must include a '/' as part of the path. Instead: '${routeKey}'`)

  const routeEndpoint = routeKey.split('/').pop()
  const invokeUrl = `${apiEndpoint}/${routeEndpoint}`;

  const routeTarget = route.Target
  assert(routeTarget.includes('/'), `Route.Target must include a '/' as part of the path. Instead: '${routeTarget}'`)

  const integrationId = route.Target.split('/').pop();

  const integration = await getIntegration(apiId, integrationId)
  const integrationUri = integration.IntegrationUri;

  return {
    invokeUrl: invokeUrl,
    aud: integrationUri
  }
}
