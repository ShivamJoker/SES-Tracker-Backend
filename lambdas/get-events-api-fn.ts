import { AttributeValue, QueryCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddbClient, EVENTS_TABLE_NAME } from "../utils/constants";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DDB_INDEXES } from "../utils/ddb";

type QueryParamsList = "from" | "to" | "status" | "next_token" | "page_size";

const defaultHeaders = {
  "Content-Type": "application/json",
};

export const handler: APIGatewayProxyHandlerV2 = async (e, ctx) => {
  const queryParams = e.queryStringParameters as
    | Partial<Record<QueryParamsList, string>>
    | undefined;

  const userId = e.pathParameters?.userId;

  // pagination
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;

  const page_size = parseInt(queryParams?.page_size ?? "30");

  if (queryParams?.next_token) {
    exclusiveStartKey = JSON.parse(
      Buffer.from(queryParams.next_token, "base64").toString(),
    );
  }

  const getFromToExpression = (
    attrVals: Record<string, AttributeValue>,
    tsField: "SK" | "GSI1SK" | "GSI2SK" = "GSI1SK",
  ) => {
    if (queryParams?.from && queryParams?.to) {
      const expression = ` AND ${tsField} BETWEEN :from AND :to`;
      attrVals[":from"] = { S: `EVENT_TS#${queryParams.from}` };
      attrVals[":to"] = { S: `EVENT_TS#${queryParams.to}` };

      return expression;
    }

    return "";
  };

  const ExpressionAttributeValues: Record<string, AttributeValue> = {};

  let FilterExpression: string | undefined = undefined;

  let expression: string | undefined = undefined;

  let IndexName = "GSI1";

  /*   if (userId) {
    ExpressionAttributeValues[":PK"] = { S: `CLIENT#${userId}` };
    expression = "PK = :PK";
    expression += getFromToExpression(ExpressionAttributeValues, "SK");
  } else {
    expression = "GSI2PK = :GSI2PK";
    IndexName = "GSI2";
    expression += getFromToExpression(ExpressionAttributeValues, "GSI2SK");
    ExpressionAttributeValues[":GSI2PK"] = { S: `EVENT` };
  } */

  if (queryParams?.status) {
    IndexName = "GSI2";
    expression = "GSI2PK = :status";
    ExpressionAttributeValues[":status"] = {
      S: `EV_STATUS#${queryParams.status.toUpperCase()}`,
    };
  } else {
    expression = "GSI1PK = :event";
    ExpressionAttributeValues[":event"] = { S: "EVENT" };
  }

  if (queryParams?.from && queryParams?.to) {
    expression += getFromToExpression(
      ExpressionAttributeValues,
      queryParams.status ? "GSI2SK" : "GSI1SK",
    );
  }

  const dbCmd = new QueryCommand({
    TableName: EVENTS_TABLE_NAME,
    KeyConditionExpression: expression,
    ExpressionAttributeValues,
    IndexName,
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
