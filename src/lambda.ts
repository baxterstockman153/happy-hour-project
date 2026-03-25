import serverlessExpress from '@vendia/serverless-express';
import type { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import app from './app';

let serverlessExpressInstance: ReturnType<typeof serverlessExpress>;

function setup(): ReturnType<typeof serverlessExpress> {
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance;
}

export const handler = (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback,
): void => {
  if (!serverlessExpressInstance) {
    setup();
  }
  serverlessExpressInstance(event, context, callback);
};
