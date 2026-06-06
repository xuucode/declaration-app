import { useLanguage } from '../i18n.js';

interface ShareButtonProps {
  declarationId: string;
  title: string;
  type: 'declaration' | 'failed';
  onShare?: () => void;
}

const ShareButton = ({ declarationId, title, type, onShare }: ShareButtonProps) => {
  const { language, t } = useLanguage();
  const url = `${window.location.origin}/declarations/${declarationId}`;
  const text = language === 'ja'
    ? (type === 'declaration'
      ? `「${title}」と宣言しました！達成できるか見届けてください💪`
      : `「${title}」が未達成でした😔 次こそ達成します！`)
    : (type === 'declaration'
      ? `I committed to "${title}"! Watch me follow through 💪`
      : `I failed "${title}" 😔 I'll do better next time!`);

  const handleShare = () => {
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank');
    onShare?.();
  };

  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center justify-center gap-2 bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-900 transition-colors border border-gray-700"
    >
      <span className="text-lg font-bold">𝕏</span>
      {t('shareOnX')}
    </button>
  );
};

export default ShareButton;
