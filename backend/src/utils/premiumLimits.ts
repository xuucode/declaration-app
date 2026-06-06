export const FREE_LIMITS = {
  activeTasks: 3,
  activeHabits: 1,
  activeExpenses: 1,
} as const;

type LockableItem = Record<string, any> & {
  declarationId?: string;
  createdAt?: string;
};

const sortByCreatedAt = <T extends LockableItem>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt ?? '').getTime();
    const bTime = new Date(b.createdAt ?? '').getTime();
    return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
  });
};

export const markLockedItems = <T extends LockableItem>(
  items: T[],
  limit: number,
  shouldCount: (item: T) => boolean,
  isPremium: boolean
) => {
  if (isPremium) {
    return items.map((item) => ({ ...item, isLocked: false }));
  }

  const unlockedIds = new Set(
    sortByCreatedAt(items.filter(shouldCount))
      .slice(0, limit)
      .map((item) => item.declarationId)
      .filter((id): id is string => typeof id === 'string')
  );

  return items.map((item) => ({
    ...item,
    isLocked: shouldCount(item) && !unlockedIds.has(item.declarationId ?? ''),
  }));
};

export const isItemLockedForFreePlan = <T extends LockableItem>(
  items: T[],
  targetId: string,
  limit: number,
  shouldCount: (item: T) => boolean,
  isPremium: boolean
) => {
  if (isPremium) return false;
  const markedItems = markLockedItems(items, limit, shouldCount, false);
  return Boolean(markedItems.find((item) => item.declarationId === targetId)?.isLocked);
};
