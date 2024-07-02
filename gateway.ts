import { ApiGatewayV2Client, GetApiCommand, GetApiCommandInput, GetApiCommandOutput, GetIntegrationCommand, GetIntegrationCommandInput, GetIntegrationCommandOutput, GetRoutesCommand, GetRoutesCommandInput, GetRoutesCommandOutput, Route } from "@aws-sdk/client-apigatewayv2";
import assert = require("assert");

const client = new ApiGatewayV2Client({ region: "ca-central-1" });

async function getRoute(apiId: string, emrType: string): Promise<Route> {
  const routes = await getRoutes(apiId)
  const routesItems = routes.Items;
  if (routesItems) {
    const emrRoute = routesItems.find(route => route.RouteKey.includes(emrType))
    if (emrRoute) return emrRoute
    console.error('Invalid EMR Header: ', emrType)
  }
}

async function getRoutes(apiId: string): Promise<GetRoutesCommandOutput> {
  try {
    const input: GetRoutesCommandInput = {
      ApiId: apiId,
    };
    const command = new GetRoutesCommand(input);
    const response: GetRoutesCommandOutput = await client.send(command);
    return response;
  } catch (error) {
    console.error("Error getting routes:", error);
    return undefined;
  }
}

async function getIntegration(apiId: string, integrationId: string): Promise<GetIntegrationCommandOutput> {
  try {
    const input: GetIntegrationCommandInput = {
      ApiId: apiId,
      IntegrationId: integrationId,
    };
    const command = new GetIntegrationCommand(input);
    const response: GetIntegrationCommandOutput = await client.send(command);
    return response;
  } catch (error) {
    console.error("Error getting integration:", error);
    return undefined;
  }
}

async function getApi(apiId: string): Promise<GetApiCommandOutput> {
  try {
    const input: GetApiCommandInput = {
      ApiId: apiId,
    };
    const command = new GetApiCommand(input);
    const response: GetApiCommandOutput = await client.send(command);
    return response;
  } catch (error) {
    console.error("Error getting API:", error);
    return undefined;
  }
}


export async function getApiData(apiId: string, emrType: string) {
  const api = await getApi(apiId)
  const apiEndpoint = api.ApiEndpoint;
  assert(apiEndpoint)

  const route = await getRoute(apiId, emrType)
  assert(route)
  const routeKey = route.RouteKey
  assert(routeKey)
  const routeEndpoint = routeKey.split('/').pop()

  const invokeUrl = `${apiEndpoint}/${routeEndpoint}`;

  const routeTarget = route.Target
  assert(routeTarget)

  const integrationId = route.Target.split('/').pop();
  assert(integrationId)

  const integration = await getIntegration(apiId, integrationId)
  const integrationUri = integration.IntegrationUri;
  assert(integrationUri)

  return {
    invokeUrl: invokeUrl,
    aud: integrationUri
  }
}
