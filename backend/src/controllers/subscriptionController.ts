import { Response } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { stripe, STRIPE_CONFIG } from '../config/stripe.js';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';

// チェックアウトセッション作成
export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );

    const user = userResult.Item;
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    let customerId = user.stripeCustomerId;

    // Stripeカスタマーが未作成の場合は作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: req.userId! },
      });
      customerId = customer.id;

      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.USERS,
          Key: { userId: req.userId },
          UpdateExpression: 'SET stripeCustomerId = :customerId, subscriptionStatus = :status',
          ExpressionAttributeValues: {
            ':customerId': customerId,
            ':status': 'free',
          },
        })
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/mypage?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/mypage?subscription=canceled`,
    });

    res.status(200).json({ url: session.url });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// サブスクリプションキャンセル
export const cancelSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
      })
    );

    const user = userResult.Item;
    if (!user?.subscriptionId) {
      res.status(400).json({ message: 'サブスクリプションが見つかりません' });
      return;
    }

    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: true,
    });

    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.userId },
        UpdateExpression: 'SET subscriptionStatus = :status',
        ExpressionAttributeValues: {
          ':status': 'canceled',
        },
      })
    );

    res.status(200).json({ message: 'サブスクリプションをキャンセルしました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// Webhookハンドラ
export const handleWebhook = async (req: any, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    );
  } catch (e: any) {
    res.status(400).json({ message: `Webhook Error: ${e.message}` });
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      // customerIdからuserIdを取得
      const customer = await stripe.customers.retrieve(customerId) as any;
      const userId = customer.metadata.userId;

      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.USERS,
          Key: { userId },
          UpdateExpression: 'SET subscriptionStatus = :status, subscriptionId = :subId',
          ExpressionAttributeValues: {
            ':status': 'active',
            ':subId': subscriptionId,
          },
        })
      );
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;
      const customer = await stripe.customers.retrieve(customerId) as any;
      const userId = customer.metadata.userId;

      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.USERS,
          Key: { userId },
          UpdateExpression: 'SET subscriptionStatus = :status',
          ExpressionAttributeValues: {
            ':status': 'free',
          },
        })
      );
      break;
    }
  }

  res.status(200).json({ received: true });
};