import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: 'ap-northeast-1',
});

export const docClient = DynamoDBDocumentClient.from(client);

export const TABLES = {
  USERS: 'declaration-app-users',
  DECLARATIONS: 'declaration-app-declarations',
};