import { Request, Response } from 'express';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadOgpImage } from '../ogp/uploadOgp.js';
import { OgpType } from '../ogp/generateOgp.js';

// 宣言一覧取得
export const getDeclarations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.DECLARATIONS,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': req.userId,
        },
        ScanIndexForward: false,
      })
    );

    res.status(200).json(result.Items ?? []);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// 宣言作成
export const createDeclaration = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, deadline } = req.body;

  if (!title || !deadline) {
    res.status(400).json({ message: '必須項目が不足しています' });
    return;
  }

  try {
    const declarationId = uuidv4();
    const createdAt = new Date().toISOString();

    const item = {
      declarationId,
      userId: req.userId,
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
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );
    const displayName = userResult.Item?.displayName ?? '';
    const newStreakCount = userResult.Item?.streakCount ?? 0;

    uploadOgpImage({
      declarationId: id,
      type: status as 'done' | 'failed',
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