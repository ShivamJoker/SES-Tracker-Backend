import {
  SendEmailCommand,
  SendEmailCommandInput,
  SESv2Client,
} from "@aws-sdk/client-sesv2";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getSourceAccountCreds } from "../utils/sts";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { ddbClient, EVENTS_TABLE_NAME } from "../utils/constants";

export const handler: APIGatewayProxyHandlerV2 = async (e) => {
  try {
    if (!e.body) {
      throw Error("Body is required.");
    }
    const reqBody = JSON.parse(e.body) as SendEmailCommandInput;
    const toEmail = reqBody.Destination?.ToAddresses?.at(0);
    if (!toEmail) {
      throw Error("ToAddresses is required");
    }
    const getUserCmd = new GetItemCommand({
      Key: {
        PK: { S: `USER#${toEmail}` },
        SK: { S: `SUP_USER#${toEmail}` },
      },
      TableName: EVENTS_TABLE_NAME,
      AttributesToGet: ["PK"],
    });
    const getUserRes = await ddbClient.send(getUserCmd);

    // oh shit we found a user, we no send no mails
    if (getUserRes.Item) {
      throw Error(
        "Can't send email to this user.\nThey are in the suppression list.",
      );
    }

    const creds = await getSourceAccountCreds(e.headers);
    const sesClient = new SESv2Client({ credentials: creds });
    const cmd = new SendEmailCommand(reqBody);

    const res = await sesClient.send(cmd);

    return {
      statusCode: res.$metadata.httpStatusCode,
      body: JSON.stringify({ messageId: res.MessageId }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      //@ts-expect-error
      body: JSON.stringify({ error: error.message }),
    };
  }
};
