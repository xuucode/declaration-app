import { Response } from 'express';
import { GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';
import { hasPremiumAccess } from '../utils/subscription.js';

// 自分のユーザー情報取得
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );

    const user = result.Item;
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    const premiumAccessUntil = typeof user.premiumAccessUntil === 'string'
      ? new Date(user.premiumAccessUntil)
      : null;
    const accessExpired = user.subscriptionCancelAtPeriodEnd
      && premiumAccessUntil
      && !Number.isNaN(premiumAccessUntil.getTime())
      && premiumAccessUntil <= new Date();

    if (accessExpired) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.USERS,
          Key: { userId: req.userId },
          UpdateExpression: 'SET subscriptionStatus = :status, subscriptionCancelAtPeriodEnd = :cancelAtPeriodEnd',
          ExpressionAttributeValues: {
            ':status': 'free',
            ':cancelAtPeriodEnd': false,
          },
        })
      );

      res.status(200).json({
        ...user,
        subscriptionStatus: 'free',
        subscriptionCancelAtPeriodEnd: false,
      });
      return;
    }

    res.status(200).json({
      ...user,
      subscriptionStatus: hasPremiumAccess(user) ? 'active' : user.subscriptionStatus,
    });
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

export const getCalendarSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const month = typeof req.query.month === 'string'
    ? req.query.month
    : new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: 'monthはYYYY-MM形式で指定してください' });
    return;
  }

  const monthStart = `${month}-01`;
  const monthEnd = new Date(`${monthStart}T00:00:00.000Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCDate(monthEnd.getUTCDate() - 1);
  const monthEndKey = monthEnd.toISOString().slice(0, 10);

  try {
    const declarationsResult = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DECLARATIONS,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': req.userId,
        },
      })
    );

    const declarations = declarationsResult.Items ?? [];
    const days: Record<string, { achieved: number; total: number; expenseAmount: number }> = {};
    const ensureDay = (date: string) => {
      if (!days[date]) {
        days[date] = { achieved: 0, total: 0, expenseAmount: 0 };
      }
      return days[date];
    };

    declarations
      .filter((item) => (item.type ?? 'task') === 'task' && ['done', 'failed'].includes(item.status))
      .forEach((item) => {
        const date = String(item.reportedAt || item.createdAt || '').slice(0, 10);
        if (date < monthStart || date > monthEndKey) return;
        const day = ensureDay(date);
        day.total += 1;
        if (item.status === 'done') {
          day.achieved += 1;
        }
      });

    const habits = declarations.filter((item) => item.type === 'habit');
    for (const habit of habits) {
      const logsResult = await docClient.send(
        new QueryCommand({
          TableName: TABLES.DAILY_LOGS,
          KeyConditionExpression: 'habitId = :habitId AND #date BETWEEN :start AND :end',
          ExpressionAttributeNames: { '#date': 'date' },
          ExpressionAttributeValues: {
            ':habitId': habit.declarationId,
            ':start': monthStart,
            ':end': monthEndKey,
          },
        })
      );

      for (const log of logsResult.Items ?? []) {
        const date = String(log.date);
        const day = ensureDay(date);
        day.total += 1;
        if (log.result === 'achieved') {
          day.achieved += 1;
        }
      }
    }

    const expenses = declarations.filter((item) => item.type === 'expense');
    for (const expense of expenses) {
      const logsResult = await docClient.send(
        new QueryCommand({
          TableName: TABLES.EXPENSE_LOGS,
          IndexName: 'declarationId-date-index',
          KeyConditionExpression: 'declarationId = :declarationId AND #date BETWEEN :start AND :end',
          ExpressionAttributeNames: { '#date': 'date' },
          ExpressionAttributeValues: {
            ':declarationId': expense.declarationId,
            ':start': monthStart,
            ':end': monthEndKey,
          },
        })
      );

      for (const log of logsResult.Items ?? []) {
        const date = String(log.date);
        const amount = Number(log.amount);
        ensureDay(date).expenseAmount += Number.isFinite(amount) ? amount : 0;
      }
    }

    const dayCount = Number(monthEndKey.slice(8, 10));
    const calendarDays = Array.from({ length: dayCount }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`;
      const day = days[date] ?? { achieved: 0, total: 0, expenseAmount: 0 };
      return {
        date,
        achievementRate: day.total > 0 ? Math.round((day.achieved / day.total) * 100) : null,
        achieved: day.achieved,
        total: day.total,
        expenseAmount: day.expenseAmount,
      };
    });

    res.status(200).json({ month, days: calendarDays });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
