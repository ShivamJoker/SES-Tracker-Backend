import { Stack, StackProps } from "aws-cdk-lib";
import {
  BooleanAttribute,
  FeaturePlan,
  NumberAttribute,
  OAuthScope,
  StringAttribute,
  UserPool,
  VerificationEmailStyle,
} from "aws-cdk-lib/aws-cognito";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { LlrtFunction } from "cdk-lambda-llrt";
import { Construct } from "constructs";

export class CognitoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const cognitoAuthGenFn = new LlrtFunction(this, "cognito-auth-gen-fn", {
      entry: "./lambdas/cognito-auth-gen-fn.ts",
      environment: {},
      architecture: Architecture.ARM_64,
    });

    const userpool = new UserPool(this, "ses-tracker-user-pool", {
      userPoolName: "ses-tracker-user-pool",
      signInCaseSensitive: false,
      selfSignUpEnabled: true,
      featurePlan: FeaturePlan.ESSENTIALS,
      signInPolicy: {
        allowedFirstAuthFactors: {
          password: true,
          emailOtp: true,
          passkey: true,
        },
      },
      autoVerify: { email: true },
      // signInAliases: { email: true },
      customAttributes: {
        aws_account_id: new NumberAttribute({
          mutable: true,
        }),
        sts_role_arn: new StringAttribute({ mutable: true }),
        sts_external_id: new StringAttribute({ mutable: true }),
        sts_verified: new BooleanAttribute({ mutable: true }),
      },
      userVerification: {
        emailSubject: "Verify your email for SES tracker!",
        emailBody:
          "Thanks for signing up to SES tracker.\n Your verification code is {####}",
        emailStyle: VerificationEmailStyle.CODE,
      },
      lambdaTriggers: {
        // preTokenGeneration: cognitoAuthGenFn,
      },
    });

    const client = userpool.addClient("app-client", {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        callbackUrls: ["http://localhost"],
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
      },
    });
  }
}
