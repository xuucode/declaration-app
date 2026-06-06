import { Link, useNavigate } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLanguage } from '../i18n.js';

const privacySections = [
  ['privacyIntroTitle', 'privacyIntroBody'],
  ['privacyCollectedTitle', 'privacyCollectedBody'],
  ['privacyPurposeTitle', 'privacyPurposeBody'],
  ['privacyPublicTitle', 'privacyPublicBody'],
  ['privacyThirdPartyTitle', 'privacyThirdPartyBody'],
  ['privacyAdsTitle', 'privacyAdsBody'],
  ['privacySecurityTitle', 'privacySecurityBody'],
  ['privacyRetentionTitle', 'privacyRetentionBody'],
  ['privacyRightsTitle', 'privacyRightsBody'],
  ['privacyChangesTitle', 'privacyChangesBody'],
  ['privacyContactTitle', 'privacyContactBody'],
] as const;

const PrivacyPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="max-w-2xl mx-auto pt-12">
        <div className="mb-6">
          <button
            onClick={() => navigate(user ? '/mypage' : '/login')}
            className="text-gray-400 hover:text-white text-sm transition-colors mb-4"
          >
            {t('backHome')}
          </button>
          <h1 className="text-white text-3xl font-bold mb-2">{t('privacy')}</h1>
          <p className="text-gray-400 text-sm">{t('privacyLead')}</p>
          <p className="text-gray-500 text-xs mt-3">{t('privacyUpdated')}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          {privacySections.map(([titleKey, bodyKey]) => (
            <section key={titleKey}>
              <h2 className="text-white font-semibold text-lg mb-2">{t(titleKey)}</h2>
              <p className="text-gray-400 text-sm leading-7">{t(bodyKey)}</p>
            </section>
          ))}
        </div>

        <div className="flex justify-center gap-4 mt-6 text-xs text-gray-600">
          <Link to="/contact" className="hover:text-gray-300 transition-colors">
            {t('contact')}
          </Link>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">
            {t('terms')}
          </Link>
          <Link to="/commercial-transaction" className="hover:text-gray-300 transition-colors">
            {t('commercialTransaction')}
          </Link>
          <Link to={user ? '/mypage' : '/login'} className="hover:text-gray-300 transition-colors">
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
