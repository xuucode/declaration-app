import { Request, Response } from 'express';
import {
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ChangePasswordCommand,
  UpdateUserAttributesCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { cognitoClient, COGNITO_CONFIG } from '../config/cognito.js';
import { docClient, TABLES } from '../config/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

// ユーザー登録
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    // Cognitoにユーザーを作成
    const signUpResult = await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }],
      })
    );

    const userId = signUpResult.UserSub!;

    // DynamoDBにユーザー情報を保存
    await docClient.send(
      new PutCommand({
        TableName: TABLES.USERS,
        Item: {
          userId,
          email,
          displayName,
          streakCount: 0,
          shareStreakCount: 0,
          createdAt: new Date().toISOString(),
        },
      })
    );

    res.status(201).json({ message: '登録確認メールを送信しました' });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// メール確認コード検証
export const confirmEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: COGNITO_CONFIG.CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      })
    );

    res.status(200).json({ message: 'メール確認が完了しました' });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    const result = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CONFIG.CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    const tokens = result.AuthenticationResult;

    res.status(200).json({
      accessToken: tokens?.AccessToken,
      idToken: tokens?.IdToken,
      refreshToken: tokens?.RefreshToken,
    });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// パスワード変更
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!currentPassword || !newPassword || !token) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    await cognitoClient.send(
      new ChangePasswordCommand({
        AccessToken: token,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      })
    );

    res.status(200).json({ message: 'パスワードを更新しました' });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// メールアドレス変更
export const changeEmail = async (req: Request, res: Response): Promise<void> => {
  const { newEmail, currentPassword } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!newEmail || !currentPassword || !token) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    await cognitoClient.send(
      new UpdateUserAttributesCommand({
        AccessToken: token,
        UserAttributes: [{ Name: 'email', Value: newEmail }],
      })
    );

    res.status(200).json({ message: '確認メールを送信しました' });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// パスワードリセット要求
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: 'メールアドレスが必要です' });
    return;
  }

  try {
    await cognitoClient.send(
      new ForgotPasswordCommand({
        ClientId: COGNITO_CONFIG.CLIENT_ID,
        Username: email,
      })
    );

    res.status(200).json({ message: 'リセットコードを送信しました' });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// パスワードリセット確定
export const confirmForgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    await cognitoClient.send(
      new ConfirmForgotPasswordCommand({
        ClientId: COGNITO_CONFIG.CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      })
    );

    res.status(200).json({ message: 'パスワードをリセットしました' });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
