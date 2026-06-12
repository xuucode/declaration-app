import { useLanguage } from '../i18n.js';
import { PUBLIC_API_BASE_URL } from '../config.js';

interface ShareButtonProps {
  declarationId: string;
  title: string;
  type: 'declaration' | 'failed' | 'progress';
  detail?: string;
  onShare?: () => void | Promise<void>;
}

const ShareButton = ({ declarationId, title, type, detail, onShare }: ShareButtonProps) => {
  const { language, t } = useLanguage();
  const url = (() => {
    try {
      return new URL(`declarations/${declarationId}/share`, `${PUBLIC_API_BASE_URL}/`).toString();
    } catch {
      return `${window.location.origin}/declarations/${declarationId}/share`;
    }
  })();
  const text = language === 'ja'
    ? (type === 'declaration'
      ? `逃げ道を減らすために、Structで公開宣言しました。「${title}」をやります。見届けてください。`
      : type === 'progress'
        ? `Structで公開宣言中。「${title}」${detail ? ` ${detail}` : ''}。このまま続けます。`
        : `「${title}」が未達成でした。逃げずに公開報告します。次は立て直します。`)
    : (type === 'declaration'
      ? `I am reducing my escape routes with a public commitment on Struct: "${title}". Watch me follow through.`
      : type === 'progress'
        ? `Public commitment update on Struct: "${title}"${detail ? ` ${detail}` : ''}. I am keeping it going.`
        : `I failed "${title}". I am reporting it publicly and getting back on track.`);
  const label = type === 'failed'
    ? t('publicFailureReport')
    : type === 'progress'
      ? t('publicProgressShare')
      : t('publicCommitmentAction');

  const handleShare = async () => {
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank');
    await onShare?.();
  };

  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center justify-center gap-2 bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-900 transition-colors border border-gray-700"
    >
      <span className="text-lg font-bold">𝕏</span>
      {label}
    </button>
  );
};

export default ShareButton;
