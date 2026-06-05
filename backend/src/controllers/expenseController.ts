import { Response } from 'express';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

// 支出管理一覧取得
export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
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
          ':type': 'expense',
        },
        ScanIndexForward: false,
      })
    );

    res.status(200).json(result.Items ?? []);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 支出管理作成
export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, limitAmount, period } = req.body;

  if (!title || !limitAmount || !period) {
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
      const existingExpenses = await docClient.send(
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
            ':type': 'expense',
            ':status': 'active',
          },
        })
      );

      if ((existingExpenses.Items?.length ?? 0) >= 1) {
        res.status(403).json({ message: '無料プランは支出管理1個までです。プレミアムにアップグレードしてください。' });
        return;
      }
    }

    const declarationId = uuidv4();
    const createdAt = new Date().toISOString();

    // 期間の開始・終了日を計算
    const now = new Date();
    let periodStart: string;
    let periodEnd: string;

    if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      periodStart = monday.toISOString().slice(0, 10);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      periodEnd = sunday.toISOString().slice(0, 10);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    }

    const item = {
      declarationId,
      userId: req.userId,
      type: 'expense',
      title,
      description: description ?? '',
      limitAmount,
      period,
      periodStart,
      periodEnd,
      totalAmount: 0,
      status: 'active',
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

// 支出ログ追加
export const addExpenseLog = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { amount, memo } = req.body;

  if (!amount) {
    res.status(400).json({ message: '金額は必須です' });
    return;
  }

  try {
    const expenseId = uuidv4();
    const today = new Date().toISOString().slice(0, 10);

    await docClient.send(
      new PutCommand({
        TableName: TABLES.EXPENSE_LOGS,
        Item: {
          expenseId,
          declarationId: id,
          date: today,
          amount,
          memo: memo ?? '',
          createdAt: new Date().toISOString(),
        },
      })
    );

    // totalAmountを更新
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'ADD totalAmount :amount',
        ExpressionAttributeValues: { ':amount': amount },
      })
    );

    res.status(201).json({ message: '支出を記録しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 支出ログ一覧取得
export const getExpenseLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.EXPENSE_LOGS,
        IndexName: 'declarationId-date-index',
        KeyConditionExpression: 'declarationId = :declarationId',
        ExpressionAttributeValues: { ':declarationId': id },
        ScanIndexForward: false,
      })
    );

    res.status(200).json(result.Items ?? []);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
// 支出管理削除
export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
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

// 支出管理更新
export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { title, description, limitAmount } = req.body;

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'SET title = :title, description = :description, limitAmount = :limitAmount',
        ExpressionAttributeValues: {
          ':title': title,
          ':description': description ?? '',
          ':limitAmount': limitAmount,
        },
      })
    );

    res.status(200).json({ message: '更新しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};