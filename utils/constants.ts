import { DynamoDB } from "@aws-sdk/client-dynamodb";

export const ddbClient = new DynamoDB();

export const MOMENTO_API_ENDPOINT =
  "https://api.cache.cell-us-east-1-1.prod.a.momentohq.com";

export const EVENTS_TABLE_NAME = "ses-tracker-events";
