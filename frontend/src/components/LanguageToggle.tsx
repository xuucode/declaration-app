import { useLanguage } from '../i18n.js';

const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1">
      {(['ja', 'en'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            language === item
              ? 'bg-white text-gray-950'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          {item === 'ja' ? t('languageJa') : t('languageEn')}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
