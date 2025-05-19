# SES Tracker Backend

The frontend project for SESami is at [SES-Tracker-UI](https://github.com/ShivamJoker/SES-Tracker-UI).

## Backend Tech Stack
- Momento Cache
- Amazon EventBridge
- AWS IAM
- Amazon SES
- AWS STS
- Amazon DynamoDB
- AWS Lambda
- AWS LLRT
- AWS CDK
- Amazon API Gateway
- Amazon CloudWatch
- Amazon Cognito

## Backend APIs List

We are using API Gateway to route requests to AWS Lambda.

We have the following endpoints:

| Path                | Method | Description                                                 |
| ------------------- | ------ | ----------------------------------------------------------- |
| `/events`           | GET    | Gets all the events while filtering date and status         |
| `/suppression-list` | GET    | Gets all the email addresses in the custom suppression list |
| `/verify-sts`       | GET    | Verifies the assumed role                                   |
| `/mail`             | POST   | Sends emails                                                |

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
