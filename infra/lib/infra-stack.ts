import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';

const productionFrontendUrls = [
  'https://declaration-app-theta.vercel.app',
  'https://declaration-32c0wbkfr-xuucodes-projects.vercel.app',
].join(',');

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const frontendUrl = new cdk.CfnParameter(this, 'FrontendUrl', {
      type: 'String',
      default: productionFrontendUrls,
      description: 'Comma-separated frontend URLs allowed by CORS. The first URL is used for Stripe redirects.',
    });

    const publicApiUrl = new cdk.CfnParameter(this, 'PublicApiUrl', {
      type: 'String',
      default: '',
      description: 'Public API Gateway URL. Set this after the first deploy, including the /prod stage path.',
    });

    const stripeSecretKey = new cdk.CfnParameter(this, 'StripeSecretKey', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'Stripe secret key.',
    });

    const stripePriceId = new cdk.CfnParameter(this, 'StripePriceId', {
      type: 'String',
      default: '',
      description: 'Stripe Premium price ID.',
    });

    const stripeWebhookSecret = new cdk.CfnParameter(this, 'StripeWebhookSecret', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'Stripe webhook signing secret.',
    });

    // Cognitoユーザープール
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'declaration-app-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // CognitoアプリクライアントS
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Userテーブル
    const userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: 'declaration-app-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // emailのGSI
    userTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    // Declarationテーブル
    const declarationTable = new dynamodb.Table(this, 'DeclarationTable', {
      tableName: 'declaration-app-declarations',
      partitionKey: { name: 'declarationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // userIdのGSI（ソートキーはcreatedAt）
    declarationTable.addGlobalSecondaryIndex({
      indexName: 'userId-createdAt-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // DailyLogテーブル（習慣モード用）
const dailyLogTable = new dynamodb.Table(this, 'DailyLogTable', {
  tableName: 'declaration-app-daily-logs',
  partitionKey: { name: 'habitId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  deletionProtection: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// userIdのGSI
dailyLogTable.addGlobalSecondaryIndex({
  indexName: 'userId-date-index',
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
});

// ExpenseLogテーブル（支出モード用）
const expenseLogTable = new dynamodb.Table(this, 'ExpenseLogTable', {
  tableName: 'declaration-app-expense-logs',
  partitionKey: { name: 'expenseId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  deletionProtection: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// declarationIdのGSI
expenseLogTable.addGlobalSecondaryIndex({
  indexName: 'declarationId-date-index',
  partitionKey: { name: 'declarationId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
});

// Contactテーブル（お問い合わせ保存用）
const contactTable = new dynamodb.Table(this, 'ContactTable', {
  tableName: 'declaration-app-contacts',
  partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  deletionProtection: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

contactTable.addGlobalSecondaryIndex({
  indexName: 'createdAt-index',
  partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
});

new cdk.CfnOutput(this, 'DailyLogTableName', { value: dailyLogTable.tableName });
new cdk.CfnOutput(this, 'ExpenseLogTableName', { value: expenseLogTable.tableName });
new cdk.CfnOutput(this, 'ContactTableName', { value: contactTable.tableName });

    // OGP画像用S3バケット
const ogpBucket = new s3.Bucket(this, 'OgpBucket', {
  bucketName: 'declaration-app-ogp-images',
  publicReadAccess: true,
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }),
  cors: [
    {
      allowedMethods: [s3.HttpMethods.GET],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
    },
  ],
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  autoDeleteObjects: false,
});

  new cdk.CfnOutput(this, 'OgpBucketName', { value: ogpBucket.bucketName });

    const backendPath = path.join(__dirname, '../../backend');
    const apiHandler = new lambda.Function(this, 'BackendApiHandler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'dist/lambda.handler',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(backendPath, {
        bundling: {
          image: lambda.Runtime.NODEJS_22_X.bundlingImage,
          command: [
            'bash',
            '-c',
            [
              'export npm_config_cache=/tmp/.npm',
              'cp package.json package-lock.json tsconfig.json /asset-output/',
              'cp -R src /asset-output/src',
              'cp -R fonts /asset-output/fonts',
              'cd /asset-output',
              'npm ci --include=optional',
              'npm install --save=false --os=linux --cpu=arm64 sharp',
              'npm run build',
              'npm prune --omit=dev',
              'rm -rf src tsconfig.json',
            ].join(' && '),
          ],
        },
      }),
      environment: {
        NODE_ENV: 'production',
        TRUST_PROXY: 'true',
        FRONTEND_URL: frontendUrl.valueAsString,
        PUBLIC_API_URL: publicApiUrl.valueAsString,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        OGP_BUCKET_NAME: ogpBucket.bucketName,
        STRIPE_SECRET_KEY: stripeSecretKey.valueAsString,
        STRIPE_PRICE_ID: stripePriceId.valueAsString,
        STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.valueAsString,
      },
    });

    userTable.grantReadWriteData(apiHandler);
    declarationTable.grantReadWriteData(apiHandler);
    dailyLogTable.grantReadWriteData(apiHandler);
    expenseLogTable.grantReadWriteData(apiHandler);
    contactTable.grantReadWriteData(apiHandler);
    ogpBucket.grantPut(apiHandler);

    apiHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:SignUp',
        'cognito-idp:ConfirmSignUp',
        'cognito-idp:InitiateAuth',
        'cognito-idp:ChangePassword',
        'cognito-idp:UpdateUserAttributes',
        'cognito-idp:ForgotPassword',
        'cognito-idp:ConfirmForgotPassword',
      ],
      resources: ['*'],
    }));

    const api = new apigateway.LambdaRestApi(this, 'BackendApi', {
      handler: apiHandler,
      proxy: true,
      deployOptions: {
        stageName: 'prod',
      },
    });

    new cdk.CfnOutput(this, 'BackendApiUrl', { value: api.url });

    // 出力
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'UserTableName', { value: userTable.tableName });
    new cdk.CfnOutput(this, 'DeclarationTableName', { value: declarationTable.tableName });
  }
}
