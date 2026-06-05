import { Response } from 'express';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';


// 習慣一覧取得
export const getHabits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DECLARATIONS,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: '#type = :type',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: {
          ':userId': req.userId,
          ':type': 'habit',
        },
        ScanIndexForward: false,
      })
    );

    res.status(200).json(result.Items ?? []);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 習慣作成
export const createHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, limitType, limitValue } = req.body;

  if (!title || !limitType) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    // 無料プランの制約チェック
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );

    const isPremium = userResult.Item?.subscriptionStatus === 'active';

    if (!isPremium) {
      const existingHabits = await docClient.send(
        new QueryCommand({
          TableName: TABLES.DECLARATIONS,
          IndexName: 'userId-createdAt-index',
          KeyConditionExpression: 'userId = :userId',
          FilterExpression: '#type = :type AND #status = :status',
          ExpressionAttributeNames: {
            '#type': 'type',
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':userId': req.userId,
            ':type': 'habit',
            ':status': 'active',
          },
        })
      );

      if ((existingHabits.Items?.length ?? 0) >= 1) {
        res.status(403).json({ message: '無料プランは習慣宣言1個までです。プレミアムにアップグレードしてください。' });
        return;
      }
    }

    const declarationId = uuidv4();
    const createdAt = new Date().toISOString();

    const item = {
      declarationId,
      userId: req.userId,
      type: 'habit',
      title,
      description: description ?? '',
      limitType,
      limitValue: limitValue ?? null,
      status: 'active',
      streakCount: 0,
      createdAt,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.DECLARATIONS,
        Item: item,
      })
    );

    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 今日の習慣ログ記録
export const logHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { result, value } = req.body;

  if (!result || !['achieved', 'failed'].includes(result)) {
    res.status(400).json({ message: 'resultはachievedまたはfailedである必要があります' });
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const logId = uuidv4();

    await docClient.send(
      new PutCommand({
        TableName: TABLES.DAILY_LOGS,
        Item: {
          habitId: id,
          date: today,
          logId,
          userId: req.userId,
          result,
          value: value ?? null,
          createdAt: new Date().toISOString(),
        },
      })
    );

    // streakCountの更新
    if (result === 'achieved') {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.DECLARATIONS,
          Key: { declarationId: id },
          UpdateExpression: 'ADD streakCount :inc',
          ExpressionAttributeValues: { ':inc': 1 },
        })
      );
    } else {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.DECLARATIONS,
          Key: { declarationId: id },
          UpdateExpression: 'SET streakCount = :zero',
          ExpressionAttributeValues: { ':zero': 0 },
        })
      );
    }

    res.status(201).json({ message: '記録しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 習慣ログ一覧取得
export const getHabitLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DAILY_LOGS,
        KeyConditionExpression: 'habitId = :habitId',
        ExpressionAttributeValues: { ':habitId': id },
        ScanIndexForward: false,
        Limit: 30,
      })
    );

    res.status(200).json(result.Items ?? []);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 習慣削除
export const deleteHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );

    res.status(200).json({ message: '削除しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 習慣更新
export const updateHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { title, description, limitValue } = req.body;

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'SET title = :title, description = :description, limitValue = :limitValue',
        ExpressionAttributeValues: {
          ':title': title,
          ':description': description ?? '',
          ':limitValue': limitValue ?? null,
        },
      })
    );

    res.status(200).json({ message: '更新しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};