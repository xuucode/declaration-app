import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
  removalPolicy: cdk.RemovalPolicy.DESTROY,
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
  removalPolicy: cdk.RemovalPolicy.DESTROY,
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
  removalPolicy: cdk.RemovalPolicy.DESTROY,
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
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

  new cdk.CfnOutput(this, 'OgpBucketName', { value: ogpBucket.bucketName });

    // 出力
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'UserTableName', { value: userTable.tableName });
    new cdk.CfnOutput(this, 'DeclarationTableName', { value: declarationTable.tableName });
  }
}
