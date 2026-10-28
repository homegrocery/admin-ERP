import React, { useState } from 'react';
import {
  Users,
  KeyRound,
  UserX,
  ShieldAlert,
  LogOut,
  Globe,
  Shield,
  Menu,
  X,
  UserCog,
  Unlock,
  Rocket
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import type { AdminUser } from '../types/admin';
import { useFreshnessSummary, useAutoRefreshStatus } from '../hooks/useAutoRefresh';

export type AdminTab = 'accounts' | 'reactivation' | 'recovery' | 'delete' | 'audit' | 'profile' | 'releases';

interface HeaderProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  adminUser: AdminUser | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  lang,
  onLanguageChange,
  adminUser,
  onLogout
}) => {
  const t = adminTranslations[lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const summary = useFreshnessSummary();
  const syncStatus = useAutoRefreshStatus();

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'accounts', label: t.navAccounts, icon: <Users className="w-4 h-4" /> },
    {
      id: 'reactivation',
      label: t.navReactivation || 'Reactivation Requests',
      icon: <Unlock className="w-4 h-4" />,
      badge: summary?.pendingReactivations || 0
    },
    {
      id: 'recovery',
      label: t.navRecovery,
      icon: <KeyRound className="w-4 h-4" />,
      badge: summary?.pendingRecoveries || 0
    },
    { id: 'delete', label: t.navDelete, icon: <UserX className="w-4 h-4" /> },
    { id: 'audit', label: t.navAudit, icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'releases', label: t.navReleases, icon: <Rocket className="w-4 h-4" /> },
    { id: 'profile', label: t.navProfile, icon: <UserCog className="w-4 h-4" /> },
  ];

  const handleTabClick = (tabId: AdminTab) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {t.appTitle}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {t.ownerBadge}
                </span>

                {/* Live Sync Status Indicator (Build 9 Phase 1.5) */}
                <div
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition cursor-default ${
                    !syncStatus.isConnected
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : syncStatus.isPaused
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                  title={
                    !syncStatus.isConnected
                      ? t.syncError
                      : syncStatus.isPaused
                      ? t.syncPaused
                      : t.syncConnected
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      !syncStatus.isConnected
                        ? 'bg-rose-400'
                        : syncStatus.isPaused
                        ? 'bg-amber-400'
                        : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span>{t.liveSync}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Owner Info Tag (Clickable to open Profile) */}
            {adminUser && (
              <button
                type="button"
                onClick={() => onTabChange('profile')}
                className={`hidden md:flex flex-col text-right px-2.5 py-1 rounded-lg border transition ${
                  currentTab === 'profile'
                    ? 'bg-slate-800 border-brand-500 text-brand-300'
                    : 'border-transparent hover:bg-slate-800/80 text-slate-200'
                }`}
                title={t.navProfile}
              >
                <span className="text-xs font-semibold">
                  {adminUser.full_name || adminUser.username || 'Santosh Koli'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {adminUser.mobile_number}
                </span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              onClick={() => onLanguageChange(lang === 'en' ? 'mr' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-brand-400" />
              <span>{t.switchLanguage}</span>
            </button>

            {/* Logout Button */}
            {adminUser && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 transition"
                title={t.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.logout}</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden sm:block bg-slate-950/50 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 py-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-900 border-t border-slate-800 px-4 pt-2 pb-4 space-y-2">
          {adminUser && (
            <button
              type="button"
              onClick={() => handleTabClick('profile')}
              className={`w-full py-2 px-3 rounded-lg mb-2 flex justify-between items-center text-xs text-left transition border ${
                currentTab === 'profile'
                  ? 'bg-slate-800 border-brand-500 text-brand-300'
                  : 'bg-slate-800/60 border-transparent hover:bg-slate-800 text-slate-200'
              }`}
            >
              <div>
                <div className="font-semibold">{adminUser.full_name || adminUser.username || 'Santosh Koli'}</div>
                <div className="text-slate-400 font-mono">{adminUser.mobile_number}</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {t.ownerBadge}
              </span>
            </button>
          )}

          <div className="grid grid-cols-1 gap-1">
            {tabs.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition ${
                    active
                      ? 'bg-brand-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {adminUser && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
