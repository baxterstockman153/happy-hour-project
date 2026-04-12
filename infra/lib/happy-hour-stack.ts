import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export class HappyHourStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---------------------------------------------------------------
    // VPC — 2 AZs, no NAT gateway (cost-optimised: public subnet only)
    // ---------------------------------------------------------------
    const vpc = new ec2.Vpc(this, 'HappyHourVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // ---------------------------------------------------------------
    // Security Groups
    // ---------------------------------------------------------------
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSg', {
      vpc,
      description: 'Security group for Lambda function',
      allowAllOutbound: true,
    });

    const rdsSg = new ec2.SecurityGroup(this, 'RdsSg', {
      vpc,
      description: 'Security group for RDS instance',
      allowAllOutbound: false,
    });

    // Allow Lambda to reach RDS on port 5432
    rdsSg.addIngressRule(
      lambdaSg,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to Postgres',
    );

    // ---------------------------------------------------------------
    // RDS Postgres 15 — db.t4g.micro (private subnets)
    // PostGIS is enabled via a database migration, not CDK.
    // Run `CREATE EXTENSION postgis;` in your first migration.
    // ---------------------------------------------------------------
    const dbCredentials = rds.Credentials.fromGeneratedSecret('happyhour_admin', {
      secretName: 'happy-hour/db-credentials',
    });

    const dbInstance = new rds.DatabaseInstance(this, 'HappyHourDb', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [rdsSg],
      credentials: dbCredentials,
      databaseName: 'happyhour',
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      deletionProtection: false,
      publiclyAccessible: false,
    });

    const dbSecret = dbInstance.secret!;

    // ---------------------------------------------------------------
    // S3 Bucket — venue images, private, versioned
    // ---------------------------------------------------------------
    const imagesBucket = new s3.Bucket(this, 'VenueImagesBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ---------------------------------------------------------------
    // CloudFront Distribution — serves images from S3 via OAI
    // ---------------------------------------------------------------
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OAI',
      { comment: 'OAI for Happy Hour venue images' },
    );

    imagesBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'ImagesCdn', {
      defaultBehavior: {
        origin: new origins.S3Origin(imagesBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      comment: 'Happy Hour venue images CDN',
    });

    // ---------------------------------------------------------------
    // S3 Bucket — frontend static site
    // ---------------------------------------------------------------
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ---------------------------------------------------------------
    // CloudFront Distribution — serves frontend static site via OAI
    // ---------------------------------------------------------------
    const frontendOai = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI');
    frontendBucket.grantRead(frontendOai);

    // Rewrite extensionless paths to .html so Next.js static export pages are found
    const urlRewriteFn = new cloudfront.Function(this, 'UrlRewriteFn', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var uri = event.request.uri;
  if (uri !== '/' && !uri.includes('.')) {
    event.request.uri = uri.replace(/\\/$/, '') + '.html';
  }
  return event.request;
}
      `.trim()),
    });

    const frontendDistribution = new cloudfront.CloudFrontWebDistribution(this, 'FrontendDistribution', {
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: frontendBucket,
          originAccessIdentity: frontendOai,
        },
        behaviors: [{
          isDefaultBehavior: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [{
            function: urlRewriteFn,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
        }],
      }],
      defaultRootObject: 'index.html',
      errorConfigurations: [
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html',
        },
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // ---------------------------------------------------------------
    // JWT Secret placeholder (stored in Secrets Manager)
    // ---------------------------------------------------------------
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: 'happy-hour/jwt-secret',
      description: 'JWT signing secret for Happy Hour auth',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 64,
      },
    });

    // ---------------------------------------------------------------
    // Lambda Function — Express app via @vendia/serverless-express
    // Runtime: Node.js 22, 512MB, 30s timeout, in public subnet
    // ---------------------------------------------------------------
    const fn = new lambda_nodejs.NodejsFunction(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../src/lambda.ts'),
      handler: 'handler',
      bundling: {
        minify: false,
        sourceMap: true,
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          afterBundling: (inputDir: string, outputDir: string) => [
            `cp -r ${inputDir}/src/db/migrations ${outputDir}/migrations`,
          ],
        },
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [lambdaSg],
      environment: {
        DATABASE_URL: `postgresql://happyhour_admin:RESOLVE_FROM_SECRET@${dbInstance.dbInstanceEndpointAddress}:5432/happyhour?sslmode=require`,
        S3_BUCKET: imagesBucket.bucketName,
        CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
        JWT_SECRET_ARN: jwtSecret.secretArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Grant Lambda read access to secrets
    dbSecret.grantRead(fn);
    jwtSecret.grantRead(fn);

    // Grant Lambda read/write on S3
    imagesBucket.grantReadWrite(fn);

    // ---------------------------------------------------------------
    // API Gateway (REST) — proxy integration to Lambda
    // ---------------------------------------------------------------
    const api = new apigateway.LambdaRestApi(this, 'HappyHourApi', {
      handler: fn,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
        ],
      },
      deployOptions: {
        stageName: 'api',
      },
      description: 'Happy Hour REST API',
    });

    // ---------------------------------------------------------------
    // Stack Outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain for venue images',
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: imagesBucket.bucketName,
      description: 'S3 bucket for venue images',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: dbSecret.secretArn,
      description: 'ARN of the RDS credentials secret',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${frontendDistribution.distributionDomainName}`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
    });
  }
}
