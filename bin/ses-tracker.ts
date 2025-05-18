#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SesTrackerStack } from "../stacks/ses-tracker-stack";
import { CognitoStack } from "../stacks/cognito-stack";

const app = new cdk.App();
new SesTrackerStack(app, "SesTrackerStack", {});

