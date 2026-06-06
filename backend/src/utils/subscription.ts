export const hasPremiumAccess = (user: any, now = new Date()): boolean => {
  if (!user) return false;

  const accessUntil = new Date(user.premiumAccessUntil);
  const hasValidAccessUntil = !Number.isNaN(accessUntil.getTime());

  if (user.subscriptionCancelAtPeriodEnd && hasValidAccessUntil) {
    return accessUntil > now;
  }

  if (user.subscriptionStatus === 'active') {
    return !hasValidAccessUntil || accessUntil > now;
  }

  return false;
};
