import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { DomainName, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGatewayv2DomainProperties } from "aws-cdk-lib/aws-route53-targets";
import { LlrtFunction } from "cdk-lambda-llrt";
import { Construct } from "constructs";
import { createEventsTable } from "../utils/ddb";
import { CognitoStack } from "./cognito-stack";
import { ApiStack } from "./api-stack";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SesTrackerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CognitoStack(scope, "ses-cognito-stack", {});

    new ApiStack(scope, "ses-api-stack");

    // if (!process.env.API_KEY || !process.env.PHP_API_TOKEN) {
    //   throw Error("Env variable not found in env");
    // }
    /* const cert = Certificate.fromCertificateArn(
      this,
      "appybee-wildcard-cert",
      "arn:aws:acm:eu-central-1:984173950096:certificate/52e4dfbf-3a43-4c72-90fd-4abdfd1b7e10",
    );

    const appybeeDomain = new DomainName(this, "appybeeDomain", {
      domainName: "ses.appybee.nl",
      certificate: cert,
    });

    new CfnOutput(this, "ses-api-domain", {
      value: appybeeDomain.regionalDomainName,
    });

    const httpApiGw = new HttpApi(this, "http-api", {
      apiName: "ses-events-api",
      defaultDomainMapping: {
        domainName: appybeeDomain,
      },
    });

    const devApiStage = httpApiGw.addStage("dev-stage-apigw", {
      stageName: "dev",
      autoDeploy: true,
      domainMapping: {
        domainName: appybeeDomain,
        mappingKey: "dev",
      },
    });

    const stagingApiStage = httpApiGw.addStage("staging-stage-apigw", {
      stageName: "stage",
      autoDeploy: true,
      domainMapping: {
        domainName: appybeeDomain,
        mappingKey: "stage",
      },
    });

    new CfnOutput(this, "dev", { value: devApiStage.url }); */

    /*     new ARecord(this, "ses-dn-record", {
      zone: hostedZone,
      recordName: "ses",
      comment: "SES API GW",
      target: RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(
          appybeeDomain.regionalDomainName,
          appybeeDomain.regionalHostedZoneId,
        ),
      ),
    }); */

    /* const sesEventsTable = createEventsTable(this, "ses-events");
    const sesEventsTableDev = createEventsTable(this, "ses-events-dev");
    const sesEventsTableStage = createEventsTable(this, "ses-events-stage");

    const eventListenerFn = new LlrtFunction(this, "event-listener-fn", {
      entry: "./lambdas/ses-event-listener-fn.ts",
      environment: {
        PHP_API_TOKEN: process.env.PHP_API_TOKEN,
      },
      architecture: Architecture.ARM_64,
    });

    sesEventsTable.grantWriteData(eventListenerFn);
    sesEventsTableDev.grantWriteData(eventListenerFn);
    sesEventsTableStage.grantWriteData(eventListenerFn);

    const eventsAPIFn = new LlrtFunction(this, "events-api-fn", {
      entry: "./lambdas/events-api-fn.ts",
      architecture: Architecture.ARM_64,
      environment: {
        API_KEY: process.env.API_KEY,
      },
    });

    sesEventsTable.grantReadData(eventsAPIFn);
    sesEventsTableDev.grantReadData(eventsAPIFn);
    sesEventsTableStage.grantReadData(eventsAPIFn);

    const eventsAPiFnIntegration = new HttpLambdaIntegration(
      "events-api-fn-integ",
      eventsAPIFn,
    );

    httpApiGw.addRoutes({
      path: "/events",
      methods: [HttpMethod.GET],
      integration: eventsAPiFnIntegration,
    });

    httpApiGw.addRoutes({
      path: "/events/{orgid}",
      methods: [HttpMethod.GET],
      integration: eventsAPiFnIntegration,
    });

    httpApiGw.addRoutes({
      path: "/events/{orgid}/{clientid}",
      methods: [HttpMethod.GET],
      integration: eventsAPiFnIntegration,
    });

    const eventListenerFnTarget = new LambdaFunction(eventListenerFn);

    const sesEventRule = new Rule(this, "ses-event-rule", {
      targets: [eventListenerFnTarget],
      eventPattern: {
        source: ["aws.ses"],
      },
    }); */
  }
}
