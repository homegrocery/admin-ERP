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
  ShieldCheck
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
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

  const [selectedForApproval, setSelectedForApproval] = useState<RecoveryRequestItem | null>(null);
  const [selectedForRejection, setSelectedForRejection] = useState<RecoveryRequestItem | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRecoveryRequests({
        page,
        limit: 15,
        status: statusFilter
      });
      setRequests(res.requests || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load recovery requests');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Controls Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.recoveryTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.recoverySubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {t.filterStatus}: <strong className="font-mono text-brand-600">{total}</strong>
            </span>
            <button
              onClick={fetchRequests}
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
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
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
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
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

                  {req.status === 'PENDING' && (
                    <div className="pt-2 flex gap-2">
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

      {/* Modals */}
      {selectedForApproval && (
        <ApproveModal
          request={selectedForApproval}
          lang={lang}
          onClose={() => setSelectedForApproval(null)}
          onSuccess={() => {
            fetchRequests();
          }}
        />
      )}

      {selectedForRejection && (
        <RejectModal
          request={selectedForRejection}
          lang={lang}
          onClose={() => setSelectedForRejection(null)}
          onSuccess={() => {
            fetchRequests();
          }}
        />
      )}
    </div>
  );
};
