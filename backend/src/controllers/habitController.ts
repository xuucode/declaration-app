import { Response } from 'express';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { hasPremiumAccess } from '../utils/subscription.js';
import { FREE_LIMITS, isItemLockedForFreePlan, markLockedItems } from '../utils/premiumLimits.js';

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const getStartOfUtcDay = (date: Date): Date => {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

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

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const isPremium = hasPremiumAccess(userResult.Item);
    const items = markLockedItems(
      result.Items ?? [],
      FREE_LIMITS.activeHabits,
      (item) => item.status === 'active',
      isPremium
    );

    const itemsWithCounts = await Promise.all(
      items.map(async (item) => {
        const logsResult = await docClient.send(
          new QueryCommand({
            TableName: TABLES.DAILY_LOGS,
            KeyConditionExpression: 'habitId = :habitId',
            ExpressionAttributeValues: { ':habitId': item.declarationId },
          })
        );
        const logs = logsResult.Items ?? [];

        return {
          ...item,
          achievedCount: logs.filter((log) => log.result === 'achieved').length,
          totalCount: logs.length,
        };
      })
    );

    res.status(200).json(itemsWithCounts);
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

  if (!['binary', 'count'].includes(limitType)) {
    res.status(400).json({ message: 'limitTypeはbinaryまたはcountである必要があります' });
    return;
  }

  if (limitType === 'count') {
    const numericLimit = Number(limitValue);
    if (!Number.isFinite(numericLimit) || numericLimit < 1) {
      res.status(400).json({ message: '回数制限では上限回数が必要です' });
      return;
    }
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
      limitValue: limitType === 'count' ? Number(limitValue) : null,
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
    const habitResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );

    const habit = habitResult.Item;
    if (!habit || habit.userId !== req.userId || habit.type !== 'habit') {
      res.status(404).json({ message: '習慣が見つかりません' });
      return;
    }

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const habitsResult = await docClient.send(
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
    const isLocked = isItemLockedForFreePlan(
      habitsResult.Items ?? [],
      id,
      FREE_LIMITS.activeHabits,
      (item) => item.status === 'active',
      hasPremiumAccess(userResult.Item)
    );
    if (isLocked) {
      res.status(403).json({ message: 'この習慣はPremiumで再開できます。' });
      return;
    }

    let actualValue: number | null = value ?? null;
    if (habit.limitType === 'count') {
      actualValue = Number(value);
      const limitValue = Number(habit.limitValue);

      if (!Number.isFinite(actualValue) || actualValue < 0) {
        res.status(400).json({ message: '今日の実績回数を入力してください' });
        return;
      }

      if (!Number.isFinite(limitValue) || limitValue < 1) {
        res.status(400).json({ message: '習慣の上限回数が不正です' });
        return;
      }

      if (result === 'achieved' && actualValue > limitValue) {
        res.status(400).json({ message: '実績が上限を超えています。守れなかったを選択してください' });
        return;
      }

      if (result === 'failed' && actualValue <= limitValue) {
        res.status(400).json({ message: '実績が上限以下です。守れたを選択してください' });
        return;
      }
    }

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
          value: actualValue,
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
    const habitResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );
    const habit = habitResult.Item;
    if (!habit || habit.userId !== req.userId || habit.type !== 'habit') {
      res.status(404).json({ message: '習慣が見つかりません' });
      return;
    }

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

// 今日の習慣ログをシェア済みにする
export const markHabitLogAsShared = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    const today = new Date().toISOString().slice(0, 10);

    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DAILY_LOGS,
        Key: {
          habitId: id,
          date: today,
        },
        UpdateExpression: 'SET sharedAt = :sharedAt',
        ConditionExpression: '#userId = :userId AND attribute_not_exists(sharedAt)',
        ExpressionAttributeNames: {
          '#userId': 'userId',
        },
        ExpressionAttributeValues: {
          ':sharedAt': new Date().toISOString(),
          ':userId': req.userId,
        },
      })
    );

    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
        UpdateExpression: 'SET lastSharedAt = :lastSharedAt ADD shareStreakCount :inc',
        ExpressionAttributeValues: {
          ':lastSharedAt': new Date().toISOString(),
          ':inc': 1,
        },
      })
    );

    res.status(200).json({ message: 'シェア完了を記録しました' });
  } catch (e: any) {
    if (e.name === 'ConditionalCheckFailedException') {
      res.status(409).json({ message: '共有済み、または今日の習慣ログが見つかりません' });
      return;
    }

    res.status(500).json({ message: e.message });
  }
};

