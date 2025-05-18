import { AttributeValue, QueryCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddbClient, EVENTS_TABLE_NAME } from "../utils/constants";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DDB_INDEXES } from "../utils/ddb";

const defaultHeaders = {
  "Content-Type": "application/json",
};

export const handler: APIGatewayProxyHandlerV2 = async (e, ctx) => {
  const queryParams = e.queryStringParameters;
  // pagination
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;

  const page_size = parseInt(queryParams?.page_size ?? "30");

  if (queryParams?.next_token) {
    exclusiveStartKey = JSON.parse(
      Buffer.from(queryParams.next_token, "base64").toString(),
    );
  }
  const dbCmd = new QueryCommand({
    TableName: EVENTS_TABLE_NAME,
    KeyConditionExpression: "GSI1PK = :supress",
    ExpressionAttributeValues: { ":supress": { S: "SUPRESS" } },
    IndexName: "GSI1",
    ExclusiveStartKey: exclusiveStartKey,
    Limit: page_size,
    ScanIndexForward: false,
  });

  try {
    const dbRes = await ddbClient.send(dbCmd);

    const result = dbRes.Items?.map((item) => {
      const rawItem = unmarshall(item);
      // delete the GSI indexes
      DDB_INDEXES.forEach((key) => {
        delete rawItem[key];
      });
      return rawItem;
    });

    if (!result || result.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No items found" }),
      };
    }

    let nextToken: string | null = null;

    if (dbRes.LastEvaluatedKey) {
      // decode nextToken from query param
      const tokenStr = JSON.stringify(dbRes.LastEvaluatedKey);
      nextToken = Buffer.from(tokenStr).toString("base64");
    }

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify({ items: result, nextToken }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({ error: error }),
    };
  }
};
