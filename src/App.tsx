import { useState, useEffect } from 'react';
import { Header, type AdminTab } from './components/Header';
import { LoginView } from './components/LoginView';
import { AccountsModule } from './components/AccountsModule';
import { RecoveryRequestsModule } from './components/RecoveryRequestsModule';
import { DeleteAccountModule } from './components/DeleteAccountModule';
import { AuditLogsModule } from './components/AuditLogsModule';
import { ProfileModule } from './components/ProfileModule';
import { ErrorBoundary } from './components/ErrorBoundary';
import { adminTranslations, type Language } from './i18n/adminTranslations';
import { adminApi } from './services/adminApi';
import type { AdminUser } from './types/admin';
import { Loader2 } from 'lucide-react';

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('homegrocery_admin_lang') as Language) || 'mr';
  });

  const [currentTab, setCurrentTab] = useState<AdminTab>('accounts');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const t = adminTranslations[lang];

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('homegrocery_admin_lang', newLang);
  };

  useEffect(() => {
    const verifyAuth = async () => {
      const storedUser = adminApi.getAdminUser();
      const token = adminApi.getToken();

      if (token && storedUser) {
        setAdminUser(storedUser);
        try {
          const res = await adminApi.checkSession();
          if (res?.admin) {
            setAdminUser(res.admin);
          } else {
            setAdminUser(null);
          }
        } catch {
          setAdminUser(null);
        }
      }
      setCheckingSession(false);
    };

    verifyAuth();

    const handleSessionExpired = () => {
      setAdminUser(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('admin:session-expired', handleSessionExpired);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('admin:session-expired', handleSessionExpired);
      }
    };
  }, []);

  const handleLogout = async () => {
    await adminApi.logout();
    setAdminUser(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-xs text-slate-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <LoginView
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onLoginSuccess={(user) => setAdminUser(user)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Admin Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        adminUser={adminUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary>
          {currentTab === 'accounts' && <AccountsModule lang={lang} />}
          {currentTab === 'recovery' && <RecoveryRequestsModule lang={lang} />}
          {currentTab === 'delete' && <DeleteAccountModule lang={lang} />}
          {currentTab === 'audit' && <AuditLogsModule lang={lang} />}
          {currentTab === 'profile' && adminUser && (
            <ProfileModule
              lang={lang}
              adminUser={adminUser}
              onProfileUpdate={(updated) => {
                setAdminUser(updated);
                adminApi.setAdminUser(updated);
              }}
              onLogout={handleLogout}
              onLanguageChange={handleLanguageChange}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t.developedBy}</span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span>Home Grocery ERP v1.0.0</span>
            <span>•</span>
            <span>{import.meta.env.PROD ? 'Render Production' : 'Port: 3002'}</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">{t.sessionActive}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
