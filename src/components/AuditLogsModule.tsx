import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  UserX,
  LogIn,
  LogOut,
  AlertOctagon
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import type { AuditLogItem } from '../types/admin';

interface AuditLogsModuleProps {
  lang: Language;
}

export const AuditLogsModule: React.FC<AuditLogsModuleProps> = ({ lang }) => {
  const t = adminTranslations[lang];
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAuditLogs({
        page,
        limit: 20,
        action: actionFilter || undefined,
        search: search.trim() || undefined
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
          <LogIn className="w-3 h-3 text-emerald-600" />
          {action}
        </span>
      );
    }
    if (action.includes('LOGOUT')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
          <LogOut className="w-3 h-3 text-slate-500" />
          {action}
        </span>
      );
    }
    if (action.includes('APPROVE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
          <KeyRound className="w-3 h-3 text-blue-600" />
          {action}
        </span>
      );
    }
    if (action.includes('REJECT')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
          <AlertOctagon className="w-3 h-3 text-amber-600" />
          {action}
        </span>
      );
    }
    if (action.includes('DELETE') || action.includes('UNAUTHORIZED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
          <UserX className="w-3 h-3 text-rose-600" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
        {action}
      </span>
    );
  };

  const renderDetails = (details: string | null) => {
    if (!details) return <span className="text-slate-400">—</span>;
    try {
      const parsed = JSON.parse(details);
      return (
        <div className="font-mono text-[11px] text-slate-600 max-w-xs truncate" title={JSON.stringify(parsed, null, 2)}>
          {Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ')}
        </div>
      );
    } catch {
      return <span className="font-mono text-[11px] text-slate-600">{details}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Append-Only Cryptographic Badge */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white">
              {t.auditProtectedBadge}
            </h4>
            <p className="text-[11px] text-slate-400">
              {t.auditSubtitle}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 bg-emerald-950/60 rounded-full border border-emerald-800/40">
          {total} Records
        </span>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.auditTitle}</h2>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title={t.refresh}
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'mr' ? 'मोबाईल किंवा कृतीने शोधा...' : 'Search by mobile, admin or action...'}
              className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
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
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t.allActions}</option>
              <option value="ADMIN_LOGIN">{t.actionLogin}</option>
              <option value="ADMIN_LOGOUT">{t.actionLogout}</option>
              <option value="APPROVE_RECOVERY">{t.actionApprove}</option>
              <option value="REJECT_RECOVERY">{t.actionReject}</option>
              <option value="ACCOUNT_DELETE">{t.actionDelete}</option>
              <option value="UNAUTHORIZED_ADMIN_ATTEMPT">{t.actionUnauthorized}</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Logs Table / Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-brand-600" />
            <span>{t.loading}</span>
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400">
            {t.noAuditLogsFound}
          </div>
        )}

        {!loading && logs.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">{t.colTimestamp}</th>
                    <th className="py-3 px-4">{t.colAction}</th>
                    <th className="py-3 px-4">{t.colTargetMobile}</th>
                    <th className="py-3 px-4">{t.colAdmin}</th>
                    <th className="py-3 px-4">{t.colDetails}</th>
                    <th className="py-3 px-4">{t.colIp}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {log.target_mobile_number || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.admin_user_id ? log.admin_user_id.substring(0, 8) + '...' : 'System'}
                      </td>
                      <td className="py-3 px-4">
                        {renderDetails(log.details)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    {getActionBadge(log.action)}
                    <span className="font-mono text-[10px] text-slate-400">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-mono font-bold text-slate-900">
                      {log.target_mobile_number || 'No Target'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {log.ip_address}
                    </span>
                  </div>

                  {log.details && (
                    <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 font-mono">
                      {renderDetails(log.details)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
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
