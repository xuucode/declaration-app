import Stripe from 'stripe';

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

export const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2026-05-27.dahlia',
});

export const STRIPE_CONFIG = {
  PRICE_ID: getRequiredEnv('STRIPE_PRICE_ID'),
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '',
};
