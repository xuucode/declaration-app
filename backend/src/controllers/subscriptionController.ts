import { Response } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { stripe, STRIPE_CONFIG } from '../config/stripe.js';
import { docClient, TABLES } from '../config/dynamodb.js';
import { AuthRequest } from '../middleware/auth.js';

const PREMIUM_STATUSES = new Set(['active', 'trialing']);
const TERMINAL_STATUSES = new Set(['canceled', 'incomplete_expired', 'unpaid']);

const getFrontendUrl = () => (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')[0]
  .trim()
  .replace(/\/+$/, '');

const getUnixTime = (value: unknown): number | null => {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
};

const toIsoFromUnix = (value: unknown): string | null => {
  const timestamp = getUnixTime(value);
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
};

const getSubscriptionAccessUntil = (subscription: any): string | null => {
  return toIsoFromUnix(subscription.current_period_end);
};

const isAccessFuture = (isoDate: string | null, now = new Date()) => {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  return !Number.isNaN(date.getTime()) && date > now;
};

const getStripeCustomerId = (customer: unknown): string | null => {
  if (typeof customer === 'string') return customer;
  if (customer && typeof customer === 'object' && 'id' in customer) {
    return String((customer as { id: string }).id);
  }
  return null;
};

const getStripeSubscriptionId = (subscription: unknown): string | null => {
  if (typeof subscription === 'string') return subscription;
  if (subscription && typeof subscription === 'object' && 'id' in subscription) {
    return String((subscription as { id: string }).id);
  }
  return null;
};

const getUserById = async (userId: string) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.USERS,
      Key: { userId },
    })
  );
  return result.Item;
};

const updateUserSubscription = async (
  userId: string,
  values: {
    subscriptionStatus: 'active' | 'free';
    subscriptionId?: string;
    subscriptionCancelAtPeriodEnd: boolean;
    premiumAccessUntil?: string | null;
  }
) => {
  const setExpressions = [
    'subscriptionStatus = :subscriptionStatus',
    'subscriptionCancelAtPeriodEnd = :subscriptionCancelAtPeriodEnd',
  ];
  const expressionValues: Record<string, unknown> = {
    ':subscriptionStatus': values.subscriptionStatus,
    ':subscriptionCancelAtPeriodEnd': values.subscriptionCancelAtPeriodEnd,
  };

  if (values.subscriptionId) {
    setExpressions.push('subscriptionId = :subscriptionId');
    expressionValues[':subscriptionId'] = values.subscriptionId;
  }

  if (values.premiumAccessUntil) {
    setExpressions.push('premiumAccessUntil = :premiumAccessUntil');
    expressionValues[':premiumAccessUntil'] = values.premiumAccessUntil;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
    })
  );
};

const syncSubscriptionToUser = async (
  userId: string,
  subscription: any,
  options: { forceCancelScheduled?: boolean } = {}
) => {
  const subscriptionId = String(subscription.id);
  const accessUntil = getSubscriptionAccessUntil(subscription);
  const status = String(subscription.status ?? '');
  const cancelAtPeriodEnd = Boolean(
    subscription.cancel_at_period_end ||
    options.forceCancelScheduled ||
    TERMINAL_STATUSES.has(status)
  );

  if (PREMIUM_STATUSES.has(status) || isAccessFuture(accessUntil)) {
    await updateUserSubscription(userId, {
      subscriptionStatus: 'active',
      subscriptionId,
      subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
      premiumAccessUntil: accessUntil,
    });
    return;
  }

  if (TERMINAL_STATUSES.has(status) || !isAccessFuture(accessUntil)) {
    await updateUserSubscription(userId, {
      subscriptionStatus: 'free',
      subscriptionId,
      subscriptionCancelAtPeriodEnd: false,
      premiumAccessUntil: accessUntil ?? new Date().toISOString(),
    });
  }
};

const resolveUserIdFromStripeCustomer = async (customerId: string) => {
  const customer = await stripe.customers.retrieve(customerId) as any;
  return customer?.metadata?.userId as string | undefined;
};

