import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Copy,
  Clock,
  Loader2,
  X
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import type { RecoveryRequestItem, VerificationMethod, ApprovedRecoveryResult } from '../types/admin';

interface ApproveModalProps {
  request: RecoveryRequestItem;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApproveModal: React.FC<ApproveModalProps> = ({
  request,
  lang,
  onClose,
  onSuccess
}) => {
  const t = adminTranslations[lang];
  const [method, setMethod] = useState<VerificationMethod>('PHONE_CALL');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApprovedRecoveryResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) {
      setError(lang === 'mr' ? 'कृपया पडताळणी पद्धत निवडा.' : 'Please select a verification method.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await adminApi.approveRecoveryRequest(request.id, method, notes);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!result?.temporaryCode) return;
    navigator.clipboard.writeText(result.temporaryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold">{t.approveModalTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Requester Info */}
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

              {/* Security Mandate Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{t.approveNotice}</p>
              </div>

              {/* Verification Method Selector (Mandatory) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  {t.selectVerificationMethod} *
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'PHONE_CALL', label: t.methodPhoneCall },
                    { id: 'IN_PERSON', label: t.methodInPerson },
                    { id: 'SECURE_CHANNEL', label: t.methodSecureChannel },
                    { id: 'OWNER_VERIFIED', label: t.methodOwnerVerified },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                        method === item.id
                          ? 'bg-brand-50 border-brand-500 text-brand-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="verificationMethod"
                        value={item.id}
                        checked={method === item.id}
                        onChange={() => setMethod(item.id as VerificationMethod)}
                        className="mt-0.5 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.verificationNotesLabel}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.verificationNotesPlaceholder}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
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
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.generatingCode}</span>
                    </>
                  ) : (
                    <span>{t.btnSubmitApproval}</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Result Screen: Display Temporary Code */
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  {t.temporaryCodeTitle}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {t.temporaryCodeNotice}
                </p>
              </div>

              {/* Code Display Card */}
              <div className="p-4 bg-slate-900 rounded-2xl text-center space-y-2 border border-slate-800 shadow-inner">
                <span className="text-[11px] text-emerald-400 font-semibold tracking-wider uppercase block">
                  TEMPORARY RECOVERY CODE
                </span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider select-all py-1">
                  {result.temporaryCode}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.codeExpiresIn} {new Date(result.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? t.codeCopied : t.copyCode}</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {t.btnClose}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
