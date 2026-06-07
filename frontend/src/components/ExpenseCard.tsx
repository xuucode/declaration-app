import { useState } from 'react';
import api from '../utils/api.js';
import { createCheckoutSession } from '../utils/api.js';
import ShareButton from './ShareButton.js';
import { useLanguage } from '../i18n.js';

type Currency = 'JPY' | 'USD';

interface Expense {
  declarationId: string;
  title: string;
  description: string;
  limitAmount: number;
  currency?: Currency;
  period: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  sharedAt?: string;
  isLocked?: boolean;
}

interface ExpenseCardProps {
  expense: Expense;
  onUpdate: () => void;
}

interface ExpenseLog {
  expenseId: string;
  date: string;
  amount: number;
  currency?: Currency;
  memo?: string;
  createdAt: string;
}

const ExpenseCard = ({ expense, onUpdate }: ExpenseCardProps) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<ExpenseLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const currency = expense.currency ?? 'JPY';
  const formatAmount = (value: number, targetCurrency: Currency = currency) => new Intl.NumberFormat(language === 'ja' ? 'ja-JP' : 'en-US', {
    style: 'currency',
    currency: targetCurrency,
    maximumFractionDigits: targetCurrency === 'JPY' ? 0 : 2,
  }).format(value);

  const remaining = expense.limitAmount - expense.totalAmount;
  const percentage = Math.min(Math.round((expense.totalAmount / expense.limitAmount) * 100), 100);
  const isOver = expense.totalAmount > expense.limitAmount;

  const today = new Date().toISOString().slice(0, 10);
  const requiresShare = isOver && expense.periodEnd < today && !expense.sharedAt;

  const handleUpgrade = async () => {
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch {
      setError(t('checkoutFailed'));
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/expenses/${expense.declarationId}/log`, {
        amount: Number(amount),
        currency,
        memo,
      });
      setAmount('');
      setMemo('');
      setShowForm(false);
      onUpdate();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('recordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLogs = async () => {
    if (showLogs) {
      setShowLogs(false);
      return;
    }

    setLogsLoading(true);
    setError('');

    try {
      const res = await api.get(`/expenses/${expense.declarationId}/logs`);
      setLogs(res.data);
      setShowLogs(true);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('expenseLogsFetchFailed'));
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `${t('deleteHabitConfirmPrefix')}${expense.title}${t('deleteExpenseConfirmSuffix')}`
    );
    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      `${t('deleteFinalPrefix')}${expense.title}${t('deleteFinalSuffix')}`
    );
    if (!doubleConfirmed) return;

    try {
      await api.delete(`/expenses/${expense.declarationId}`);
      onUpdate();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('deleteFailed'));
    }
  };

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 mb-4 ${expense.isLocked ? 'border-yellow-700/60' : 'border-gray-800'}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-white font-semibold text-lg flex-1 mr-4">{expense.title}</h3>
        <div className="flex items-center gap-2">
          {expense.isLocked && (
            <span className="bg-yellow-900/30 text-yellow-300 border border-yellow-700 text-xs px-3 py-1 rounded-full whitespace-nowrap">
              {t('premiumLockedBadge')}
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${
            isOver
              ? 'bg-red-900/30 text-red-400 border-red-800'
              : 'bg-green-900/30 text-green-400 border-green-800'
          }`}>
            {isOver ? t('overBudget') : t('withinBudget')}
          </span>
          <button
            onClick={handleToggleLogs}
            disabled={expense.isLocked}
            className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded transition-colors"
          >
            {logsLoading ? t('loading') : t('viewExpenses')}
          </button>
          <button
            onClick={handleDelete}
            className="text-red-700 hover:text-red-500 text-xs px-2 py-1 rounded transition-colors"
          >
            {t('delete')}
          </button>
        </div>
      </div>

      {expense.description && (
        <p className="text-gray-400 text-sm mb-3">{expense.description}</p>
      )}

      {expense.isLocked && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-yellow-300 text-sm font-semibold mb-1">{t('premiumLockedTitle')}</p>
          <p className="text-gray-400 text-sm mb-3">{t('premiumLockedExpenseBody')}</p>
          <button
            type="button"
            onClick={handleUpgrade}
            className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('upgradePremium')}
          </button>
        </div>
      )}

      {!expense.isLocked && (
        <>
          <p className="text-gray-500 text-xs mb-3">
            {t('period')}：{expense.periodStart} 〜 {expense.periodEnd}
          </p>

          {/* 進捗バー */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">
                {formatAmount(expense.totalAmount)} / {formatAmount(expense.limitAmount)}
              </span>
              <span className={isOver ? 'text-red-400' : 'text-gray-400'}>
                {isOver ? `${formatAmount(Math.abs(remaining))} ${t('over')}` : `${t('remaining')} ${formatAmount(remaining)}`}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {showLogs && (
            <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4 mb-4">
              <p className="text-white text-sm font-semibold mb-3">{t('expenseHistory')}</p>
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('noExpenseLogs')}</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const logCurrency = log.currency ?? currency;
                    return (
                      <div key={log.expenseId} className="border-b border-gray-800 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-gray-400">{log.date}</span>
                          <span className="text-white font-semibold">{formatAmount(Number(log.amount), logCurrency)}</span>
                        </div>
                        {log.memo && (
                          <p className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">{log.memo}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 超過シェア */}
          {requiresShare && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm font-semibold mb-3">
                「{expense.title}」{t('expenseOverShareSuffix')}
              </p>
              <ShareButton
                declarationId={expense.declarationId}
                title={language === 'ja'
                  ? `${expense.title}の予算${formatAmount(expense.limitAmount)}を${formatAmount(expense.totalAmount)}で超過しました`
                  : `${expense.title} exceeded its ${formatAmount(expense.limitAmount)} budget with ${formatAmount(expense.totalAmount)} spent`
                }
                type="failed"
                onShare={async () => {
                await api.patch(`/expenses/${expense.declarationId}/shared`, {});
                onUpdate();
              }}
              />
            </div>
          )}

          {/* 支出追加フォーム */}
          {showForm ? (
            <form onSubmit={handleAddLog} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('amount')}</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder={currency === 'JPY' ? '1000' : '10'}
                  required
                  min={currency === 'JPY' ? '1' : '0.01'}
                  step={currency === 'JPY' ? '1' : '0.01'}
                />
                <p className="text-gray-500 text-xs mt-1">{t('currencyFixedHelp')} {currency}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('memoOptional')}</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder={t('memoPlaceholder')}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {t('record')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('addExpense')}
            </button>
          )}
        </>
      )}

      {error && !showForm && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default ExpenseCard;
