import { useDelayedFlag } from '../hooks/useDelayedFlag.js';
import { useLanguage } from '../i18n.js';

interface LoadingPageProps {
  active?: boolean;
  delayMs?: number;
}

const LoadingPage = ({ active = true, delayMs = 1000 }: LoadingPageProps) => {
  const { t } = useLanguage();
  const showLoading = useDelayedFlag(active, delayMs);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      {showLoading && <p className="text-gray-400">{t('loading')}</p>}
    </div>
  );
};

export default LoadingPage;
