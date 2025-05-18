import { IDP_API } from "./apis";

export type GetUserRes = {
  UserAttributes: [
    { Name: "email"; Value: string },
    { Name: "email_verified"; Value: "true" | "false" },
    { Name: "custom:sts_role_arn"; Value: string },
    { Name: "custom:sts_external_id"; Value: string },
    { Name: "custom:aws_account_id"; Value: string },
    { Name: "sub"; Value: string },
  ];
  Username: string;
};

export function parseJwt(headers: Record<string, string | undefined>) {
  const accessToken = headers.authorization?.slice(7);
  // Bearer xxx.xxx.xxx
  if (!accessToken) {
    throw Error("No auth token provided");
  }
  return JSON.parse(
    Buffer.from(accessToken.split(".")[1], "base64").toString(),
  );
}

export const parseUserAttributes = (attrs: GetUserRes["UserAttributes"]) => {
  const attributes: Partial<
    Record<GetUserRes["UserAttributes"][number]["Name"], string>
  > = {};
  attrs.forEach((row) => {
    attributes[row.Name] = row.Value;
  });
  return attributes;
};

export const fetchUserAttributes = async (
  headers: Record<string, string | undefined>,
) => {
  const accessToken = headers.authorization?.slice(7);
  // Bearer xxx.xxx.xxx
  if (!accessToken) {
    throw Error("No auth token provided");
  }

  const res = await IDP_API.json({ AccessToken: accessToken })
    .post()
    .json<GetUserRes>();
  const attr = parseUserAttributes(res.UserAttributes);

  const {
    "custom:sts_role_arn": stsRoleArn,
    "custom:sts_external_id": stsExternalId,
    "custom:aws_account_id": awsAccountId,
    ...restAttributes
  } = attr;

  if (!stsRoleArn) {
    throw Error("No STS role ARN found");
  }

  if (!awsAccountId) {
    throw Error("No AWS Account ID Found");
  }

  if (!stsExternalId) {
    throw Error("No STS External ID found");
  }

  return { stsRoleArn, stsExternalId, awsAccountId, ...restAttributes };
};
