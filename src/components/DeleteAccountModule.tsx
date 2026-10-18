import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  UserX,
  Search,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import type { AccountMetadata, DeletionResult } from '../types/admin';

interface DeleteAccountModuleProps {
  lang: Language;
}

export const DeleteAccountModule: React.FC<DeleteAccountModuleProps> = ({ lang }) => {
  const t = adminTranslations[lang];

  // Accounts list state
  const [accounts, setAccounts] = useState<AccountMetadata[]>([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected account for deletion confirmation modal
  const [targetAccount, setTargetAccount] = useState<AccountMetadata | null>(null);

  // Double confirmation fields
  const [confirmMobile, setConfirmMobile] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');

  // Deletion operation state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionResult, setDeletionResult] = useState<DeletionResult | null>(null);

  const fetchAccounts = async (searchOverride?: string) => {
    setLoadingAccounts(true);
    setFetchError(null);
    try {
      const q = searchOverride !== undefined ? searchOverride.trim() : searchQuery.trim();
      const res = await adminApi.getAccounts({
        page: 1,
        limit: 100, // Load eligible accounts
        search: q || undefined
      });
      setAccounts(res.accounts || []);
      setTotalAccounts(res.total || 0);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load user accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAccounts(searchQuery);
  };

  const handleSelectTarget = (account: AccountMetadata) => {
    // Owner is strictly protected
    if (account.role === 'admin' || account.mobile_number === '9356755100') {
      return;
    }
    setTargetAccount(account);
    setConfirmMobile('');
    setConfirmPhrase('');
    setDeleteError(null);
  };

  const handleCloseModal = () => {
    setTargetAccount(null);
    setConfirmMobile('');
    setConfirmPhrase('');
    setDeleteError(null);
  };

  const isOwner = (acc: AccountMetadata) =>
    acc.role === 'admin' || acc.mobile_number === '9356755100';

  const isDoubleConfirmed =
    targetAccount &&
    !isOwner(targetAccount) &&
    confirmMobile.trim() === targetAccount.mobile_number &&
    confirmPhrase.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!targetAccount || !isDoubleConfirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await adminApi.deleteAccount(
        targetAccount.id,
        confirmMobile.trim(),
        confirmPhrase.trim()
      );
      setDeletionResult(res);
      setTargetAccount(null);
      // Immediately refresh the account list so deleted user disappears from table
      await fetchAccounts();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetSuccess = () => {
    setDeletionResult(null);
    setTargetAccount(null);
    setConfirmMobile('');
    setConfirmPhrase('');
    setDeleteError(null);
    fetchAccounts();
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Danger Zone Warning Banner */}
      <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-950 uppercase tracking-wide">
              {t.dangerBannerTitle}
            </h3>
            <p className="text-xs text-rose-900 mt-1 leading-relaxed">
              {t.dangerBannerText}
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-rose-600" />
              {t.deleteModuleTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t.deleteModuleSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {t.totalAccounts}: <strong className="font-mono text-rose-600">{totalAccounts}</strong>
            </span>
            <button
              onClick={() => fetchAccounts()}
              disabled={loadingAccounts}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title={t.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${loadingAccounts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Deletion Success Banner */}
        {deletionResult && (
          <div className="my-6 p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-emerald-950">
                  {t.deleteSuccessTitle}
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {t.deletedAccountId}: <strong className="font-mono select-all">{deletionResult.deletedAccountId}</strong>
                </p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  {t.confirmationId}: {deletionResult.confirmationId}
                </p>
              </div>
              <button
                onClick={handleResetSuccess}
                className="p-1 text-slate-400 hover:text-slate-600"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deletionResult.cascadedTables && (
              <div className="bg-white/80 border border-emerald-200 rounded-xl p-3.5">
                <h5 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  {t.cascadedRecordsDeleted}
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.entries(deletionResult.cascadedTables).map(([table, count]) => (
                    <div key={table} className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100 font-mono">
                      <span className="text-slate-500 block text-[10px]">{table}</span>
                      <strong className="text-emerald-900">{count} purged</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleResetSuccess}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.btnResetDeletionForm}</span>
            </button>
          </div>
        )}

        {/* Section 1: Search Eligible Accounts */}
        <div className="pt-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchDeletePlaceholder}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loadingAccounts}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            >
              {loadingAccounts ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{lang === 'mr' ? 'शोधा' : 'Search'}</span>}
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchAccounts('');
                }}
                className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                {lang === 'mr' ? 'रीसेट' : 'Clear'}
              </button>
            )}
          </form>

          {fetchError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{fetchError}</span>
              </div>
              <button
                onClick={() => fetchAccounts()}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition"
              >
                {t.retryBtn}
              </button>
            </div>
          )}

          {/* Section 2: Eligible Accounts List / Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t.eligibleAccountsTitle}
              </h3>
              <span className="text-[11px] text-slate-400">
                {t.eligibleAccountsSubtitle}
              </span>
            </div>

            {loadingAccounts ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
                <span className="text-xs">{t.loading}</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                {t.noEligibleAccounts}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">{t.colMobile}</th>
                      <th className="py-3 px-4">{t.ownerNameLabel}</th>
                      <th className="py-3 px-4">{t.colUserId}</th>
                      <th className="py-3 px-4">{t.colStatus}</th>
                      <th className="py-3 px-4">{t.colCreated}</th>
                      <th className="py-3 px-4 text-right">{t.colAction}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((acc) => {
                      const ownerProtected = isOwner(acc);
                      return (
                        <tr
                          key={acc.id}
                          className={`hover:bg-slate-50/80 transition ${
                            ownerProtected ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {acc.mobile_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {acc.username || (acc as any).full_name || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            <span title={acc.id}>
                              {acc.id.slice(0, 8)}...{acc.id.slice(-4)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ownerProtected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <ShieldCheck className="w-3 h-3 text-amber-600" />
                                {t.ownerProtectedBadge}
                              </span>
                            ) : acc.is_locked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                {t.statusLocked}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                {t.statusActive}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(acc.created_at)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {ownerProtected ? (
                              <span className="text-[11px] font-medium text-slate-400 italic">
                                {lang === 'mr' ? 'संरक्षित' : 'Protected'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectTarget(acc)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>{t.selectForDeletion}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Deletion Confirmation Modal Dialog */}
      {targetAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <h4>{t.deleteModalTitle}</h4>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={deleting}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                title={t.closeModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Account Summary Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                {t.selectedAccountSummary}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">{t.colMobile}</span>
                  <strong className="text-sm font-mono text-slate-900">{targetAccount.mobile_number}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{t.ownerNameLabel}</span>
                  <strong className="text-slate-800">{targetAccount.username || (targetAccount as any).full_name || '-'}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">{t.colUserId}</span>
                  <span className="font-mono text-slate-700 select-all break-all">{targetAccount.id}</span>
                </div>
              </div>
            </div>

            {/* Irreversible Action Warning */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed font-medium">
              {lang === 'mr'
                ? 'हे खाते हटवल्याने वापरकर्त्याच्या सर्व किराणा याद्या, वस्तू, वर्गवारी आणि ऑथेंटिकेशन नोंदी कायमच्या नष्ट होतील.'
                : 'Deleting this account will permanently erase all grocery lists, items, and credentials. This action cannot be reversed.'}
            </div>

            {/* Double Confirmation Inputs */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{t.doubleConfirmTitle}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.confirmMobileLabel}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={confirmMobile}
                  onChange={(e) => setConfirmMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder={targetAccount.mobile_number}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.confirmPhraseLabel}
                </label>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="DELETE"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 font-medium">
                {deleteError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={deleting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                disabled={!isDoubleConfirmed || deleting}
                onClick={handleDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.deletingAccount}</span>
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    <span>{t.btnDeletePermanently}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
