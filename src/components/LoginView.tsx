import React, { useState } from 'react';
import { Shield, ShieldCheck, Lock, AlertCircle, Loader2, Globe, Eye, EyeOff } from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import type { AdminUser } from '../types/admin';

interface LoginViewProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: (admin: AdminUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  lang,
  onLanguageChange,
  onLoginSuccess
}) => {
  const t = adminTranslations[lang];
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim();
    if (!cleanPin || (cleanPin.length !== 4 && cleanPin.length !== 6)) {
      setError(t.pinValidationLength);
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.login(cleanPin);
      onLoginSuccess(res.admin);
    } catch (err: any) {
      setError(err.message || t.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          onClick={() => onLanguageChange(lang === 'en' ? 'mr' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Globe className="w-3.5 h-3.5 text-brand-400" />
          <span>{t.switchLanguage}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 text-white shadow-xl mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          {t.loginTitle}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          {t.loginSubtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-sm py-8 px-5 sm:px-8 shadow-2xl rounded-2xl border border-slate-700/80">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed font-medium">
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Fixed Administrator Identity Label */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.adminIdentity}
              </label>
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-900/70 border border-slate-700/80 rounded-xl text-slate-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white tracking-wide">
                    {t.defaultAdmin}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {t.defaultAdminSubtitle}
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t.statusActive}
                </span>
              </div>
            </div>

            {/* 2. Single PIN / Password Field with Eye Show/Hide */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.pinLabel}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.pinPlaceholder}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 tracking-widest font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none transition"
                  aria-label={showPin ? t.hidePin : t.showPin}
                  title={showPin ? t.hidePin : t.showPin}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.authenticating}</span>
                </>
              ) : (
                <span>{t.loginButton}</span>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t.loginRateLimitNotice}
            </p>
            <p className="mt-2 text-[10px] text-slate-500">
              {t.developedBy}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
