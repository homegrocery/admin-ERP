import React, { useState } from 'react';
import {
  User,
  Phone,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Loader2,
  LogOut,
  Calendar,
  Lock
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import { refreshCoordinator } from '../services/refreshCoordinator';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import type { AdminUser } from '../types/admin';

interface ProfileModuleProps {
  lang: Language;
  adminUser: AdminUser;
  onProfileUpdate: (updatedAdmin: AdminUser) => void;
  onLogout: () => void;
  onLanguageChange: (lang: Language) => void;
}

export const ProfileModule: React.FC<ProfileModuleProps> = ({
  lang,
  adminUser,
  onProfileUpdate,
  onLogout,
  onLanguageChange
}) => {
  const t = adminTranslations[lang];

  // Profile Form state
  const [fullName, setFullName] = useState(adminUser.full_name || adminUser.username || 'Santosh Koli');
  const [preferredLang, setPreferredLang] = useState<Language>(
    (adminUser.preferred_language as Language) || lang
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Change PIN Form state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Safe UX: Auto-refresh admin profile without wiping unsaved user input
  useAutoRefresh('profile', async () => {
    try {
      const res = await adminApi.checkSession();
      if (res?.admin) {
        onProfileUpdate(res.admin);
        // Only update local input if not dirty
        if (fullName === adminUser.full_name || fullName === adminUser.username) {
          setFullName(res.admin.full_name || res.admin.username || 'Santosh Koli');
        } else {
          setProfileError(t.recordUpdatedRemotely);
        }
      }
    } catch {
      // ignore
    }
  });

  const handleCopyId = () => {
    if (adminUser.id) {
      navigator.clipboard.writeText(adminUser.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setProfileError(lang === 'mr' ? 'पूर्ण नाव किमान २ अक्षरांचे असावे.' : 'Full name must be at least 2 characters.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await adminApi.updateProfile({
        fullName: cleanName,
        preferredLanguage: preferredLang
      });

      onProfileUpdate(res.admin);
      if (preferredLang !== lang) {
        onLanguageChange(preferredLang);
      }
      setProfileSuccess(t.profileUpdatedSuccess);
      refreshCoordinator.triggerImmediateCheck();
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!currentPin) {
      setPinError(t.currentPinRequiredError);
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      setPinError(t.pinFormatError);
      return;
    }

    if (newPin !== confirmPin) {
      setPinError(t.pinMismatchError);
      return;
    }

    if (currentPin === newPin) {
      setPinError(t.pinIdenticalError);
      return;
    }

    setChangingPin(true);
    try {
      const res = await adminApi.changePin(currentPin, newPin, confirmPin);
      if (res.admin) {
        onProfileUpdate(res.admin);
      }
      setPinSuccess(lang === 'mr' ? res.messageMr || t.changePinSuccess : res.message || t.changePinSuccess);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      refreshCoordinator.triggerImmediateCheck();
      setTimeout(() => setPinSuccess(null), 6000);
    } catch (err: any) {
      setPinError(err.message || 'Failed to change PIN');
    } finally {
      setChangingPin(false);
    }
  };

  const handleResetPinForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError(null);
    setPinSuccess(null);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Module Title Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-md shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{t.profileTitle}</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t.profileSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              {t.ownerBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Account Details & Edit Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6">
        <div className="border-b border-slate-100 pb-4 mb-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" />
            {t.ownerAccountDetails}
          </h3>
        </div>

        {profileSuccess && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.ownerNameLabel}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.ownerNamePlaceholder}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
              </div>
            </div>

            {/* Mobile Number (Read-only protected) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.ownerMobileLabel}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  disabled
                  value={adminUser.mobile_number}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>

            {/* Preferred Portal Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.ownerPreferredLanguage}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value as Language)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition appearance-none"
                >
                  <option value="en">{t.languageEnglish}</option>
                  <option value="mr">{t.languageMarathi}</option>
                </select>
              </div>
            </div>

            {/* Authorization Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.ownerRoleLabel}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  disabled
                  value="admin (Owner-Administrator)"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-emerald-800 font-semibold text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Account UUID & Status Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 font-medium block mb-1">{t.ownerAccountIdLabel}:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-700 break-all select-all">{adminUser.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition shrink-0"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium block mb-1">{t.ownerStatusLabel}:</span>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{t.statusNormal}</span>
                {adminUser.created_at && (
                  <span className="text-slate-400 font-normal">
                    • <Calendar className="w-3 h-3 inline pb-0.5" /> {formatDate(adminUser.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.savingProfile}</span>
                </>
              ) : (
                <span>{t.saveProfileBtn}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Admin PIN Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6">
        <div className="border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Lock className="w-4 h-4 text-brand-600" />
            <h3>{t.changePinSectionTitle}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t.changePinSectionSubtitle}</p>
        </div>

        {pinSuccess && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pinSuccess}</span>
          </div>
        )}

        {pinError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{pinError}</span>
          </div>
        )}

        <form onSubmit={handleChangePinSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current PIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.currentPinLabel}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type={showCurrentPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.currentPinPlaceholder}
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  title={showCurrentPin ? t.hidePin : t.showPin}
                >
                  {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New PIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.newPinLabel}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.newPinPlaceholder}
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  title={showNewPin ? t.hidePin : t.showPin}
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New PIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.confirmPinLabel}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type={showConfirmPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.confirmPinPlaceholder}
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  title={showConfirmPin ? t.hidePin : t.showPin}
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleResetPinForm}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={changingPin || !currentPin || newPin.length !== 6 || confirmPin.length !== 6}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition disabled:opacity-50"
            >
              {changingPin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.changingPin}</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{t.changePinBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Logout Action Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{t.logout}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'mr'
              ? 'वर्तमान प्रशासकीय सत्र सुरक्षितपणे समाप्त करा.'
              : 'End your current administrative session securely.'}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.logout}</span>
        </button>
      </div>
    </div>
  );
};