const ensureStripeCustomer = async (user: any, userId: string): Promise<string> => {
  if (user.stripeCustomerId) {
    await stripe.customers.update(user.stripeCustomerId, {
      email: user.email,
      metadata: { userId },
    });
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId },
  });

  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: 'SET stripeCustomerId = :stripeCustomerId, subscriptionStatus = :subscriptionStatus, subscriptionCancelAtPeriodEnd = :subscriptionCancelAtPeriodEnd',
      ExpressionAttributeValues: {
        ':stripeCustomerId': customer.id,
        ':subscriptionStatus': 'free',
        ':subscriptionCancelAtPeriodEnd': false,
      },
    })
  );

  return customer.id;
};

export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const user = await getUserById(userId);

    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    const customerId = await ensureStripeCustomer(user, userId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
      line_items: [
        {
          price: STRIPE_CONFIG.PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${getFrontendUrl()}/mypage?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getFrontendUrl()}/mypage?subscription=canceled`,
    });

    res.status(200).json({ url: session.url });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const confirmCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const { sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ message: 'チェックアウトセッションが見つかりません' });
    return;
  }

  try {
    const userId = req.userId!;
    const user = await getUserById(userId);

    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
    const sessionCustomerId = getStripeCustomerId(session.customer);

    if (session.mode !== 'subscription' || sessionCustomerId !== user.stripeCustomerId) {
      res.status(403).json({ message: 'チェックアウトセッションを確認できません' });
      return;
    }

    const subscriptionId = getStripeSubscriptionId(session.subscription);
    if (!subscriptionId) {
      res.status(400).json({ message: 'サブスクリプションが見つかりません' });
      return;
    }

    const subscription =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(subscriptionId)
        : session.subscription;

    await syncSubscriptionToUser(userId, subscription);
    res.status(200).json({ message: 'サブスクリプションを同期しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const cancelSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const user = await getUserById(userId);

    if (!user?.subscriptionId) {
      res.status(400).json({ message: 'サブスクリプションが見つかりません' });
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
    if (!PREMIUM_STATUSES.has(subscription.status) && !isAccessFuture(getSubscriptionAccessUntil(subscription))) {
      await syncSubscriptionToUser(userId, subscription);
      res.status(400).json({ message: '有効なサブスクリプションがありません' });
      return;
    }

    const scheduledSubscription = subscription.cancel_at_period_end
      ? subscription
      : await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
        });

    await syncSubscriptionToUser(userId, scheduledSubscription, { forceCancelScheduled: true });

    res.status(200).json({
      message: 'サブスクリプションの解約を予約しました',
      premiumAccessUntil: getSubscriptionAccessUntil(scheduledSubscription),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const handleWebhook = async (req: any, res: Response): Promise<void> => {
  if (!STRIPE_CONFIG.WEBHOOK_SECRET) {
    res.status(503).json({ message: 'Stripe webhook secret is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );
  } catch (e: any) {
    res.status(400).json({ message: `Webhook Error: ${e.message}` });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const subscriptionId = getStripeSubscriptionId(session.subscription);
        const customerId = getStripeCustomerId(session.customer);
        const userId = session.client_reference_id || session.metadata?.userId || (customerId ? await resolveUserIdFromStripeCustomer(customerId) : undefined);

        if (!subscriptionId || !userId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionToUser(userId, subscription);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = getStripeCustomerId(subscription.customer);
        const userId = subscription.metadata?.userId || (customerId ? await resolveUserIdFromStripeCustomer(customerId) : undefined);

        if (!userId) break;

        const user = await getUserById(userId);
        if (user?.subscriptionId && user.subscriptionId !== subscription.id) {
          const incomingAccessUntil = getSubscriptionAccessUntil(subscription);
          const existingAccessUntil = typeof user.premiumAccessUntil === 'string' ? user.premiumAccessUntil : null;
          if (
            !isAccessFuture(incomingAccessUntil) ||
            (existingAccessUntil && incomingAccessUntil && existingAccessUntil > incomingAccessUntil)
          ) {
            break;
          }
        }

        await syncSubscriptionToUser(userId, subscription);
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
