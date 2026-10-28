import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Lock,
  Unlock,
  ShieldCheck,
  History
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import { refreshCoordinator } from '../services/refreshCoordinator';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { PrivacyNotice } from './PrivacyNotice';
import type { AccountMetadata } from '../types/admin';

interface AccountsModuleProps {
  lang: Language;
  onNavigateToReactivation?: (mobileNumber?: string) => void;
}

export const AccountsModule: React.FC<AccountsModuleProps> = ({ lang, onNavigateToReactivation }) => {
  const t = adminTranslations[lang];
  const [accounts, setAccounts] = useState<AccountMetadata[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock / Activate Action State
  const [targetActionAccount, setTargetActionAccount] = useState<AccountMetadata | null>(null);
  const [actionType, setActionType] = useState<'lock' | 'activate' | null>(null);
  const [lockReasonInput, setLockReasonInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Attempt History Modal State
  const [attemptHistoryAccount, setAttemptHistoryAccount] = useState<AccountMetadata | null>(null);
  const [attemptHistoryLogs, setAttemptHistoryLogs] = useState<any[]>([]);
  const [attemptHistoryLoading, setAttemptHistoryLoading] = useState(false);
  const [attemptHistoryError, setAttemptHistoryError] = useState<string | null>(null);

  const openAttemptHistory = async (acc: AccountMetadata) => {
    setAttemptHistoryAccount(acc);
    setAttemptHistoryLoading(true);
    setAttemptHistoryError(null);
    try {
      const res = await adminApi.getAccountLoginAttempts(acc.id, 1, 50);
      setAttemptHistoryLogs(res.attempts || []);
    } catch (err: any) {
      setAttemptHistoryError(err.message || 'Failed to load login attempts');
    } finally {
      setAttemptHistoryLoading(false);
    }
  };

  const fetchAccounts = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    if (!isBackground) setError(null);
    try {
      const res = await adminApi.getAccounts({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setAccounts(res.accounts || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);

      // Safe UX: Remote conflict detection if action modal is open
      if (targetActionAccount) {
        const remoteAcc = (res.accounts || []).find(a => a.id === targetActionAccount.id);
        if (remoteAcc && (remoteAcc.is_locked !== targetActionAccount.is_locked || remoteAcc.has_pending_reactivation_request !== targetActionAccount.has_pending_reactivation_request)) {
          setTargetActionAccount(remoteAcc);
          setActionError(t.recordUpdatedRemotely);
        }
      }

      // Safe UX: Live update for attempt history modal without closing
      if (attemptHistoryAccount) {
        adminApi.getAccountLoginAttempts(attemptHistoryAccount.id, 1, 50).then(historyRes => {
          setAttemptHistoryLogs(historyRes.attempts || []);
        }).catch(() => {});
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message || 'Failed to load accounts');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Build 9 Phase 1.5: Universal Change-Based Auto-Refresh
  useAutoRefresh('accounts', () => {
    fetchAccounts(true);
  });

  useEffect(() => {
    fetchAccounts();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts();
  };

  const handleConfirmAction = async () => {
    if (!targetActionAccount || !actionType) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (actionType === 'lock') {
        const reason = lockReasonInput.trim();
        if (!reason) {
          setActionError(lang === 'mr' ? 'खाते लॉक करण्याचे कारण प्रविष्ट करणे आवश्यक आहे.' : 'Please enter a valid reason to lock this account.');
          setActionLoading(false);
          return;
        }
        await adminApi.lockAccount(targetActionAccount.id, reason);
        setActionSuccessMessage(t.lockSuccess);
      } else {
        if (targetActionAccount.has_pending_reactivation_request) {
          setActionError(t.directUnlockRestricted);
          setActionLoading(false);
          return;
        }
        await adminApi.activateAccount(targetActionAccount.id);
        setActionSuccessMessage(t.activateSuccess);
      }
      setTargetActionAccount(null);
      setActionType(null);
      setLockReasonInput('');
      await fetchAccounts();
      refreshCoordinator.triggerImmediateCheck();
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoStr: string | null | undefined, fallback?: string) => {
    if (!isoStr) return fallback !== undefined ? fallback : t.neverLoggedIn;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return fallback !== undefined ? fallback : t.neverLoggedIn;
      return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fallback !== undefined ? fallback : t.neverLoggedIn;
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Guarantee Banner */}
      <PrivacyNotice lang={lang} />

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.accountsTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.accountsSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {t.totalAccounts}: <strong className="font-mono text-brand-600">{total}</strong>
            </span>
            <button
              onClick={() => fetchAccounts()}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title={t.refresh}
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchAccountsPlaceholder}
              className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition"
            >
              {lang === 'mr' ? 'शोधा' : 'Search'}
            </button>
          </form>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">{t.filterAll}</option>
              <option value="active">{t.filterActive}</option>
              <option value="locked">{t.filterLocked}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Accounts List: Responsive Desktop Table & Mobile Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-brand-600" />
            <span>{t.loading}</span>
          </div>
        )}

        {!loading && accounts.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400">
            {t.noAccountsFound}
          </div>
        )}

        {!loading && accounts.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">{t.colMobile}</th>
                    <th className="py-3 px-4">{t.colUserId}</th>
                    <th className="py-3 px-4">{t.colStatus}</th>
                    <th className="py-3 px-4">{t.colRecoveryCode}</th>
                    <th className="py-3 px-4">{t.colPendingRequest}</th>
                    <th className="py-3 px-4">{t.colPinFormat}</th>
                    <th className="py-3 px-4">{t.colCreated}</th>
                    <th className="py-3 px-4">{t.colLastLogin}</th>
                    <th className="py-3 px-4 text-right">{t.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {accounts.map((acc) => {
                    const isOwner = acc.role === 'admin' || acc.mobile_number === '9356755100';
                    const hasRecovery = Boolean(acc.has_active_recovery_code ?? acc.has_recovery_code);

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                          {acc.mobile_number}
                          {isOwner && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                              OWNER
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {acc.id.substring(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4">
                          {acc.is_locked ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                {t.statusLocked}
                              </span>
                              <div className="mt-1 text-[10px] text-slate-500">
                                <span className="font-semibold text-rose-700">{acc.lock_type || 'AUTOMATIC'}:</span>{' '}
                                <span className="truncate inline-block max-w-[140px] align-bottom" title={acc.lock_reason || ''}>
                                  {acc.lock_reason || (acc.lock_type === 'ADMINISTRATIVE' ? 'Admin Lock' : '5 failed attempts')}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {t.statusActive}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {hasRecovery ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {t.codeConfigured}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              {t.codeNotConfigured}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {acc.has_pending_reactivation_request ? (
                            <button
                              type="button"
                              onClick={() => onNavigateToReactivation && onNavigateToReactivation(acc.mobile_number)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
                              title={t.directUnlockRestricted}
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                              <span>{t.pendingReactivation}</span>
                            </button>
                          ) : acc.has_pending_recovery_request ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 animate-pulse">
                              <Clock className="w-3 h-3 text-blue-600" />
                              {t.hasPendingRequest}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {acc.pin_length || 4} {t.pinDigits}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatDate(acc.created_at, '-')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatDate(acc.last_login_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openAttemptHistory(acc)}
                              title={lang === 'mr' ? 'प्रयत्न इतिहास पहा' : 'View Login Attempts History'}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition"
                            >
                              <History className="w-3 h-3 text-slate-500" />
                              <span>{lang === 'mr' ? 'इतिहास' : 'History'}</span>
                            </button>

                            {isOwner ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200" title="Owner account protected from administrative lockout">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                {t.ownerProtectedBadge}
                              </span>
                            ) : acc.has_pending_reactivation_request ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToReactivation && onNavigateToReactivation(acc.mobile_number)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-semibold transition"
                                title={t.directUnlockRestricted}
                              >
                                <Clock className="w-3 h-3 text-amber-600" />
                                {t.viewReactivationRequest}
                              </button>
                            ) : acc.is_locked ? (
                              <button
                                onClick={() => {
                                  setTargetActionAccount(acc);
                                  setActionType('activate');
                                  setActionError(null);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition"
                              >
                                <Unlock className="w-3 h-3 text-emerald-600" />
                                {t.btnActivateAccount}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTargetActionAccount(acc);
                                  setActionType('lock');
                                  setLockReasonInput('');
                                  setActionError(null);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition"
                              >
                                <Lock className="w-3 h-3 text-rose-600" />
                                {t.btnLockAccount}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {accounts.map((acc) => {
                const isOwner = acc.role === 'admin' || acc.mobile_number === '9356755100';
                const hasRecovery = Boolean(acc.has_active_recovery_code ?? acc.has_recovery_code);

                return (
                  <div key={acc.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {acc.mobile_number}
                        {isOwner && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                            OWNER
                          </span>
                        )}
                      </span>
                      {acc.is_locked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          {t.statusLocked}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {t.statusActive}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-50">
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.colRecoveryCode}</span>
                        <span className={hasRecovery ? "text-emerald-700 font-medium" : "text-amber-600"}>
                          {hasRecovery ? t.codeConfigured : t.codeNotConfigured}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.colPendingRequest}</span>
                        {acc.has_pending_reactivation_request ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToReactivation && onNavigateToReactivation(acc.mobile_number)}
                            className="inline-flex items-center gap-1 text-amber-800 font-semibold hover:underline"
                            title={t.directUnlockRestricted}
                          >
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>{t.pendingReactivation}</span>
                          </button>
                        ) : acc.has_pending_recovery_request ? (
                          <span className="text-blue-700 font-semibold">{t.hasPendingRequest}</span>
                        ) : (
                          <span className="text-slate-400">{t.noPendingRequest}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.colPinFormat}</span>
                        <span className="font-mono">{acc.pin_length || 4} {t.pinDigits}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.colLastLogin}</span>
                        <span className="truncate">{formatDate(acc.last_login_at)}</span>
                      </div>
                    </div>

                    {/* Mobile Action Controls */}
                    <div className="pt-2 flex items-center justify-end">
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {t.ownerProtectedBadge}
                        </span>
                      ) : acc.has_pending_reactivation_request ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToReactivation && onNavigateToReactivation(acc.mobile_number)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition"
                          title={t.directUnlockRestricted}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {t.viewReactivationRequest}
                        </button>
                      ) : acc.is_locked ? (
                        <button
                          onClick={() => {
                            setTargetActionAccount(acc);
                            setActionType('activate');
                            setActionError(null);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                          {t.btnActivateAccount}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setTargetActionAccount(acc);
                            setActionType('lock');
                            setActionError(null);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                        >
                          <Lock className="w-3.5 h-3.5 text-rose-600" />
                          {t.btnLockAccount}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t.pageOf.replace('{current}', String(page)).replace('{total}', String(totalPages))}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal for Lock / Activate (Feature 3) */}
      {targetActionAccount && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${actionType === 'lock' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {actionType === 'lock' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === 'lock' ? t.lockAccountModalTitle : t.activateAccountModalTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {actionType === 'lock' ? t.confirmLockPrompt : t.confirmActivatePrompt}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t.colMobile}:</span>
                <span className="font-mono font-bold text-slate-800">{targetActionAccount.mobile_number}</span>
              </div>
              {targetActionAccount.full_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'mr' ? 'नाव:' : 'Name:'}</span>
                  <span className="font-medium text-slate-800">{targetActionAccount.full_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">{t.colUserId}:</span>
                <span className="font-mono text-slate-600">{targetActionAccount.id.substring(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.colStatus}:</span>
                <span className={`font-semibold ${targetActionAccount.is_locked ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {targetActionAccount.is_locked ? t.statusLocked : t.statusActive}
                </span>
              </div>
            </div>

            {actionType === 'activate' && targetActionAccount.has_pending_reactivation_request ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-800">
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t.directUnlockRestricted}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {t.reviewInReactivationTab}
                </p>
                {onNavigateToReactivation && (
                  <button
                    type="button"
                    onClick={() => {
                      const mob = targetActionAccount.mobile_number;
                      setTargetActionAccount(null);
                      setActionType(null);
                      onNavigateToReactivation(mob);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs shadow-sm transition"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {t.viewReactivationRequest}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                {actionType === 'lock' ? t.lockNotice : t.activateNotice}
              </p>
            )}

            {/* Mandatory Lock Reason (Feature 4) */}
            {actionType === 'lock' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'mr' ? 'खाते लॉक करण्याचे कारण (अनिवार्य)*' : 'Account Lock Reason (Mandatory)*'}
                </label>
                <textarea
                  rows={2}
                  value={lockReasonInput}
                  onChange={(e) => setLockReasonInput(e.target.value)}
                  placeholder={lang === 'mr' ? 'उदा. संशयास्पद हालचाली, वापरकर्त्याची विनंती...' : 'e.g. Suspicious activity detected, security lock...'}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 resize-none"
                  required
                />
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTargetActionAccount(null);
                  setActionType(null);
                  setLockReasonInput('');
                  setActionError(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionLoading || (actionType === 'activate' && !!targetActionAccount.has_pending_reactivation_request)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-1.5 ${
                  actionType === 'lock'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : targetActionAccount.has_pending_reactivation_request
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                {actionType === 'lock'
                  ? (actionLoading ? t.lockingAccount : t.btnLockAccount)
                  : (actionLoading ? t.activatingAccount : t.btnActivateAccount)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Attempt History Modal (Build 6) */}
      {attemptHistoryAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === 'mr' ? 'लॉगिन प्रयत्न इतिहास' : 'Login Attempt History'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    +91 {attemptHistoryAccount.mobile_number} {attemptHistoryAccount.full_name ? `(${attemptHistoryAccount.full_name})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttemptHistoryAccount(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {attemptHistoryError && (
                <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {attemptHistoryError}
                </div>
              )}
              {attemptHistoryLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-600" />
                  <span>Loading history...</span>
                </div>
              ) : attemptHistoryLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No login attempts recorded yet for this account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">Time (IST)</th>
                        <th className="py-2.5 px-3">Outcome</th>
                        <th className="py-2.5 px-3">Reason</th>
                        <th className="py-2.5 px-3">Attempts</th>
                        <th className="py-2.5 px-3">Lock Triggered</th>
                        <th className="py-2.5 px-3">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attemptHistoryLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {formatDate(log.attempted_at)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.outcome === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {log.outcome}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                            {log.reason}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {log.consecutive_failed_attempts}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.lock_triggered === 1 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                                YES ({log.lock_type || 'AUTO'})
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {log.ip_address || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setAttemptHistoryAccount(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
