import { Response } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';

// 自分のユーザー情報取得
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );

    if (!result.Item) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    res.status(200).json(result.Item);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// ユーザー情報更新
export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const { displayName, goal } = req.body;

  if (!displayName && goal === undefined) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    const updateExpressions: string[] = [];
    const expressionValues: Record<string, string> = {};

    if (displayName) {
      updateExpressions.push('displayName = :displayName');
      expressionValues[':displayName'] = displayName;
    }

    if (goal !== undefined) {
      updateExpressions.push('goal = :goal');
      expressionValues[':goal'] = goal;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionValues,
      })
    );

    res.status(200).json({ message: '更新しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};