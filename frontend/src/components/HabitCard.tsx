import { useState, useEffect } from 'react';
import api from '../utils/api.js';
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
  createdAt: string;
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
  const [checkingLog, setCheckingLog] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(habit.title);
  const [editDescription, setEditDescription] = useState(habit.description);
  const [editLimitValue, setEditLimitValue] = useState(habit.limitValue?.toString() ?? '');

  useEffect(() => {
    const checkTodayLog = async () => {
      try {
        const res = await api.get(`/habits/${habit.declarationId}/logs`);
        const today = new Date().toISOString().slice(0, 10);
        const todayLog = res.data.find((log: { date: string; result: string; autoFailed?: boolean; sharedAt?: string }) => log.date === today);
        if (todayLog) {
          setLogResult(todayLog.result);
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
  }, [habit.declarationId]);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (habit.limitType === 'count' && editLimitValue.trim() === '') {
      setError(t('maxCountRequired'));
      setLoading(false);
      return;
    }

    try {
      await api.patch(`/habits/${habit.declarationId}`, {
        title: editTitle,
        description: editDescription,
        limitValue: editLimitValue ? Number(editLimitValue) : null,
      });
      setShowEdit(false);
      onUpdate();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('updateFailed'));
    } finally {
      setLoading(false);
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-white font-semibold text-lg flex-1 mr-4">{habit.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-orange-400 font-bold text-sm whitespace-nowrap">
            🔥 {habit.streakCount}
          </span>
          <button
            onClick={() => setShowEdit(!showEdit)}
            className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded transition-colors"
          >
            {t('edit')}
          </button>
          <button
            onClick={handleDelete}
            className="text-red-700 hover:text-red-500 text-xs px-2 py-1 rounded transition-colors"
          >
            {t('delete')}
          </button>
        </div>
      </div>

      {habit.description && !showEdit && (
        <p className="text-gray-400 text-sm mb-3">{habit.description}</p>
      )}

      {habit.limitType === 'count' && habit.limitValue && !showEdit && (
        <p className="text-gray-500 text-xs mb-4">
          {t('goalCount')}：{habit.limitValue}{t('timesOrLess')}
        </p>
      )}

      {/* 編集フォーム */}
      {showEdit && (
        <form onSubmit={handleUpdate} className="space-y-3 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('habitName')}</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('detailsOptional')}</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          {habit.limitType === 'count' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('maxCount')}</label>
              <input
                type="number"
                value={editLimitValue}
                onChange={(e) => setEditLimitValue(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                min="1"
                required
              />
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {requiresShare ? (
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
                onUpdate();
              } catch (err) {
                const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
                setError(message ?? t('sharedRecordFailed'));
              }
            }}
          />
        </div>
      ) : logResult === 'achieved' ? (
        <div className="bg-green-900/20 border border-green-800 rounded-lg px-4 py-3">
          <p className="text-green-400 text-sm font-semibold">
            {t('achievedHabitTodayPrefix')}{habit.title}{t('achievedHabitTodaySuffix')}
          </p>
        </div>
      ) : logResult === 'failed' ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm font-semibold">
            {t('failedHabitTodayPrefix')}{habit.title}{t('failedHabitTodaySuffix')}
          </p>
        </div>
      ) : !showEdit && (
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
