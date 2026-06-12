import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { createCheckoutSession } from '../utils/api.js';
import ShareButton from './ShareButton.js';
import { useLanguage } from '../i18n.js';

interface Habit {
  declarationId: string;
  title: string;
  description: string;
  limitType: string;
  limitValue: number | null;
  status: string;
  streakCount: number;
  achievedCount?: number;
  totalCount?: number;
  publicSharedAt?: string;
  createdAt: string;
  isLocked?: boolean;
}

interface HabitCardProps {
  habit: Habit;
  onUpdate: () => void;
}

const HabitCard = ({ habit, onUpdate }: HabitCardProps) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [logResult, setLogResult] = useState<'achieved' | 'failed' | null>(null);
  const [requiresShare, setRequiresShare] = useState(false);
  const [checkingLog, setCheckingLog] = useState(!habit.isLocked);
  const [todayLogShared, setTodayLogShared] = useState(false);
  const achievedCount = habit.achievedCount ?? 0;
  const totalCount = habit.totalCount ?? 0;

  useEffect(() => {
    if (habit.isLocked) {
      return;
    }

    const checkTodayLog = async () => {
      try {
        const res = await api.get(`/habits/${habit.declarationId}/logs`);
        const today = new Date().toISOString().slice(0, 10);
        const todayLog = res.data.find((log: { date: string; result: string; autoFailed?: boolean; sharedAt?: string }) => log.date === today);
        if (todayLog) {
          setLogResult(todayLog.result);
          setTodayLogShared(Boolean(todayLog.sharedAt));
          if (todayLog.result === 'failed' && !todayLog.autoFailed && !todayLog.sharedAt) {
            setRequiresShare(true);
          }
        }
      } catch {
        // エラー時は何もしない
      } finally {
        setCheckingLog(false);
      }
    };
    checkTodayLog();
  }, [habit.declarationId, habit.isLocked]);

  const handleUpgrade = async () => {
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch {
      setError(t('checkoutFailed'));
    }
  };

  const handleLog = async (result: 'achieved' | 'failed') => {
    if (habit.limitType === 'count') {
      if (value.trim() === '') {
        setError(t('actualCountRequired'));
        return;
      }

      const actualValue = Number(value);
      const limitValue = habit.limitValue ?? Infinity;

      if (!Number.isFinite(actualValue) || actualValue < 0) {
        setError(t('actualCountRequired'));
        return;
      }

      if (result === 'achieved' && actualValue > limitValue) {
        setError(`${t('limitExceededPrefix')}${habit.limitValue}${t('limitExceededSuffix')}`);
        return;
      }

      if (result === 'failed' && actualValue <= limitValue) {
        setError(t('countWithinLimitCannotFail'));
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/habits/${habit.declarationId}/log`, {
        result,
        value: value ? Number(value) : null,
      });
      setLogResult(result);
      setTodayLogShared(false);
      if (result === 'failed') {
        setRequiresShare(true);
      }
      onUpdate();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('recordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `${t('deleteHabitConfirmPrefix')}${habit.title}${t('deleteHabitConfirmSuffix')}`
    );
    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      `${t('deleteFinalPrefix')}${habit.title}${t('deleteFinalSuffix')}`
    );
    if (!doubleConfirmed) return;

    try {
      await api.delete(`/habits/${habit.declarationId}`);
      onUpdate();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('deleteFailed'));
    }
  };

  if (checkingLog) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <p className="text-gray-500 text-sm">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 mb-4 ${habit.isLocked ? 'border-yellow-700/60' : 'border-gray-800'}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-white font-semibold text-lg flex-1 mr-4">{habit.title}</h3>
        <div className="flex flex-wrap justify-end items-center gap-2">
          {habit.isLocked && (
            <span className="bg-yellow-900/30 text-yellow-300 border border-yellow-700 text-xs px-3 py-1 rounded-full whitespace-nowrap">
              {t('premiumLockedBadge')}
            </span>
          )}
          {habit.publicSharedAt ? (
            <span className="bg-blue-900/30 text-blue-300 border border-blue-800 text-xs px-3 py-1 rounded-full whitespace-nowrap">
              {t('publicCommitmentBadge')}
            </span>
          ) : (
            <span className="bg-gray-800 text-gray-500 border border-gray-700 text-xs px-3 py-1 rounded-full whitespace-nowrap">
              {t('privateCommitmentBadge')}
            </span>
          )}
          <span className="text-orange-400 font-bold text-sm whitespace-nowrap">
            🔥 {habit.streakCount}
          </span>
          <span className="text-blue-300 font-bold text-sm whitespace-nowrap">
            {achievedCount}/{totalCount}
          </span>
          <button
            onClick={handleDelete}
            className="text-red-700 hover:text-red-500 text-xs px-2 py-1 rounded transition-colors"
          >
            {t('delete')}
          </button>
        </div>
      </div>

      {habit.description && (
        <p className="text-gray-400 text-sm mb-3">{habit.description}</p>
      )}

      {habit.limitType === 'count' && habit.limitValue && (
        <p className="text-gray-500 text-xs mb-4">
          {t('goalCount')}：{habit.limitValue}{t('timesOrLess')}
        </p>
      )}

      {habit.isLocked && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-300 text-sm font-semibold mb-1">{t('premiumLockedTitle')}</p>
          <p className="text-gray-400 text-sm mb-3">{t('premiumLockedHabitBody')}</p>
          <button
            type="button"
            onClick={handleUpgrade}
            className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('upgradePremium')}
          </button>
        </div>
      )}

      {requiresShare && !habit.isLocked ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm font-semibold mb-3">
            {t('shareFailedHabit')}
          </p>
          <ShareButton
            declarationId={habit.declarationId}
            title={habit.title}
            type="failed"
            onShare={async () => {
              try {
                await api.patch(`/habits/${habit.declarationId}/log/shared`, {});
                setRequiresShare(false);
                setTodayLogShared(true);
                onUpdate();
              } catch (err) {
                const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
                setError(message ?? t('sharedRecordFailed'));
              }
            }}
          />
        </div>
      ) : logResult === 'achieved' && !habit.isLocked ? (
        <div className="space-y-3">
          <div className="bg-green-900/20 border border-green-800 rounded-lg px-4 py-3">
            <p className="text-green-400 text-sm font-semibold">
              {t('achievedHabitTodayPrefix')}{habit.title}{t('achievedHabitTodaySuffix')}
            </p>
          </div>
          {!todayLogShared && (
            <ShareButton
              declarationId={habit.declarationId}
              title={habit.title}
              type="progress"
              detail={`${t('habitProgressDetailPrefix')}${habit.streakCount}${t('habitProgressDetailMiddle')}${achievedCount}/${totalCount}`}
              onShare={async () => {
                await api.patch(`/habits/${habit.declarationId}/log/shared`, {});
                setTodayLogShared(true);
                onUpdate();
              }}
            />
          )}
          {todayLogShared && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3">
              <p className="text-blue-300 text-sm font-semibold">{t('habitSharedToday')}</p>
            </div>
          )}
        </div>
      ) : logResult === 'failed' && !habit.isLocked ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm font-semibold">
            {t('failedHabitTodayPrefix')}{habit.title}{t('failedHabitTodaySuffix')}
          </p>
        </div>
      ) : !habit.isLocked && (
        <div className="space-y-3">
          {habit.limitType === 'count' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('actualCountToday')}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="0"
                min="0"
                required
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleLog('achieved')}
              disabled={loading}
              className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {t('kept')}
            </button>
            <button
              onClick={() => handleLog('failed')}
              disabled={loading}
              className="flex-1 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {t('notKept')}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default HabitCard;
