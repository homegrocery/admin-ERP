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
  AlertOctagon,
  Trash2,
  Archive,
  X,
  AlertTriangle,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import type { AuditLogItem } from '../types/admin';
import { formatAuditTimestamp } from '../utils/dateUtils';

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
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Single Archive State (Active tab)
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Bulk Archive Modal State (Active tab)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkConfirmPhrase, setBulkConfirmPhrase] = useState('');
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Single Permanent Delete State (Archived tab)
  const [selectedForArchivedDeletion, setSelectedForArchivedDeletion] = useState<AuditLogItem | null>(null);
  const [singleDeletingArchived, setSingleDeletingArchived] = useState(false);
  const [singleArchivedError, setSingleArchivedError] = useState<string | null>(null);

  // Bulk Permanent Delete Modal State (Archived tab)
  const [showBulkArchivedDeleteModal, setShowBulkArchivedDeleteModal] = useState(false);
  const [bulkArchivedConfirmPhrase, setBulkArchivedConfirmPhrase] = useState('');
  const [bulkArchivedDeleting, setBulkArchivedDeleting] = useState(false);
  const [bulkArchivedError, setBulkArchivedError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAuditLogs({
        page,
        limit: 20,
        action: actionFilter || undefined,
        search: search.trim() || undefined,
        showArchived: activeTab === 'archived'
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
  }, [page, actionFilter, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleArchiveSingle = async (logId: string) => {
    setArchivingId(logId);
    setError(null);
    try {
      await adminApi.archiveAuditLog(logId);
      setActionToast(t.archiveSuccessToast);
      setTimeout(() => setActionToast(null), 4000);
      await fetchLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to archive audit log entry');
    } finally {
      setArchivingId(null);
    }
  };

  const handleBulkArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkConfirmPhrase.trim() !== 'DELETE ALL AUDIT LOGS') {
      setBulkError(
        lang === 'mr'
          ? 'कृपया अचूक शब्द "DELETE ALL AUDIT LOGS" टाइप करा'
          : 'Please type the exact phrase "DELETE ALL AUDIT LOGS"'
      );
      return;
    }

    setBulkArchiving(true);
    setBulkError(null);
    try {
      const res = await adminApi.bulkArchiveAuditLogs(bulkConfirmPhrase.trim());
      setShowBulkModal(false);
      setBulkConfirmPhrase('');
      setActionToast(
        `${t.bulkArchiveSuccess} (${res.count || 0} ${lang === 'mr' ? 'नोंदी' : 'entries'})`
      );
      setTimeout(() => setActionToast(null), 5000);
      setPage(1);
      await fetchLogs();
    } catch (err: any) {
      setBulkError(err.message || 'Failed to bulk archive audit logs');
    } finally {
      setBulkArchiving(false);
    }
  };

  const handleSingleDeleteArchived = async () => {
    if (!selectedForArchivedDeletion) return;
    setSingleDeletingArchived(true);
    setSingleArchivedError(null);
    try {
      await adminApi.deleteArchivedAuditLog(selectedForArchivedDeletion.id);
      setSelectedForArchivedDeletion(null);
      setActionToast(t.deleteArchivedLogSuccess);
      setTimeout(() => setActionToast(null), 4000);
      await fetchLogs();
    } catch (err: any) {
      setSingleArchivedError(err.message || 'Failed to delete archived audit log');
    } finally {
      setSingleDeletingArchived(false);
    }
  };

  const handleBulkDeleteArchivedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkArchivedConfirmPhrase.trim() !== 'DELETE ALL ARCHIVED LOGS') {
      setBulkArchivedError(
        lang === 'mr'
          ? 'कृपया अचूक शब्द "DELETE ALL ARCHIVED LOGS" टाइप करा'
          : 'Please type the exact phrase "DELETE ALL ARCHIVED LOGS"'
      );
      return;
    }

    setBulkArchivedDeleting(true);
    setBulkArchivedError(null);
    try {
      const res = await adminApi.bulkDeleteArchivedAuditLogs(bulkArchivedConfirmPhrase.trim());
      setShowBulkArchivedDeleteModal(false);
      setBulkArchivedConfirmPhrase('');
      setActionToast(
        t.bulkDeleteArchivedLogsSuccess.replace(
          '{count}',
          String(res.deletedCount ?? res.count ?? 0)
        )
      );
      setTimeout(() => setActionToast(null), 5000);
      setPage(1);
      await fetchLogs();
    } catch (err: any) {
      setBulkArchivedError(err.message || 'Failed to bulk delete archived audit logs');
    } finally {
      setBulkArchivedDeleting(false);
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
    if (action.includes('ARCHIVE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
          <Archive className="w-3 h-3 text-indigo-600" />
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
        <div
          className="font-mono text-[11px] text-slate-600 max-w-xs truncate"
          title={JSON.stringify(parsed, null, 2)}
        >
          {Object.entries(parsed)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}
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
            <p className="text-[11px] text-slate-400">{t.auditSubtitle}</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 bg-emerald-950/60 rounded-full border border-emerald-800/40">
          {total} Records
        </span>
      </div>

      {/* Success Toast */}
      {actionToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">{t.auditTitle}</h2>

            {/* Active vs Archived Tab Pills */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('active');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeTab === 'active'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t.activeLogsTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('archived');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeTab === 'archived'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t.archivedLogsTab}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'active' && (
              <button
                type="button"
                onClick={() => {
                  setBulkConfirmPhrase('');
                  setBulkError(null);
                  setShowBulkModal(true);
                }}
                disabled={loading || total === 0}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title={t.btnDeleteAllAuditLogs}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.btnDeleteAllAuditLogs}</span>
              </button>
            )}

            {activeTab === 'archived' && (
              <button
                type="button"
                onClick={() => {
                  setBulkArchivedConfirmPhrase('');
                  setBulkArchivedError(null);
                  setShowBulkArchivedDeleteModal(true);
                }}
                disabled={loading || total === 0}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title={t.btnDeleteAllArchivedLogs}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.btnDeleteAllArchivedLogs}</span>
              </button>
            )}

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title={t.refresh}
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === 'mr'
                  ? 'मोबाईल किंवा कृतीने शोधा...'
                  : 'Search by mobile, admin or action...'
              }
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
              <option value="RECOVERY_REQUEST_DELETED">RECOVERY_REQUEST_DELETED</option>
              <option value="RECOVERY_REQUESTS_BULK_DELETED">RECOVERY_REQUESTS_BULK_DELETED</option>
              <option value="ACCOUNT_DELETED">{t.actionDelete}</option>
              <option value="ACCOUNTS_BULK_DELETED">ACCOUNTS_BULK_DELETED</option>
              <option value="AUDIT_LOG_ARCHIVED">AUDIT_LOG_ARCHIVED</option>
              <option value="AUDIT_LOGS_BULK_ARCHIVED">AUDIT_LOGS_BULK_ARCHIVED</option>
              <option value="ARCHIVED_AUDIT_LOG_DELETED">ARCHIVED_AUDIT_LOG_DELETED</option>
              <option value="ARCHIVED_AUDIT_LOGS_BULK_DELETED">ARCHIVED_AUDIT_LOGS_BULK_DELETED</option>
              <option value="UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT">{t.actionUnauthorized}</option>
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
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Inbox className="w-8 h-8 text-slate-300" />
            <span>{t.noAuditLogsFound}</span>
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
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => {
                    const rawTimestamp = log.created_at || log.timestamp;
                    const formattedDate = formatAuditTimestamp(rawTimestamp, lang);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {log.target_mobile_number || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {log.admin_name ||
                            (log.admin_user_id
                              ? log.admin_user_id.substring(0, 8) + '...'
                              : 'System')}
                        </td>
                        <td className="py-3 px-4">{renderDetails(log.details)}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {log.ip_address || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {activeTab === 'active' ? (
                            <button
                              type="button"
                              onClick={() => handleArchiveSingle(log.id)}
                              disabled={archivingId === log.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                              title={t.archiveLogTooltip}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{t.btnArchiveLog}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForArchivedDeletion(log);
                                setSingleArchivedError(null);
                              }}
                              disabled={singleDeletingArchived}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                              title={t.deleteArchivedLogTooltip}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{t.btnDeleteArchivedLog}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {logs.map((log) => {
                const rawTimestamp = log.created_at || log.timestamp;
                const formattedDate = formatAuditTimestamp(rawTimestamp, lang);

                return (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      {getActionBadge(log.action)}
                      <span className="font-mono text-[10px] text-slate-400">
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-mono font-bold text-slate-900">
                        {log.target_mobile_number || 'No Target'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">
                          {log.ip_address || '—'}
                        </span>
                        {activeTab === 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleArchiveSingle(log.id)}
                            disabled={archivingId === log.id}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title={t.archiveLogTooltip}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForArchivedDeletion(log);
                              setSingleArchivedError(null);
                            }}
                            disabled={singleDeletingArchived}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                            title={t.deleteArchivedLogTooltip}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t.btnDeleteArchivedLog}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {log.details && (
                      <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 font-mono">
                        {renderDetails(log.details)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t.pageOf
                    .replace('{current}', String(page))
                    .replace('{total}', String(totalPages))}
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

      {/* Bulk Archive Confirmation Modal (Active Logs) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <h4>{t.deleteAllAuditModalTitle}</h4>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                disabled={bulkArchiving}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Text */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed font-medium">
              {t.deleteAllAuditWarning}
            </div>

            {/* Error Message */}
            {bulkError && (
              <div className="p-3 bg-rose-100 text-rose-800 text-xs rounded-lg font-semibold">
                {bulkError}
              </div>
            )}

            {/* Confirmation Form */}
            <form onSubmit={handleBulkArchiveSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t.confirmPhraseBulkAuditLabel}
                </label>
                <input
                  type="text"
                  value={bulkConfirmPhrase}
                  onChange={(e) => setBulkConfirmPhrase(e.target.value)}
                  placeholder="DELETE ALL AUDIT LOGS"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  disabled={bulkArchiving}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    bulkArchiving ||
                    bulkConfirmPhrase.trim() !== 'DELETE ALL AUDIT LOGS'
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  {bulkArchiving && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.btnConfirmBulkArchiveAudit}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Permanent Delete Modal (Archived Logs) */}
      {selectedForArchivedDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4>{t.deleteArchivedLogModalTitle}</h4>
              </div>
              <button
                onClick={() => setSelectedForArchivedDeletion(null)}
                disabled={singleDeletingArchived}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identifying Information */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Log ID:</span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {selectedForArchivedDeletion.id.substring(0, 12)}...
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.colAction}:</span>
                <div>{getActionBadge(selectedForArchivedDeletion.action)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.colTargetMobile}:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedForArchivedDeletion.target_mobile_number || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.colAdmin}:</span>
                <span className="text-slate-700">
                  {selectedForArchivedDeletion.admin_name || selectedForArchivedDeletion.admin_user_id || 'System'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.colTimestamp}:</span>
                <span className="text-slate-700">
                  {formatAuditTimestamp(
                    selectedForArchivedDeletion.created_at || selectedForArchivedDeletion.timestamp,
                    lang
                  )}
                </span>
              </div>
            </div>

            {/* Warning Text */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed font-medium">
              {t.deleteArchivedLogWarning}
            </div>

            {/* Error Message */}
            {singleArchivedError && (
              <div className="p-3 bg-rose-100 text-rose-800 text-xs rounded-lg font-semibold">
                {singleArchivedError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedForArchivedDeletion(null)}
                disabled={singleDeletingArchived}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleSingleDeleteArchived}
                disabled={singleDeletingArchived}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                {singleDeletingArchived && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{t.btnConfirmDeleteArchivedLog}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Permanent Delete Modal (Archived Logs) */}
      {showBulkArchivedDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4>{t.deleteAllArchivedLogsModalTitle}</h4>
              </div>
              <button
                onClick={() => setShowBulkArchivedDeleteModal(false)}
                disabled={bulkArchivedDeleting}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Text */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed font-medium">
              {t.deleteAllArchivedLogsWarning.replace('{count}', String(total))}
            </div>

            {/* Error Message */}
            {bulkArchivedError && (
              <div className="p-3 bg-rose-100 text-rose-800 text-xs rounded-lg font-semibold">
                {bulkArchivedError}
              </div>
            )}

            {/* Confirmation Form */}
            <form onSubmit={handleBulkDeleteArchivedSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t.confirmPhraseBulkArchivedLogsLabel}
                </label>
                <input
                  type="text"
                  value={bulkArchivedConfirmPhrase}
                  onChange={(e) => setBulkArchivedConfirmPhrase(e.target.value)}
                  placeholder="DELETE ALL ARCHIVED LOGS"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkArchivedDeleteModal(false)}
                  disabled={bulkArchivedDeleting}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    bulkArchivedDeleting ||
                    bulkArchivedConfirmPhrase.trim() !== 'DELETE ALL ARCHIVED LOGS'
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  {bulkArchivedDeleting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.btnConfirmBulkDeleteArchivedLogs}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
