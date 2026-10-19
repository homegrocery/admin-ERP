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
  ShieldAlert
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import { PrivacyNotice } from './PrivacyNotice';
import type { AccountMetadata } from '../types/admin';

interface AccountsModuleProps {
  lang: Language;
}

export const AccountsModule: React.FC<AccountsModuleProps> = ({ lang }) => {
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

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts();
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
              onClick={fetchAccounts}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {acc.mobile_number}
                        {acc.role === 'admin' && (
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            {t.statusLocked}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {t.statusActive}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {acc.has_active_recovery_code ? (
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
                        {acc.has_pending_recovery_request ? (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {accounts.map((acc) => (
                <div key={acc.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {acc.mobile_number}
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
                      <span className={acc.has_active_recovery_code ? "text-emerald-700 font-medium" : "text-amber-600"}>
                        {acc.has_active_recovery_code ? t.codeConfigured : t.codeNotConfigured}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t.colPendingRequest}</span>
                      {acc.has_pending_recovery_request ? (
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
                </div>
              ))}
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
    </div>
  );
};
