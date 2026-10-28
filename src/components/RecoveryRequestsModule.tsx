import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import { refreshCoordinator } from '../services/refreshCoordinator';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { ApproveModal } from './ApproveModal';
import { RejectModal } from './RejectModal';
import type { RecoveryRequestItem, RecoveryRequestStatus } from '../types/admin';

interface RecoveryRequestsModuleProps {
  lang: Language;
}

export const RecoveryRequestsModule: React.FC<RecoveryRequestsModuleProps> = ({ lang }) => {
  const t = adminTranslations[lang];
  const [requests, setRequests] = useState<RecoveryRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RecoveryRequestStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals for approve / reject
  const [selectedForApproval, setSelectedForApproval] = useState<RecoveryRequestItem | null>(null);
  const [selectedForRejection, setSelectedForRejection] = useState<RecoveryRequestItem | null>(null);

  // Single Delete State
  const [selectedForDeletion, setSelectedForDeletion] = useState<RecoveryRequestItem | null>(null);
  const [singleDeleting, setSingleDeleting] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);

  // Bulk Delete State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkConfirmPhrase, setBulkConfirmPhrase] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Feedback Toast
  const [actionToast, setActionToast] = useState<string | null>(null);

  const fetchRequests = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    if (!isBackground) setError(null);
    try {
      const res = await adminApi.getRecoveryRequests({
        page,
        limit: 15,
        status: statusFilter
      });
      setRequests(res.requests || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);

      // Safe UX: Remote conflict detection if approve/reject modal is open
      if (selectedForApproval) {
        const remoteItem = (res.requests || []).find(r => r.id === selectedForApproval.id);
        if (remoteItem && remoteItem.status !== 'PENDING') {
          setSelectedForApproval(remoteItem);
          setError(t.concurrentConflictWarning);
        }
      }
      if (selectedForRejection) {
        const remoteItem = (res.requests || []).find(r => r.id === selectedForRejection.id);
        if (remoteItem && remoteItem.status !== 'PENDING') {
          setSelectedForRejection(remoteItem);
          setError(t.concurrentConflictWarning);
        }
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message || 'Failed to load recovery requests');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Build 9 Phase 1.5: Universal Change-Based Auto-Refresh
  useAutoRefresh('recovery', () => {
    fetchRequests(true);
  });

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const formatDate = (isoStr: string) => {
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

  const maskMobile = (mobile: string) => {
    if (!mobile) return '—';
    if (mobile.length <= 4) return mobile;
    if (mobile.length >= 10) {
      return `${mobile.slice(0, 3)}****${mobile.slice(-3)}`;
    }
    return `${mobile.slice(0, 2)}***${mobile.slice(-2)}`;
  };

  const handleSingleDelete = async () => {
    if (!selectedForDeletion) return;
    setSingleDeleting(true);
    setSingleError(null);
    try {
      await adminApi.deleteRecoveryRequest(selectedForDeletion.id);
      setSelectedForDeletion(null);
      setActionToast(t.deleteRecoverySuccess);
      setTimeout(() => setActionToast(null), 4000);
      await fetchRequests();
      refreshCoordinator.triggerImmediateCheck();
    } catch (err: any) {
      setSingleError(err.message || 'Failed to delete recovery request');
    } finally {
      setSingleDeleting(false);
    }
  };

  const handleBulkDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkConfirmPhrase.trim() !== 'DELETE ALL RECOVERY REQUESTS') {
      setBulkError(
        lang === 'mr'
          ? 'कृपया अचूक शब्द "DELETE ALL RECOVERY REQUESTS" टाइप करा'
          : 'Please type the exact phrase "DELETE ALL RECOVERY REQUESTS"'
      );
      return;
    }

    setBulkDeleting(true);
    setBulkError(null);
    try {
      const res = await adminApi.bulkDeleteRecoveryRequests(bulkConfirmPhrase.trim());
      setShowBulkModal(false);
      setBulkConfirmPhrase('');
      setActionToast(
        t.bulkDeleteRecoverySuccess.replace('{count}', String(res.deletedCount ?? res.count ?? 0))
      );
      setTimeout(() => setActionToast(null), 5000);
      setPage(1);
      await fetchRequests();
      refreshCoordinator.triggerImmediateCheck();
    } catch (err: any) {
      setBulkError(err.message || 'Failed to bulk delete recovery requests');
    } finally {
      setBulkDeleting(false);
    }
  };

  const getStatusBadge = (status: RecoveryRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" />
            {t.reqStatusPending}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t.reqStatusApproved}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            {t.reqStatusRejected}
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            {t.reqStatusExpired}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            {t.reqStatusCompleted}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {actionToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.recoveryTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.recoverySubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {t.filterStatus}: <strong className="font-mono text-brand-600">{total}</strong>
            </span>

            {/* Bulk Delete All Recovery Requests Permanently */}
            <button
              type="button"
              onClick={() => {
                setBulkConfirmPhrase('');
                setBulkError(null);
                setShowBulkModal(true);
              }}
              disabled={loading || total === 0}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title={t.btnDeleteAllRecoveryRequests}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.btnDeleteAllRecoveryRequests}</span>
            </button>

            <button
              onClick={() => fetchRequests()}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title={t.refresh}
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mt-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">{t.reqStatusAll}</option>
            <option value="PENDING">{t.reqStatusPending}</option>
            <option value="APPROVED">{t.reqStatusApproved}</option>
            <option value="REJECTED">{t.reqStatusRejected}</option>
            <option value="EXPIRED">{t.reqStatusExpired}</option>
            <option value="COMPLETED">{t.reqStatusCompleted}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Requests Table / Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-brand-600" />
            <span>{t.loading}</span>
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400">
            {t.noRequestsFound}
          </div>
        )}

        {!loading && requests.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">{t.colReqMobile}</th>
                    <th className="py-3 px-4">{t.colReqTime}</th>
                    <th className="py-3 px-4">{t.colReqStatus}</th>
                    <th className="py-3 px-4">{t.colReqVerification}</th>
                    <th className="py-3 px-4">{t.colReqFailedAttempts}</th>
                    <th className="py-3 px-4 text-right">{t.colReqActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {req.mobile_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {req.verification_method || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {req.failed_attempts} / 4
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => setSelectedForApproval(req)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                              >
                                {t.btnVerifyApprove}
                              </button>
                              <button
                                onClick={() => setSelectedForRejection(req)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
                              >
                                {t.btnReject}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedForDeletion(req);
                              setSingleError(null);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
                            title={t.deleteRecoveryTooltip}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {requests.map((req) => (
                <div key={req.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {req.mobile_number}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>

                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>{formatDate(req.created_at)}</span>
                    <span className="font-mono">{req.failed_attempts}/4 attempts</span>
                  </div>

                  {req.verification_method && (
                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-400">{t.colReqVerification}: </span>
                      <span className="font-mono font-medium">{req.verification_method}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap gap-2">
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => setSelectedForApproval(req)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold text-center transition"
                        >
                          {t.btnVerifyApprove}
                        </button>
                        <button
                          onClick={() => setSelectedForRejection(req)}
                          className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
                        >
                          {t.btnReject}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedForDeletion(req);
                        setSingleError(null);
                      }}
                      className={`py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${req.status !== 'PENDING' ? 'w-full' : ''}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.btnDeleteRecoveryRequest}</span>
                    </button>
                  </div>
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

      {/* Approve Modal */}
      {selectedForApproval && (
        <ApproveModal
          request={selectedForApproval}
          lang={lang}
          onClose={() => setSelectedForApproval(null)}
          onSuccess={() => {
            fetchRequests();
            refreshCoordinator.triggerImmediateCheck();
          }}
        />
      )}

      {/* Reject Modal */}
      {selectedForRejection && (
        <RejectModal
          request={selectedForRejection}
          lang={lang}
          onClose={() => setSelectedForRejection(null)}
          onSuccess={() => {
            fetchRequests();
            refreshCoordinator.triggerImmediateCheck();
          }}
        />
      )}

      {/* Single Delete Confirmation Modal */}
      {selectedForDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4>{t.deleteRecoveryModalTitle}</h4>
              </div>
              <button
                onClick={() => setSelectedForDeletion(null)}
                disabled={singleDeleting}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identifying Information */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.targetMobileLabel}:</span>
                <span className="font-mono font-bold text-slate-900">
                  {maskMobile(selectedForDeletion.mobile_number)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.requestIdLabel}:</span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {selectedForDeletion.id.substring(0, 12)}...
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.requestStatusLabel}:</span>
                <div>{getStatusBadge(selectedForDeletion.status)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t.colReqTime}:</span>
                <span className="text-slate-700">{formatDate(selectedForDeletion.created_at)}</span>
              </div>
            </div>

            {/* Warning Text */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed font-medium">
              {t.deleteRecoveryWarning}
            </div>

            {/* Error Message */}
            {singleError && (
              <div className="p-3 bg-rose-100 text-rose-800 text-xs rounded-lg font-semibold">
                {singleError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedForDeletion(null)}
                disabled={singleDeleting}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleSingleDelete}
                disabled={singleDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                {singleDeleting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{t.btnConfirmDeleteRecovery}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4>{t.deleteAllRecoveryModalTitle}</h4>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                disabled={bulkDeleting}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Text */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed font-medium">
              {t.deleteAllRecoveryWarning.replace('{count}', String(total))}
            </div>

            {/* Error Message */}
            {bulkError && (
              <div className="p-3 bg-rose-100 text-rose-800 text-xs rounded-lg font-semibold">
                {bulkError}
              </div>
            )}

            {/* Confirmation Form */}
            <form onSubmit={handleBulkDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t.confirmPhraseBulkRecoveryLabel}
                </label>
                <input
                  type="text"
                  value={bulkConfirmPhrase}
                  onChange={(e) => setBulkConfirmPhrase(e.target.value)}
                  placeholder="DELETE ALL RECOVERY REQUESTS"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  disabled={bulkDeleting}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    bulkDeleting ||
                    bulkConfirmPhrase.trim() !== 'DELETE ALL RECOVERY REQUESTS'
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  {bulkDeleting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.btnConfirmBulkDeleteRecovery}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
