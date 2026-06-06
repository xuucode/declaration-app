import { useState } from 'react';
import api from '../utils/api.js';
import ShareButton from './ShareButton.js';
import { useLanguage } from '../i18n.js';

interface Expense {
  declarationId: string;
  title: string;
  description: string;
  limitAmount: number;
  period: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  sharedAt?: string;
}

interface ExpenseCardProps {
  expense: Expense;
  onUpdate: () => void;
}

const ExpenseCard = ({ expense, onUpdate }: ExpenseCardProps) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(expense.title);
  const [editDescription, setEditDescription] = useState(expense.description);
  const [editLimitAmount, setEditLimitAmount] = useState(expense.limitAmount.toString());

  const remaining = expense.limitAmount - expense.totalAmount;
  const percentage = Math.min(Math.round((expense.totalAmount / expense.limitAmount) * 100), 100);
  const isOver = expense.totalAmount > expense.limitAmount;

  const today = new Date().toISOString().slice(0, 10);
  const requiresShare = isOver && expense.periodEnd < today && !expense.sharedAt;

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/expenses/${expense.declarationId}/log`, {
        amount: Number(amount),
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.patch(`/expenses/${expense.declarationId}`, {
        title: editTitle,
        description: editDescription,
        limitAmount: Number(editLimitAmount),
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

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-white font-semibold text-lg flex-1 mr-4">{expense.title}</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${
            isOver
              ? 'bg-red-900/30 text-red-400 border-red-800'
              : 'bg-green-900/30 text-green-400 border-green-800'
          }`}>
            {isOver ? t('overBudget') : t('withinBudget')}
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

      {expense.description && !showEdit && (
        <p className="text-gray-400 text-sm mb-3">{expense.description}</p>
      )}

      {/* 編集フォーム */}
      {showEdit && (
        <form onSubmit={handleUpdate} className="space-y-3 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('categoryName')}</label>
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
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('limitAmountYen')}</label>
            <input
              type="number"
              value={editLimitAmount}
              onChange={(e) => setEditLimitAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              min="1"
              required
            />
          </div>
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

      {!showEdit && (
        <>
          <p className="text-gray-500 text-xs mb-3">
            {t('period')}：{expense.periodStart} 〜 {expense.periodEnd}
          </p>

          {/* 進捗バー */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">
                ¥{expense.totalAmount.toLocaleString()} / ¥{expense.limitAmount.toLocaleString()}
              </span>
              <span className={isOver ? 'text-red-400' : 'text-gray-400'}>
                {isOver ? `¥${Math.abs(remaining).toLocaleString()} ${t('over')}` : `${t('remaining')} ¥${remaining.toLocaleString()}`}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* 超過シェア */}
          {requiresShare && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm font-semibold mb-3">
                「{expense.title}」{t('expenseOverShareSuffix')}
              </p>
              <ShareButton
                declarationId={expense.declarationId}
                title={language === 'ja'
                  ? `${expense.title}の予算¥${expense.limitAmount.toLocaleString()}を¥${expense.totalAmount.toLocaleString()}で超過しました`
                  : `${expense.title} exceeded its ¥${expense.limitAmount.toLocaleString()} budget with ¥${expense.totalAmount.toLocaleString()} spent`
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
                <label className="block text-sm text-gray-400 mb-1">{t('amountYen')}</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="1000"
                  required
                  min="1"
                />
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
