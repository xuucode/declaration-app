interface ShareButtonProps {
  declarationId: string;
  title: string;
  type: 'declaration' | 'failed';
  onShare?: () => void;
}

const ShareButton = ({ declarationId, title, type, onShare }: ShareButtonProps) => {
  const url = `${window.location.origin}/declarations/${declarationId}`;
  const text = type === 'declaration'
    ? `「${title}」と宣言しました！達成できるか見届けてください💪`
    : `「${title}」が未達成でした😔 次こそ達成します！`;

  const handleShare = () => {
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank');
    onShare?.();
  };

  return (
    <button
      onClick={handleShare}
      style={{
        backgroundColor: '#000000',
        color: '#ffffff',
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        width: '100%',
      }}
    >
      𝕏 でシェアする
    </button>
  );
};

export default ShareButton;