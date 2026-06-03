import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export const cognitoClient = new CognitoIdentityProviderClient({
  region: 'ap-northeast-1',
});

export const COGNITO_CONFIG = {
  USER_POOL_ID: 'ap-northeast-1_k9yyQfpSi',
  CLIENT_ID: '16sdcij90mnpn1rfeubi47f0cj',
};