// 習慣削除
export const deleteHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    const habitResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );
    const habit = habitResult.Item;
    if (!habit || habit.userId !== req.userId || habit.type !== 'habit') {
      res.status(404).json({ message: '習慣が見つかりません' });
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

// 習慣更新
export const updateHabit = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { title, description, limitValue } = req.body;

  try {
    const habitResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );

    const habit = habitResult.Item;
    if (!habit || habit.userId !== req.userId || habit.type !== 'habit') {
      res.status(404).json({ message: '習慣が見つかりません' });
      return;
    }

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const habitsResult = await docClient.send(
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
    const isLocked = isItemLockedForFreePlan(
      habitsResult.Items ?? [],
      id,
      FREE_LIMITS.activeHabits,
      (item) => item.status === 'active',
      hasPremiumAccess(userResult.Item)
    );
    if (isLocked) {
      res.status(403).json({ message: 'この習慣はPremiumで再開できます。' });
      return;
    }

    if (habit.limitType === 'count') {
      const numericLimit = Number(limitValue);
      if (!Number.isFinite(numericLimit) || numericLimit < 1) {
        res.status(400).json({ message: '回数制限では上限回数が必要です' });
        return;
      }
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'SET title = :title, description = :description, limitValue = :limitValue',
        ExpressionAttributeValues: {
          ':title': title,
          ':description': description ?? '',
          ':limitValue': habit.limitType === 'count' ? Number(limitValue) : null,
        },
      })
    );

    res.status(200).json({ message: '更新しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 未記録の習慣を自動で未達成にする
export const autoFailUnloggedHabits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const habitsResult = await docClient.send(
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

    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const habits = markLockedItems(
      habitsResult.Items ?? [],
      FREE_LIMITS.activeHabits,
      (item) => item.status === 'active',
      hasPremiumAccess(userResult.Item)
    ).filter((habit) => !habit.isLocked);
    const unloggedHabits = [];

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStart = getStartOfUtcDay(yesterday);
    const dateStr = toDateKey(yesterdayStart);

    for (const habit of habits) {
      const createdAt = new Date(habit.createdAt);

      // 作成から24時間未満、または昨日の開始時点で存在していなかった習慣は対象外。
      // 新規作成後にタブを移動して戻っただけで未記録扱いになることを防ぐ。
      if (
        Number.isNaN(createdAt.getTime()) ||
        now.getTime() - createdAt.getTime() < 24 * 60 * 60 * 1000 ||
        createdAt >= yesterdayStart
      ) {
        continue;
      }

      // 昨日のログだけを確認する。過去分をまとめて作らないことで大量警告を避ける。
      const logResult = await docClient.send(
        new QueryCommand({
          TableName: TABLES.DAILY_LOGS,
          KeyConditionExpression: 'habitId = :habitId AND #date = :date',
          ExpressionAttributeNames: { '#date': 'date' },
          ExpressionAttributeValues: {
            ':habitId': habit.declarationId,
            ':date': dateStr,
          },
        })
      );

      if ((logResult.Items?.length ?? 0) === 0) {
        const logId = uuidv4();
        await docClient.send(
          new PutCommand({
            TableName: TABLES.DAILY_LOGS,
            Item: {
              habitId: habit.declarationId,
              date: dateStr,
              logId,
              userId: req.userId,
              result: 'failed',
              value: null,
              autoFailed: true,
              createdAt: now.toISOString(),
            },
          })
        );

        await docClient.send(
          new UpdateCommand({
            TableName: TABLES.DECLARATIONS,
            Key: { declarationId: habit.declarationId },
            UpdateExpression: 'SET streakCount = :zero',
            ExpressionAttributeValues: { ':zero': 0 },
          })
        );

        unloggedHabits.push({
          declarationId: habit.declarationId,
          title: habit.title,
          date: dateStr,
        });
      }
    }

    // streakCountをリセット
    if (unloggedHabits.length > 0) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.USERS,
          Key: { userId: req.userId },
          UpdateExpression: 'SET streakCount = :zero',
          ExpressionAttributeValues: { ':zero': 0 },
        })
      );
    }

    res.status(200).json({ unloggedHabits });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
