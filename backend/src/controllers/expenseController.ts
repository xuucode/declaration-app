import { Response } from 'express';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { hasPremiumAccess } from '../utils/subscription.js';
import { FREE_LIMITS, isItemLockedForFreePlan, markLockedItems } from '../utils/premiumLimits.js';

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

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const isPremium = hasPremiumAccess(userResult.Item);
    const items = markLockedItems(
      result.Items ?? [],
      FREE_LIMITS.activeExpenses,
      (item) => item.status === 'active',
      isPremium
    );

    res.status(200).json(items);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 支出管理作成
export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, limitAmount, period, customEndDate, currency = 'JPY' } = req.body;

  if (!title || !limitAmount || !period) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  if (!['JPY', 'USD'].includes(currency)) {
    res.status(400).json({ message: 'currencyはJPYまたはUSDである必要があります' });
    return;
  }

  if (!['monthly', 'weekly', 'custom'].includes(period)) {
    res.status(400).json({ message: 'periodはmonthly、weekly、customのいずれかである必要があります' });
    return;
  }

  const numericLimitAmount = Number(limitAmount);
  if (!Number.isFinite(numericLimitAmount) || numericLimitAmount <= 0) {
    res.status(400).json({ message: '上限金額は0より大きい数値で入力してください' });
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

    const isPremium = hasPremiumAccess(userResult.Item);

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
    } else if (period === 'monthly') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else {
      const today = now.toISOString().slice(0, 10);
      const endDate = new Date(`${customEndDate}T00:00:00.000Z`);

      if (!customEndDate || Number.isNaN(endDate.getTime()) || customEndDate < today) {
        res.status(400).json({ message: 'カスタム期間では今日以降の終了日を指定してください' });
        return;
      }

      periodStart = today;
      periodEnd = customEndDate;
    }

    const item = {
      declarationId,
      userId: req.userId,
      type: 'expense',
      title,
      description: description ?? '',
      limitAmount: numericLimitAmount,
      currency,
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
  const { amount, memo, currency } = req.body;

  if (!amount) {
    res.status(400).json({ message: '金額は必須です' });
    return;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    res.status(400).json({ message: '金額は0より大きい数値で入力してください' });
    return;
  }

  try {
    const expenseResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );
    const expense = expenseResult.Item;
    if (!expense || expense.userId !== req.userId || expense.type !== 'expense') {
      res.status(404).json({ message: '支出管理が見つかりません' });
      return;
    }

    const expenseCurrency = expense.currency ?? 'JPY';
    if (currency && currency !== expenseCurrency) {
      res.status(400).json({ message: 'この支出管理で設定した通貨以外の金額は記録できません' });
      return;
    }

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const expensesResult = await docClient.send(
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
    const isLocked = isItemLockedForFreePlan(
      expensesResult.Items ?? [],
      id,
      FREE_LIMITS.activeExpenses,
      (item) => item.status === 'active',
      hasPremiumAccess(userResult.Item)
    );
    if (isLocked) {
      res.status(403).json({ message: 'この支出管理はPremiumで再開できます。' });
      return;
    }

    const expenseId = uuidv4();
    const today = new Date().toISOString().slice(0, 10);

    await docClient.send(
      new PutCommand({
        TableName: TABLES.EXPENSE_LOGS,
        Item: {
          expenseId,
          declarationId: id,
          date: today,
          amount: numericAmount,
          currency: expenseCurrency,
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
        ExpressionAttributeValues: { ':amount': numericAmount },
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
    const expenseResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );
    const expense = expenseResult.Item;
    if (!expense || expense.userId !== req.userId || expense.type !== 'expense') {
      res.status(404).json({ message: '支出管理が見つかりません' });
      return;
    }

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
    const expenseResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );
    const expense = expenseResult.Item;
    if (!expense || expense.userId !== req.userId || expense.type !== 'expense') {
      res.status(404).json({ message: '支出管理が見つかりません' });
      return;
    }

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const expensesResult = await docClient.send(
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
    const isLocked = isItemLockedForFreePlan(
      expensesResult.Items ?? [],
      id,
      FREE_LIMITS.activeExpenses,
      (item) => item.status === 'active',
      hasPremiumAccess(userResult.Item)
    );
    if (isLocked) {
      res.status(403).json({ message: 'この支出管理はPremiumで再開できます。' });
      return;
    }

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
  const numericLimitAmount = Number(limitAmount);

  if (!title || !Number.isFinite(numericLimitAmount) || numericLimitAmount <= 0) {
    res.status(400).json({ message: '必須項目が不足しているか、上限金額が不正です' });
    return;
  }

  try {
    const expenseResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );
    const expense = expenseResult.Item;
    if (!expense || expense.userId !== req.userId || expense.type !== 'expense') {
      res.status(404).json({ message: '支出管理が見つかりません' });
      return;
    }

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const expensesResult = await docClient.send(
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
    const isLocked = isItemLockedForFreePlan(
      expensesResult.Items ?? [],
      id,
      FREE_LIMITS.activeExpenses,
      (item) => item.status === 'active',
      hasPremiumAccess(userResult.Item)
    );
    if (isLocked) {
      res.status(403).json({ message: 'この支出管理はPremiumで再開できます。' });
      return;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'SET title = :title, description = :description, limitAmount = :limitAmount',
        ExpressionAttributeValues: {
          ':title': title,
          ':description': description ?? '',
          ':limitAmount': numericLimitAmount,
        },
      })
    );

    res.status(200).json({ message: '更新しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
