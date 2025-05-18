import Wretch from "wretch";

export const IDP_API = Wretch(
  "https://cognito-idp.us-east-1.amazonaws.com",
).headers({
  "X-Amz-Target": "AWSCognitoIdentityProviderService.GetUser",
  "Content-Type": "application/x-amz-json-1.1",
});
