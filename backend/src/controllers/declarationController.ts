import { Request, Response } from 'express';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadOgpImage } from '../ogp/uploadOgp.js';
import { OgpType } from '../ogp/generateOgp.js';
import { hasPremiumAccess } from '../utils/subscription.js';
import { FREE_LIMITS, isItemLockedForFreePlan, markLockedItems } from '../utils/premiumLimits.js';

// 宣言一覧取得
export const getDeclarations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DECLARATIONS,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: '#type = :type OR attribute_not_exists(#type)',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: {
          ':userId': req.userId,
          ':type': 'task',
        },
        ScanIndexForward: false,
      })
    );

    const user = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const isPremium = hasPremiumAccess(user.Item);
    const items = markLockedItems(
      result.Items ?? [],
      FREE_LIMITS.activeTasks,
      (item) => item.status === 'pending',
      isPremium
    );

    res.status(200).json(items);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 宣言作成
export const createDeclaration = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, deadline, type } = req.body;

  if (!title || !deadline) {
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

    const user = userResult.Item;
    const isPremium = hasPremiumAccess(user);

    if (!isPremium) {
      const today = new Date().toISOString().slice(0, 10);
      const todayDeclarations = await docClient.send(
        new QueryCommand({
          TableName: TABLES.DECLARATIONS,
          IndexName: 'userId-createdAt-index',
          KeyConditionExpression: 'userId = :userId AND begins_with(createdAt, :today)',
          ExpressionAttributeValues: {
            ':userId': req.userId,
            ':today': today,
          },
        })
      );

      if ((todayDeclarations.Items?.length ?? 0) >= 3) {
        res.status(403).json({ message: '無料プランは1日3回までです。プレミアムにアップグレードしてください。' });
        return;
      }
    }

    const declarationId = uuidv4();
    const createdAt = new Date().toISOString();

    const item = {
    declarationId,
    userId: req.userId,
    type: type ?? 'task',
    title,
    description: description ?? '',
    deadline,
    status: 'pending',
    ogpImageUrl: '',
    createdAt,
    reportedAt: '',
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.DECLARATIONS,
        Item: item,
      })
    );

    // OGP画像生成（非同期で実行、レスポンスを待たない）
    uploadOgpImage({
      declarationId,
      type: 'declaration',
      title,
      displayName: '',
    }).then(async (ogpImageUrl) => {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.DECLARATIONS,
          Key: { declarationId },
          UpdateExpression: 'SET ogpImageUrl = :ogpImageUrl',
          ExpressionAttributeValues: { ':ogpImageUrl': ogpImageUrl },
        })
      );
    }).catch(console.error);

    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 宣言詳細取得（認証不要）
export const getDeclaration = async (req: Request, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );

    if (!result.Item) {
      res.status(404).json({ message: '宣言が見つかりません' });
      return;
    }

    res.status(200).json(result.Item);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 達成・未達成報告
export const updateDeclarationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { status } = req.body;

  if (!status || !['done', 'failed'].includes(status)) {
    res.status(400).json({ message: 'statusはdoneまたはfailedである必要があります' });
    return;
  }

    try {
    const declarationResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
      })
    );
    const declaration = declarationResult.Item;
    if (!declaration || declaration.userId !== req.userId) {
      res.status(404).json({ message: '宣言が見つかりません' });
      return;
    }

    const premiumUserResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const isPremium = hasPremiumAccess(premiumUserResult.Item);
    const declarationsResult = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DECLARATIONS,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: '#type = :type OR attribute_not_exists(#type)',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: {
          ':userId': req.userId,
          ':type': 'task',
        },
      })
    );
    const isLocked = isItemLockedForFreePlan(
      declarationsResult.Items ?? [],
      id,
      FREE_LIMITS.activeTasks,
      (item) => item.status === 'pending',
      isPremium
    );
    if (isLocked) {
      res.status(403).json({ message: 'この宣言はPremiumで再開できます。' });
      return;
    }

    const reportedAt = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'SET #status = :status, reportedAt = :reportedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':reportedAt': reportedAt,
        },
      })
    );
    // streakCountの更新
    if (status === 'done') {
  // その日の全タスクが達成済みかチェック
    const today = new Date().toISOString().slice(0, 10);
    const todayDeclarations = await docClient.send(
    new QueryCommand({
      TableName: TABLES.DECLARATIONS,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId AND begins_with(createdAt, :today)',
      ExpressionAttributeValues: {
        ':userId': req.userId,
        ':today': today,
      },
    })
  );

    const todayItems = todayDeclarations.Items ?? [];
    const allDone = todayItems.every(
    (item) => item.declarationId === id || item.status === 'done'
  );

  if (allDone && todayItems.length > 0) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
        UpdateExpression: 'ADD streakCount :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
        },
      })
    );
  }
} else {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId: req.userId },
      UpdateExpression: 'SET streakCount = :zero',
      ExpressionAttributeValues: {
        ':zero': 0,
      },
    })
  );
}

    // OGP画像生成（非同期）
    const ogpUserResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const displayName = ogpUserResult.Item?.displayName ?? '';
    const newStreakCount = ogpUserResult.Item?.streakCount ?? 0;

    uploadOgpImage({
      declarationId: id,
      type: status as OgpType,
      title: '',
      displayName,
      streakCount: newStreakCount,
    }).then(async (ogpImageUrl) => {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.DECLARATIONS,
          Key: { declarationId: id },
          UpdateExpression: 'SET ogpImageUrl = :ogpImageUrl',
          ExpressionAttributeValues: { ':ogpImageUrl': ogpImageUrl },
        })
      );
    }).catch(console.error);

    // 未達成の場合はシェア要求フラグを返す
    const requiresShare = status === 'failed';

    res.status(200).json({ message: '更新しました', requiresShare });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// シェア完了記録
export const markAsShared = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'SET sharedAt = :sharedAt',
        ExpressionAttributeValues: {
          ':sharedAt': new Date().toISOString(),
        },
      })
    );

    res.status(200).json({ message: 'シェア完了を記録しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
