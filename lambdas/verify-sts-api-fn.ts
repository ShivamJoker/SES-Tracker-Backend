import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getSourceAccountCreds } from "../utils/sts";

export const handler: APIGatewayProxyHandlerV2 = async (e) => {
  try {
    await getSourceAccountCreds(e.headers);

    return { statusCode: 200 };
  } catch (error) {
    // @ts-ignore
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
