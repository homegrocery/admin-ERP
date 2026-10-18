import React, { useState } from 'react';
import { XCircle, Loader2, X } from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import type { RecoveryRequestItem } from '../types/admin';

interface RejectModalProps {
  request: RecoveryRequestItem;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  request,
  lang,
  onClose,
  onSuccess
}) => {
  const t = adminTranslations[lang];
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(lang === 'mr' ? 'कृपया नाकारण्याचे कारण प्रविष्ट करा.' : 'Please provide a rejection reason.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await adminApi.rejectRecoveryRequest(request.id, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold">{t.rejectModalTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block uppercase font-semibold">
                {t.colReqMobile}
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {request.mobile_number}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {request.status}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {t.rejectReasonLabel} *
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.rejectReasonPlaceholder}
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.rejectingRequest}</span>
                </>
              ) : (
                <span>{t.btnSubmitReject}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
