#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { HappyHourStack } from '../lib/happy-hour-stack';

const app = new cdk.App();

new HappyHourStack(app, 'HappyHourStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Happy Hour backend infrastructure — Lambda, RDS, S3, CloudFront, API Gateway',
});

app.synth();
