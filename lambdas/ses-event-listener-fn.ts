import { type EventBridgeEvent } from "aws-lambda";
import {
  handleSESEvent,
  SESDeliveryStauts,
  SESEventDetails,
  SESMailObject,
} from "../types/SES-Events";
import { PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { ddbClient, EVENTS_TABLE_NAME } from "../utils/constants";

export const parseTsInUnix = (ts: string) => {
  return Math.round(new Date(ts).getTime() / 1000);
};

export const getUnixTs = () => {
  return Math.round(Date.now() / 1000);
};

type CommonAttributes = {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI3PK?: string;
  GSI3SK?: string;
  status: string;
  emailTo: string[];
  messageId: string;
  createdAt: string;
};

const parseTags = (tags: Record<string, string[]>, mailTs: string) => {
  const unixTs = parseTsInUnix(mailTs).toString();

  const campaignId = tags?.campaignId?.at(0);

  return {
    unixTs,
    campaignId,
  };
};

export const parseCommonAttributes = (
  mail: SESMailObject,
  status: SESDeliveryStauts,
  eventTs?: string,
) => {
  const { campaignId } = parseTags(mail.tags, mail.timestamp);
  const emailTo = mail.destination[0];
  const commonAttributes: CommonAttributes = {
    PK: `USER#${emailTo}`,
    SK: `EVENT_TS#${eventTs ?? mail.timestamp}`,
    GSI1PK: `EVENT`,
    GSI1SK: `EVENT_TS#${eventTs ?? mail.timestamp}`,
    GSI2PK: `EV_STATUS#${status}`,
    GSI2SK: `EVENT_TS#${eventTs ?? mail.timestamp}`,
    createdAt: mail.timestamp,
    emailTo: mail.destination,
    messageId: mail.messageId,
    status,
  };

  if (campaignId) {
    commonAttributes["GSI3PK"] = `TAG#${campaignId}`;
    commonAttributes["GSI3SK"] = `EVENT_TS#${eventTs ?? mail.timestamp}`;
  }

  return commonAttributes;
};

export const handler = async (e: EventBridgeEvent<string, SESEventDetails>) => {
  // get the table name based on ENV

  try {
    await handleSESEvent(e.detail, {
      onAny: async ({ mail }) => {
        // console.log(JSON.stringify(mail.tags));
        // console.log(mail.commonHeaders?.replyTo);
      },
      onRenderingFailure: async ({ mail, failure }) => {
        const putEventCmd = new PutItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Item: marshall(
            {
              reason: failure.errorMessage,
              template_name: failure.templateName,
              ...parseCommonAttributes(mail, "RENDERING_FAILED"),
            },
            { removeUndefinedValues: true },
          ),
        });

        await ddbClient.send(putEventCmd);
      },
      onSend: async ({ mail }) => {
        const putEventCmd = new PutItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Item: marshall(
            {
              subject: mail.commonHeaders.subject,
              replyTo: mail.commonHeaders?.replyTo?.at(0),
              ...parseCommonAttributes(mail, "SENT"),
            },
            { removeUndefinedValues: true },
          ),
        });

        await ddbClient.send(putEventCmd);
      },

      onBounce: async ({ mail, bounce }) => {
        const emailTo = mail.destination[0];
        const addToSupressionListCmd = new PutItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Item: marshall(
            {
              PK: `USER#${emailTo}`,
              SK: `SUPPRESS#${bounce.timestamp}`,
              GSI1PK: `SUPRESS`,
              GSI1SK: `SUPRESS#${bounce.timestamp}`,
              subject: mail.commonHeaders.subject,
              replyTo: mail.commonHeaders?.replyTo?.at(0),
              createdAt: mail.timestamp,
              emailTo: mail.destination,
              messageId: mail.messageId,
              status: "BOUNCED",
              ...bounce,
            },
            { removeUndefinedValues: true },
          ),
        });
        const updateEventCmd = new UpdateItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Key: {
            PK: { S: `USER#${emailTo}` },
            SK: { S: `EVENT_TS#${mail.timestamp}` },
          },
          UpdateExpression:
            "SET #status = :status, #GSI2PK = :GSI2PK, bounceType = :bounceType, reason = :reason, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#status": "status",
            "#GSI2PK": "GSI2PK",
          },
          ExpressionAttributeValues: {
            ":status": { S: "BOUNCED" },
            ":GSI2PK": { S: `EV_STATUS#BOUNCED` },
            ":bounceType": { S: bounce.bounceType },
            ":reason": { S: bounce.bounceSubType },
            ":updatedAt": { S: bounce.timestamp },
          },
        });
        await ddbClient.send(updateEventCmd);
        await ddbClient.send(addToSupressionListCmd);
      },
      onDelivery: async ({ mail, delivery }) => {
        const emailTo = mail.destination[0];
        const updateEventCmd = new UpdateItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Key: {
            PK: { S: `USER#${emailTo}` },
            SK: { S: `EVENT_TS#${mail.timestamp}` },
          },
          UpdateExpression:
            "SET #status = :status, #GSI2PK = :GSI2PK, #GSI2SK = :GSI2SK, updatedAt = :updatedAt",
          ConditionExpression: "attribute_exists(PK)",
          ExpressionAttributeNames: {
            "#status": "status",
            "#GSI2PK": "GSI2PK",
            "#GSI2SK": "GSI2SK",
          },
          ExpressionAttributeValues: {
            ":status": { S: "DELIVERED" },
            ":GSI2PK": { S: "EV_STATUS#DELIVERED" },
            ":GSI2SK": { S: `EVENT_TS#${delivery.timestamp}` },
            ":updatedAt": { S: delivery.timestamp },
          },
        });

        await ddbClient.send(updateEventCmd);
      },

      onDeliveryDelay: async ({ mail, deliveryDelay }) => {
        const emailTo = mail.destination[0];
        const updateEventCmd = new UpdateItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Key: {
            PK: { S: `USER#${emailTo}` },
            SK: { S: `EVENT_TS#${mail.timestamp}` },
          },
          UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
          ConditionExpression: "attribute_exists(PK)",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":status": { S: "DELIVERY_DELAYED" },
            ":updatedAt": { S: deliveryDelay.timestamp },
          },
        });

        await ddbClient.send(updateEventCmd);
      },

      onReject: async ({ mail, reject }) => {
        const emailTo = mail.destination[0];
        const updateEventCmd = new UpdateItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Key: {
            PK: { S: `USER#${emailTo}` },
            SK: { S: `EVENT_TS#${mail.timestamp}` },
          },
          UpdateExpression:
            "SET #status = :status, updatedAt = :updatedAt, reason = :reason",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":status": { S: "REJECTED" },
            ":updatedAt": { S: new Date().toISOString() },
            ":reason": { S: reject.reason },
          },
        });
        await ddbClient.send(updateEventCmd);
      },
      // handle post success mail events e.g. click, open, report

      onClick: async ({ mail, click }) => {
        const putEventCmd = new PutItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Item: marshall(
            {
              ...parseCommonAttributes(mail, "CLICKED", click.timestamp),
              subject: mail.commonHeaders.subject,
              reason: click.link,
              tags: click?.linkTags,
            },
            { removeUndefinedValues: true },
          ),
        });

        await ddbClient.send(putEventCmd);
      },
      onOpen: async ({ mail, open }) => {
        const putEventCmd = new PutItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Item: marshall(
            {
              ...parseCommonAttributes(mail, "OPENED", open.timestamp),
              subject: mail.commonHeaders.subject,
            },
            { removeUndefinedValues: true },
          ),
        });

        await ddbClient.send(putEventCmd);
      },
      onComplaint: async ({ mail, complaint }) => {
        const emailTo = mail.destination[0];
        const addEventCmd = new PutItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Item: marshall(
            {
              ...parseCommonAttributes(mail, "COMPLAINED", complaint.timestamp),
              subject: mail.commonHeaders.subject,
              reason: complaint.complaintFeedbackType,
            },
            { removeUndefinedValues: true },
          ),
        });

        const addSupressionListCmd = new PutItemCommand({
          TableName: EVENTS_TABLE_NAME,
          Item: marshall(
            {
              PK: `USER#${emailTo}`,
              SK: `SUPPRESS_TS#${mail.timestamp}`,
              GSI1PK: `SUPPRESS`,
              GSI2SK: `SUPPRESS_TS#${complaint.timestamp}`,
              subject: mail.commonHeaders.subject,
              reason: complaint.complaintFeedbackType,
              messageId: mail.messageId,
            },
            { removeUndefinedValues: true },
          ),
        });
        await ddbClient.send(addEventCmd);
        await ddbClient.send(addSupressionListCmd);
      },
    });
  } catch (error) {
    console.log(error);
  }
};
