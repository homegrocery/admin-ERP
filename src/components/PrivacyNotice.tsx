import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';

interface PrivacyNoticeProps {
  lang: Language;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({ lang }) => {
  const t = adminTranslations[lang];

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-emerald-900 mb-1">
            {t.privacyBannerTitle}
          </h4>
          <p className="text-xs text-emerald-800 leading-relaxed">
            {t.privacyBannerText}
          </p>
        </div>
      </div>
    </div>
  );
};
