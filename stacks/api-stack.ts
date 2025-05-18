import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { Construct } from "constructs";
import { createEventsTable } from "../utils/ddb";
import { LlrtBinaryType, LlrtFunction } from "cdk-lambda-llrt";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import {
  ManagedPolicy,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const httpApiGw = new HttpApi(this, "http-api", {
      apiName: "ses-events-api",
      corsPreflight: {
        allowCredentials: true,
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        allowOrigins: [
          "http://localhost:3000",
          "https://main.d3s8n22un9nlgb.amplifyapp.com",
        ],
        allowHeaders: [
          "Access-Control-Allow-Origin",
          "Authorization",
          "Content-Type",
        ],
        maxAge: Duration.minutes(60),
      },
    });

    new CfnOutput(this, "api-gw-domain", {
      value: httpApiGw.apiEndpoint,
    });

    const sesEventsTable = createEventsTable(this, "ses-tracker-events");

    const eventListenerFn = new LlrtFunction(this, "event-listener-fn", {
      entry: "./lambdas/ses-event-listener-fn.ts",
      environment: {},
      architecture: Architecture.ARM_64,
    });

    sesEventsTable.grantWriteData(eventListenerFn);

    const userPool = UserPool.fromUserPoolId(
      this,
      "ses-user-pool",
      "us-east-1_MdznJ7yRX",
    );

    const cognitoAuthorizer = new HttpUserPoolAuthorizer(
      "ses-user-pool-auth",
      userPool,
      {
        userPoolClients: [
          UserPoolClient.fromUserPoolClientId(
            this,
            "user-pool-client",
            "1fka12s32htekbsstt768cbkpp",
          ),
        ],
      },
    );
    const assumeRolePolicyStatement = new PolicyStatement({
      actions: ["sts:AssumeRole"],
      resources: ["*"],
    });

    // Lambda default role with STS permission
    const defaultLambdaRole = new Role(this, "ses-tracker-lambda-role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaVPCAccessExecutionRole",
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    new CfnOutput(this, "lambda-role-arn", {
      value: defaultLambdaRole.roleArn,
    });

    defaultLambdaRole.addToPolicy(assumeRolePolicyStatement);

    // lambda functions
    const eventsAPIFn = new LlrtFunction(this, "get-events-api-fn", {
      entry: "./lambdas/get-events-api-fn.ts",
      architecture: Architecture.ARM_64,
      environment: {},
      role: defaultLambdaRole,
    });

    const supressionListApiFn = new LlrtFunction(
      this,
      "get-supression-list-api-fn",
      {
        entry: "./lambdas/get-supression-list-api-fn.ts",
        architecture: Architecture.ARM_64,
        environment: {},
        role: defaultLambdaRole,
      },
    );

    const stsVerifierFn = new LlrtFunction(this, "verify-sts-api-fn", {
      entry: "./lambdas/verify-sts-api-fn.ts",
      architecture: Architecture.ARM_64,
      environment: {
        MOMENTO_API_KEY: process.env.MOMENTO_API_KEY ?? "",
      },
      role: defaultLambdaRole,
    });

    const sendMailFn = new LlrtFunction(this, "send-mail-api-fn", {
      entry: "./lambdas/send-mail-api-fn.ts",
      // bundling: { externalModules: ["@aws-sdk/client-sesv2"] },
      architecture: Architecture.ARM_64,
      llrtBinaryType: LlrtBinaryType.FULL_SDK,
      role: defaultLambdaRole,
      environment: {
        MOMENTO_API_KEY: process.env.MOMENTO_API_KEY ?? "",
      },
    });

    sesEventsTable.grantReadData(eventsAPIFn);
    sesEventsTable.grantReadData(sendMailFn);
    sesEventsTable.grantReadData(supressionListApiFn);

    const eventsAPiFnIntegration = new HttpLambdaIntegration(
      "events-api-fn-integ",
      eventsAPIFn,
    );

    // API endpoints
    httpApiGw.addRoutes({
      path: "/events",
      methods: [HttpMethod.GET],
      integration: eventsAPiFnIntegration,
      authorizer: cognitoAuthorizer,
    });

    httpApiGw.addRoutes({
      path: "/suppression-list",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "get-supression-list-api-integ",
        supressionListApiFn,
      ),
      authorizer: cognitoAuthorizer,
    });

    httpApiGw.addRoutes({
      path: "/verify-sts",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "sts-verifier-integ",
        stsVerifierFn,
      ),
      authorizer: cognitoAuthorizer,
    });

    httpApiGw.addRoutes({
      path: "/mail",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration("send-mail-api-integ", sendMailFn),
      authorizer: cognitoAuthorizer,
    });

    // event bridge

    const eventListenerFnTarget = new LambdaFunction(eventListenerFn);

    const sesEventBus = EventBus.fromEventBusArn(
      this,
      "ses-event-bus",
      "arn:aws:events:us-east-1:205979422636:event-bus/ses-tracker-events",
    );

    const sesEventRule = new Rule(this, "ses-event-rule", {
      targets: [eventListenerFnTarget],
      eventBus: sesEventBus,
      eventPattern: {
        source: ["aws.ses"],
      },
    });
  }
}
