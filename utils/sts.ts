import {
  SESv2Client,
  ListEmailIdentitiesCommand,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { MOMENTO_API } from "./momento";
import { fetchUserAttributes, parseJwt } from "./cognito";
import { AWSCreds } from "../types/Auth";

export async function assumeRole(
  roleArn: string,
  sessionName: string,
  credentials?: any,
  externalId?: string,
) {
  const stsClient = new STSClient({ region: "us-east-1", credentials });
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    ExternalId: externalId,
  });

  try {
    const response = await stsClient.send(command);
    if (!response.Credentials) {
      throw Error("No creds found");
    }
    const creds = {
      accessKeyId: response.Credentials.AccessKeyId as string,
      secretAccessKey: response.Credentials.SecretAccessKey as string,
      sessionToken: response.Credentials.SessionToken as string,
    };
    if (!creds.accessKeyId) {
      throw Error("No access keys found");
    }
    return creds;
  } catch (error) {
    console.error("Error assuming role:", error);
    throw error;
  }
}

export const getSourceAccountCreds = (
  headers: Record<string, string | undefined>,
): Promise<AWSCreds> =>
  new Promise(async (resolve, reject) => {
    try {
      const token = parseJwt(headers);
      MOMENTO_API.url(`/cache/sts-tokens?key=${token.sub}`)
        .get()
        .notFound(async () => {
          try {
            // if access keys are not in the cach, generate them and save
            const { stsRoleArn, stsExternalId, sub } =
              await fetchUserAttributes(headers);
            const rbacRoleKeys = await assumeRole(
              "arn:aws:iam::205979422636:role/AWSMailSES",
              "rbac",
            );

            const externalAccKeys = await assumeRole(
              stsRoleArn,
              "ses-access",
              rbacRoleKeys,
              stsExternalId,
            );

            await MOMENTO_API.url(
              `/cache/sts-tokens?key=${sub}&ttl_seconds=3600`,
            )
              .put(JSON.stringify(externalAccKeys))
              .res();

            resolve(externalAccKeys);
          } catch (error) {
            reject(error);
          }
        })
        .json<AWSCreds>()
        .then((creds) => resolve(creds));
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });

const sendMail = async () => {
  const sesClient = new SESv2Client({});
  const res = await sesClient.send(
    new SendEmailCommand({
      Destination: {
        ToAddresses: ["success@simulator.amazonses.com"],
      },
      ConfigurationSetName: "default",
      FromEmailAddress: "dritika2@gmail.com",

      Content: {
        Simple: {
          Subject: {
            Data: "Should come in delivered 1",
          },
          Body: {
            Text: {
              Data: `Hello I am home ${new Date().toISOString()}`,
            },
          },
        },
      },
    }),
  );

  console.log(res);
};
// const rbacStsClient = new STSClient({ credentials: externalAccKeys });
// const callerIdentity = await rbacStsClient.send(new GetCallerIdentityCommand());
//
// console.log(callerIdentity);
