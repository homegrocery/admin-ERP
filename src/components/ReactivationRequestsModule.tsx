import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  Filter
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import type { ReactivationRequestItem } from '../types/admin';

interface ReactivationRequestsModuleProps {
  lang: Language;
}

export const ReactivationRequestsModule: React.FC<ReactivationRequestsModuleProps> = ({ lang }) => {
  const isMarathi = lang === 'mr';
  const t = adminTranslations[lang];

  const [requests, setRequests] = useState<ReactivationRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Approval Modal State
  const [targetApproveRequest, setTargetApproveRequest] = useState<ReactivationRequestItem | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);

  // Rejection Modal State
  const [targetRejectRequest, setTargetRejectRequest] = useState<ReactivationRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getReactivationRequests({
        page,
        limit,
        status: statusFilter
      });
      setRequests(res.requests || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load reactivation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const handleApprove = async () => {
    if (!targetApproveRequest) return;
    setApproveLoading(true);
    setError(null);
    try {
      await adminApi.approveReactivationRequest(targetApproveRequest.id, approveNotes.trim() || undefined);
      setSuccessMessage(
        isMarathi
          ? 'खाते पुन्हा सुरू करण्याची विनंती मंजूर झाली असून खाते सक्रिय करण्यात आले आहे!'
          : 'Reactivation request approved and user account activated successfully!'
      );
      setTargetApproveRequest(null);
      setApproveNotes('');
      await fetchRequests();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!targetRejectRequest) return;
    setRejectLoading(true);
    setError(null);
    try {
      await adminApi.rejectReactivationRequest(targetRejectRequest.id, rejectReason.trim() || undefined);
      setSuccessMessage(
        isMarathi
          ? 'खाते पुन्हा सुरू करण्याची विनंती नाकारण्यात आली आहे.'
          : 'Reactivation request has been rejected.'
      );
      setTargetRejectRequest(null);
      setRejectReason('');
      await fetchRequests();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setRejectLoading(false);
    }
  };

  const formatDate = (isoStr: string | null | undefined) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isMarathi ? 'खाते पुन्हा सक्रिय करण्याच्या विनंत्या' : 'Account Reactivation Requests'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMarathi
                ? '५ अयशस्वी लॉगिन प्रयत्नांमुळे किंवा प्रशासकीय कारणास्तव लॉक केलेल्या वापरकर्त्यांच्या विनंत्या मंजूर किंवा नाकारा'
                : 'Review, approve and unlock accounts that were automatically or administratively locked'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {isMarathi ? 'एकूण विनंत्या: ' : 'Total: '} <strong className="font-mono text-brand-600">{total}</strong>
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

        {/* Filter Bar */}
        <div className="mt-4 flex items-center gap-3">
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
              <option value="PENDING">{isMarathi ? 'प्रलंबित (Pending Only)' : 'Pending Review Only'}</option>
              <option value="APPROVED">{isMarathi ? 'मंजूर (Approved)' : 'Approved'}</option>
              <option value="REJECTED">{isMarathi ? 'नाकारले (Rejected)' : 'Rejected'}</option>
              <option value="ALL">{isMarathi ? 'सर्व (All Requests)' : 'All Requests'}</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        {loading && requests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
            <span>{t.loading}</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>{isMarathi ? 'कोणतीही विनंती आढळली नाही.' : 'No reactivation requests found for this filter.'}</p>
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-y border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{isMarathi ? 'मोबाईल नंबर व नाव' : 'User / Mobile'}</th>
                    <th className="py-3 px-4">{isMarathi ? 'विनंती दिनांक' : 'Request Time'}</th>
                    <th className="py-3 px-4">{isMarathi ? 'लॉक कारण' : 'Lock Reason & Type'}</th>
                    <th className="py-3 px-4">{isMarathi ? 'स्थिती' : 'Status'}</th>
                    <th className="py-3 px-4">{isMarathi ? 'प्रशासक नोंद' : 'Review Notes'}</th>
                    <th className="py-3 px-4 text-right">{isMarathi ? 'कृती' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{req.mobile_number}</div>
                        <div className="text-[11px] text-slate-500">{req.user_full_name || '—'}</div>
                        {req.reason && (
                          <div className="text-[11px] text-slate-600 italic mt-0.5 max-w-xs truncate" title={req.reason}>
                            "{req.reason}"
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold mb-1 ${
                          req.lock_type === 'ADMINISTRATIVE'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {req.lock_type || 'AUTOMATIC'}
                        </span>
                        <div className="text-xs text-slate-700 truncate max-w-xs" title={req.lock_reason || ''}>
                          {req.lock_reason || (isMarathi ? '५ अयशस्वी प्रयत्न' : '5 failed attempts')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          req.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {req.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                          {req.status === 'APPROVED' && <Check className="w-3 h-3 text-emerald-600" />}
                          {req.status === 'REJECTED' && <X className="w-3 h-3 text-rose-600" />}
                          <span>{req.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate" title={req.admin_notes || ''}>
                        {req.admin_notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetApproveRequest(req);
                                setApproveNotes('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isMarathi ? 'मंजूर करा' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetRejectRequest(req);
                                setRejectReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{isMarathi ? 'नाकारा' : 'Reject'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {isMarathi ? 'प्रक्रिया पूर्ण' : 'Processed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-xl">
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
      {targetApproveRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isMarathi ? 'खाते पुन्हा सक्रिय करणे मंजूर करा' : 'Approve Reactivation Request'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMarathi
                    ? 'वापरकर्त्याचे खाते अनलॉक होईल आणि ते सामान्यपणे लॉगिन करू शकतील'
                    : 'This will unlock the user account and reset failed login attempts.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t.colMobile}:</span>
                <span className="font-mono font-bold text-slate-800">{targetApproveRequest.mobile_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isMarathi ? 'वापरकर्ता:' : 'User:'}</span>
                <span className="font-medium text-slate-800">{targetApproveRequest.user_full_name || '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMarathi ? 'प्रशासक पुनरावलोकन नोंद (ऐच्छिक)' : 'Administrator Notes (Optional)'}
              </label>
              <textarea
                rows={2}
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder={isMarathi ? 'उदा. फोनवरून ओळख पडताळली...' : 'e.g. Identity verified over phone call...'}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetApproveRequest(null)}
                disabled={approveLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                {approveLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isMarathi ? 'मंजूर करा व अनलॉक करा' : 'Approve & Unlock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {targetRejectRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isMarathi ? 'विनंती नाकारा' : 'Reject Reactivation Request'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMarathi
                    ? 'खाते लॉक राहील आणि वापरकर्ता लॉगिन करू शकणार नाही'
                    : 'The account will remain locked and the request marked as rejected.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t.colMobile}:</span>
                <span className="font-mono font-bold text-slate-800">{targetRejectRequest.mobile_number}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMarathi ? 'नाकारण्याचे कारण' : 'Rejection Reason'}
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={isMarathi ? 'उदा. सुरक्षा पडताळणी अयशस्वी...' : 'e.g. Identity verification failed...'}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetRejectRequest(null)}
                disabled={rejectLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                {rejectLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isMarathi ? 'विनंती नाकारा' : 'Reject Request'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
