import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Rocket,
  Layers,
  Bell,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Loader2,
  X,
  RotateCcw,
  Activity,
  AlertTriangle,
  UploadCloud,
  Download,
  Terminal,
  Cpu,
  Check,
  Copy
} from 'lucide-react';
import { adminTranslations, type Language } from '../i18n/adminTranslations';
import { adminApi } from '../services/adminApi';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import type {
  WebsiteOverviewData,
  WebsiteContentData,
  PublicAnnouncementItem,
  ReleaseRecordItem
} from '../types/admin';

interface WebsiteReleaseControlModuleProps {
  lang: Language;
}

type SubTab = 'overview' | 'content' | 'announcements' | 'releases';

export const WebsiteReleaseControlModule: React.FC<WebsiteReleaseControlModuleProps> = ({ lang }) => {
  const t = adminTranslations[lang];
  const [subTab, setSubTab] = useState<SubTab>('overview');

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data States
  const [overview, setOverview] = useState<WebsiteOverviewData | null>(null);
  const [announcements, setAnnouncements] = useState<PublicAnnouncementItem[]>([]);
  const [releases, setReleases] = useState<ReleaseRecordItem[]>([]);
  const [activeRelease, setActiveRelease] = useState<ReleaseRecordItem | null>(null);

  // Content Form State
  const [contentForm, setContentForm] = useState<Partial<WebsiteContentData>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);

  // Modals
  const [showPublishContentModal, setShowPublishContentModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<PublicAnnouncementItem | null>(null);
  const [showStageReleaseModal, setShowStageReleaseModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackTargetRelease, setRollbackTargetRelease] = useState<ReleaseRecordItem | null>(null);

  // Build & Pipeline Modals (Build 9 Phase 4.5)
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [targetBuildRelease, setTargetBuildRelease] = useState<ReleaseRecordItem | null>(null);
  const [buildModeSelect, setBuildModeSelect] = useState<'LOCAL_DEBUG' | 'LOCAL_RELEASE' | 'CI_DISPATCH'>('LOCAL_DEBUG');

  const [showPublishReleaseModal, setShowPublishReleaseModal] = useState(false);
  const [targetPublishRelease, setTargetPublishRelease] = useState<ReleaseRecordItem | null>(null);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [activeLogsRelease, setActiveLogsRelease] = useState<ReleaseRecordItem | null>(null);
  const [activeLogsText, setActiveLogsText] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Announcement Form State
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementTitleMr, setAnnouncementTitleMr] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementContentMr, setAnnouncementContentMr] = useState('');
  const [announcementCategory, setAnnouncementCategory] = useState<'FEATURE' | 'MAINTENANCE' | 'SECURITY' | 'UPDATE' | 'POLICY'>('FEATURE');
  const [announcementStatus, setAnnouncementStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');

  // Release Form State
  const [relVersionName, setRelVersionName] = useState('1.0.2');
  const [relBuildNumber, setRelBuildNumber] = useState(9);
  const [relVersionCode, setRelVersionCode] = useState(16);
  const [relChannel, setRelChannel] = useState<'STABLE' | 'BETA'>('STABLE');
  const [relBuildMode, setRelBuildMode] = useState<'LOCAL_DEBUG' | 'LOCAL_RELEASE' | 'CI_DISPATCH'>('LOCAL_DEBUG');
  const [relNotesEn, setRelNotesEn] = useState('');
  const [relNotesMr, setRelNotesMr] = useState('');
  const [relIsMandatory, setRelIsMandatory] = useState(false);

  // Notification helper
  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const notifyError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
  };

  // Fetch all module data
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [overviewData, contentData, announcementsData, releasesData] = await Promise.all([
        adminApi.getWebsiteOverview().catch(() => null),
        adminApi.getWebsiteContent().catch(() => null),
        adminApi.getAdminAnnouncements().catch(() => []),
        adminApi.getReleases().catch(() => ({ releases: [], activeRelease: null }))
      ]);

      if (overviewData) setOverview(overviewData);
      if (contentData) {
        if (!isEditingContent) {
          setContentForm(contentData.draft.content);
        }
      }
      setAnnouncements(announcementsData);
      setReleases(releasesData.releases);
      setActiveRelease(releasesData.activeRelease);
    } catch (err: any) {
      if (!isBackground) {
        notifyError(err.message || 'Failed to load website and release control data');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [isEditingContent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Universal Auto-Refresh (Build 9 Phase 1.5 & 2.5)
  // Subscribes to 'website' and 'releases' freshness markers
  useAutoRefresh(['website', 'releases'], () => {
    if (!isEditingContent && !showAnnouncementModal && !showStageReleaseModal && !showBuildModal && !showLogsModal) {
      fetchData(true);
    }
  });

  // Real-time polling for build terminal logs and background build progress (Build 9 Phase 4.5)
  useEffect(() => {
    let timer: any = null;
    const hasActiveBuild = releases.some(r => r.status === 'BUILDING');

    if (showLogsModal && activeLogsRelease) {
      const pollLogs = async () => {
        try {
          const res = await adminApi.getReleaseLogs(activeLogsRelease.id);
          if (res) {
            setActiveLogsText(res.buildLogs || res.build_logs || '');
            if (terminalBottomRef.current) {
              terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
            }
            if (res.status !== activeLogsRelease.status) {
              fetchData(true);
            }
          }
        } catch {
          // ignore error during polling
        }
      };
      pollLogs();
      timer = setInterval(pollLogs, 2000);
    } else if (hasActiveBuild) {
      timer = setInterval(() => {
        fetchData(true);
      }, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showLogsModal, activeLogsRelease, releases, fetchData]);

  // Content Actions
  const handleSaveDraft = async () => {
    setActionLoading(true);
    try {
      await adminApi.saveWebsiteDraft(contentForm);
      notifySuccess(t.draftSavedSuccess);
      setIsEditingContent(false);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Failed to save content draft');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishContent = async () => {
    setActionLoading(true);
    try {
      await adminApi.publishWebsiteContent();
      notifySuccess(t.publishContentSuccess);
      setShowPublishContentModal(false);
      setIsEditingContent(false);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Failed to publish website content');
    } finally {
      setActionLoading(false);
    }
  };

  // Announcement Actions
  const handleOpenCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementTitle('');
    setAnnouncementTitleMr('');
    setAnnouncementContent('');
    setAnnouncementContentMr('');
    setAnnouncementCategory('FEATURE');
    setAnnouncementStatus('DRAFT');
    setShowAnnouncementModal(true);
  };

  const handleOpenEditAnnouncement = (item: PublicAnnouncementItem) => {
    setEditingAnnouncement(item);
    setAnnouncementTitle(item.title);
    setAnnouncementTitleMr(item.title_mr);
    setAnnouncementContent(item.content);
    setAnnouncementContentMr(item.content_mr);
    setAnnouncementCategory(item.category);
    setAnnouncementStatus(item.status);
    setShowAnnouncementModal(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingAnnouncement) {
        await adminApi.updateAnnouncement(editingAnnouncement.id, {
          title: announcementTitle,
          titleMr: announcementTitleMr,
          content: announcementContent,
          contentMr: announcementContentMr,
          category: announcementCategory,
          status: announcementStatus
        });
        notifySuccess(t.announcementUpdatedSuccess);
      } else {
        await adminApi.createAnnouncement({
          title: announcementTitle,
          titleMr: announcementTitleMr,
          content: announcementContent,
          contentMr: announcementContentMr,
          category: announcementCategory,
          status: announcementStatus
        });
        notifySuccess(t.announcementCreatedSuccess);
      }
      setShowAnnouncementModal(false);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Failed to save announcement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePublishAnnouncement = async (item: PublicAnnouncementItem) => {
    setActionLoading(true);
    try {
      if (item.status === 'PUBLISHED') {
        await adminApi.unpublishAnnouncement(item.id);
        notifySuccess(t.announcementUnpublishedSuccess);
      } else {
        await adminApi.publishAnnouncement(item.id);
        notifySuccess(t.announcementPublishedSuccess);
      }
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Failed to change announcement status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this public announcement?')) return;
    setActionLoading(true);
    try {
      await adminApi.deleteAnnouncement(id);
      notifySuccess('Announcement deleted successfully.');
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Failed to delete announcement');
    } finally {
      setActionLoading(false);
    }
  };

  // Release Actions
  const handleOpenStageRelease = () => {
    const currentCode = activeRelease?.version_code || 15;
    const currentBuild = activeRelease?.build_number || 8;
    setRelVersionName('1.0.2');
    setRelBuildNumber(currentBuild + 1);
    setRelVersionCode(currentCode + 1);
    setRelChannel('STABLE');
    setRelBuildMode('LOCAL_DEBUG');
    setRelNotesEn('');
    setRelNotesMr('');
    setRelIsMandatory(false);
    setShowStageReleaseModal(true);
  };

  const handleStageRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminApi.createReleaseDraft({
        versionName: relVersionName,
        buildNumber: relBuildNumber,
        versionCode: relVersionCode,
        channel: relChannel,
        releaseNotes: relNotesEn,
        releaseNotesMr: relNotesMr,
        isMandatory: relIsMandatory
      });
      notifySuccess(t.releaseDraftCreatedSuccess);
      setShowStageReleaseModal(false);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Failed to stage release candidate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBuildModal = (rel: ReleaseRecordItem) => {
    setTargetBuildRelease(rel);
    setBuildModeSelect('LOCAL_DEBUG');
    setShowBuildModal(true);
  };

  const handleConfirmTriggerBuild = async () => {
    if (!targetBuildRelease) return;
    setActionLoading(true);
    try {
      const res = await adminApi.triggerReleaseBuild(targetBuildRelease.id, buildModeSelect);
      notifySuccess(res.message || t.buildWorkflowInitiated);
      setShowBuildModal(false);
      // Open terminal modal to view real-time build logs
      setActiveLogsRelease(targetBuildRelease);
      setActiveLogsText(targetBuildRelease.build_logs || `[${new Date().toLocaleTimeString()}] Triggered ${buildModeSelect} build...`);
      setShowLogsModal(true);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Build workflow failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenLogsModal = (rel: ReleaseRecordItem) => {
    setActiveLogsRelease(rel);
    setActiveLogsText(rel.build_logs || 'No build logs recorded yet.');
    setShowLogsModal(true);
  };

  const handleCopyLogs = () => {
    if (!activeLogsText) return;
    navigator.clipboard.writeText(activeLogsText);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleVerifyArtifact = async (relId: string) => {
    setActionLoading(true);
    try {
      await adminApi.verifyReleaseArtifact(relId);
      notifySuccess(t.artifactVerifiedSuccess);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Artifact verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPublishReleaseModal = (rel: ReleaseRecordItem) => {
    setTargetPublishRelease(rel);
    setShowPublishReleaseModal(true);
  };

  const handleConfirmPublishRelease = async () => {
    if (!targetPublishRelease) return;
    setActionLoading(true);
    try {
      await adminApi.publishRelease(targetPublishRelease.id);
      notifySuccess(t.releasePublishedSuccess);
      setShowPublishReleaseModal(false);
      setTargetPublishRelease(null);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Failed to publish release');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRollback = (targetRel: ReleaseRecordItem) => {
    setRollbackTargetRelease(targetRel);
    setShowRollbackModal(true);
  };

  const handleConfirmRollback = async () => {
    if (!rollbackTargetRelease) return;
    setActionLoading(true);
    try {
      const currentActiveId = activeRelease?.id || '';
      await adminApi.rollbackRelease(currentActiveId, rollbackTargetRelease.id);
      notifySuccess(t.rollbackReleaseSuccess);
      setShowRollbackModal(false);
      setRollbackTargetRelease(null);
      await fetchData(true);
    } catch (err: any) {
      notifyError(err.message || 'Rollback failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <span className="text-sm font-medium">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Title & Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {t.websiteReleaseTitle}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.websiteReleaseSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={overview?.publishedUrl || 'https://homegrocery.github.io/download-app/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition"
          >
            <Globe className="w-3.5 h-3.5 text-brand-600" />
            <span>{t.openPublicWebsiteBtn}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <button
            onClick={() => fetchData()}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition"
            title="Refresh module data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-sm font-medium animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-slate-200/80 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => { setSubTab('overview'); setPreviewMode(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
            subTab === 'overview'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{t.websiteOverviewTab}</span>
        </button>

        <button
          onClick={() => { setSubTab('content'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
            subTab === 'content'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>{t.websiteContentTab}</span>
          {overview?.hasUnpublishedDraft && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title={t.pendingDraftNotice} />
          )}
        </button>

        <button
          onClick={() => { setSubTab('announcements'); setPreviewMode(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
            subTab === 'announcements'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t.websiteAnnouncementsTab}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
            {announcements.filter(a => a.status === 'PUBLISHED').length}
          </span>
        </button>

        <button
          onClick={() => { setSubTab('releases'); setPreviewMode(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
            subTab === 'releases'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t.websiteBuildsTab}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
            v{activeRelease?.version_name || '1.0.1'} (B{activeRelease?.build_number || 8})
          </span>
        </button>
      </div>

      {/* ===================== SUB-TAB 1: OVERVIEW ===================== */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Status summary banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{t.deploymentStatusLabel}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  ONLINE
                </span>
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                GitHub Pages
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                homegrocery.github.io/download-app/
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{t.publishedRevisionLabel}</span>
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900 font-mono">
                Rev #{overview?.publishedRevision || 1}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ETag: {overview?.publishedEtag?.slice(0, 12)}...
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{t.activeVersionLabel}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  {activeRelease?.channel || 'STABLE'}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                v{activeRelease?.version_name || '1.0.1'} (Build {activeRelease?.build_number || 8})
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                code: {activeRelease?.version_code || 15}
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{t.announcementsTitle}</span>
                <Bell className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {overview?.announcementCounts.published || 0} active
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {overview?.announcementCounts.draft || 0} drafts, {overview?.announcementCounts.archived || 0} archived
              </p>
            </div>
          </div>

          {/* Pending Draft Alert */}
          {overview?.hasUnpublishedDraft && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Unpublished Draft Edits
                  </div>
                  <div className="text-xs mt-0.5 text-amber-700">
                    {t.pendingDraftNotice}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSubTab('content')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition"
                >
                  Review Draft
                </button>
                <button
                  onClick={() => setShowPublishContentModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
                >
                  Publish Now
                </button>
              </div>
            </div>
          )}

          {/* Active Release Card Detail */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.activeReleaseCardTitle}</span>
            </h3>

            {activeRelease ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
                <div className="space-y-3">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{t.releaseVersionLabel}:</span>
                    <span className="font-semibold text-slate-900">v{activeRelease.version_name} (Build {activeRelease.build_number})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{t.releaseVersionCodeLabel}:</span>
                    <span className="font-mono font-bold text-slate-900">{activeRelease.version_code}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">APK Artifact Filename:</span>
                    <span className="font-mono text-slate-900">{activeRelease.apk_filename}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Exact File Size:</span>
                    <span className="font-semibold text-slate-900">{(activeRelease.apk_size_bytes / (1024 * 1024)).toFixed(2)} MB ({activeRelease.apk_size_bytes} bytes)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 block mb-1">SHA-256 Checksum:</span>
                    <span className="font-mono text-[11px] bg-slate-50 p-1.5 rounded block break-all select-all text-slate-800 border border-slate-200">
                      {activeRelease.sha256_hash}
                    </span>
                  </div>
                  <div className="py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 block mb-1">Published Release Notes:</span>
                    <p className="text-slate-800 italic">{lang === 'mr' ? activeRelease.release_notes_mr : activeRelease.release_notes}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No active release recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* ===================== SUB-TAB 2: CONTENT EDITOR ===================== */}
      {subTab === 'content' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.contentEditorTitle}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.contentEditorSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  previewMode
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.btnPreviewWebsite}</span>
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition"
              >
                {t.btnSaveDraft}
              </button>
              <button
                onClick={() => setShowPublishContentModal(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{t.btnPublishWebsite}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Mode or Editor Form */}
          {previewMode ? (
            <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Public Website Preview Mode (Unpublished Draft)
                </div>
                <button
                  onClick={() => setPreviewMode(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Exit Preview
                </button>
              </div>

              {/* Preview Hero Announcement Card */}
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-semibold mb-2">
                  <span>★</span>
                  <span>{lang === 'mr' ? (contentForm.heroBadgeMr || 'अधिकृत संदेश') : (contentForm.heroBadge || 'Official Release')}</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {lang === 'mr' ? (contentForm.heroAnnouncementMr || contentForm.heroAnnouncement) : contentForm.heroAnnouncement}
                </h3>
                <p className="text-base font-extrabold text-cyan-400 mt-1">
                  {lang === 'mr' ? (contentForm.taglineMr || contentForm.tagline) : contentForm.tagline}
                </p>
                <p className="text-xs text-slate-300 mt-2 max-w-xl leading-relaxed">
                  {lang === 'mr' ? (contentForm.descriptionMr || contentForm.description) : contentForm.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.webTitleEn}
                  </label>
                  <input
                    type="text"
                    value={contentForm.title || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, title: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.webTitleMr}
                  </label>
                  <input
                    type="text"
                    value={contentForm.titleMr || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, titleMr: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.webTaglineEn}
                  </label>
                  <input
                    type="text"
                    value={contentForm.tagline || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, tagline: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.webTaglineMr}
                  </label>
                  <input
                    type="text"
                    value={contentForm.taglineMr || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, taglineMr: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.heroAnnouncementEn}
                  </label>
                  <input
                    type="text"
                    value={contentForm.heroAnnouncement || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, heroAnnouncement: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.heroAnnouncementMr}
                  </label>
                  <input
                    type="text"
                    value={contentForm.heroAnnouncementMr || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, heroAnnouncementMr: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.webDescriptionEn}
                  </label>
                  <textarea
                    rows={3}
                    value={contentForm.description || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, description: e.target.value }); }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.webDescriptionMr}
                  </label>
                  <textarea
                    rows={3}
                    value={contentForm.descriptionMr || ''}
                    onChange={(e) => { setIsEditingContent(true); setContentForm({ ...contentForm, descriptionMr: e.target.value }); }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== SUB-TAB 3: PUBLIC ACTIVITY ===================== */}
      {subTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.announcementsTitle}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.announcementsSubtitle}</p>
            </div>
            <button
              onClick={handleOpenCreateAnnouncement}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.btnCreateAnnouncement}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Announcement</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Published At</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {announcements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No announcements found. Click "Create Announcement" to publish updates to the transparency feed.
                    </td>
                  </tr>
                ) : (
                  announcements.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{lang === 'mr' ? item.title_mr : item.title}</div>
                        <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                          {lang === 'mr' ? item.content_mr : item.content}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {item.published_at ? new Date(item.published_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublishAnnouncement(item)}
                          disabled={actionLoading}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                            item.status === 'PUBLISHED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {item.status === 'PUBLISHED' ? t.btnUnpublishAnnouncement : t.btnPublishAnnouncement}
                        </button>
                        <button
                          onClick={() => handleOpenEditAnnouncement(item)}
                          className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                          title="Edit Announcement"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(item.id)}
                          className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== SUB-TAB 4: ANDROID RELEASES & BUILDS ===================== */}
      {subTab === 'releases' && (
        <div className="space-y-6">
          {/* Header & New Release Button */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.releasesTitle}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.releasesSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenStageRelease}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t.btnCreateReleaseDraft}</span>
              </button>
            </div>
          </div>

          {/* Active Production Release Banner */}
          {activeRelease && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white tracking-wide">
                      LIVE IN PRODUCTION (update.json)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300">
                      {activeRelease.channel}
                    </span>
                    <span className="text-xs text-slate-500">
                      Published: {activeRelease.published_at ? new Date(activeRelease.published_at).toLocaleString() : 'Baseline'}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Home Grocery v{activeRelease.version_name}</span>
                    <span className="text-xs text-slate-500 font-normal">
                      (Build {activeRelease.build_number}, versionCode {activeRelease.version_code})
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono truncate max-w-xl">
                    APK: {activeRelease.apk_filename} • {activeRelease.apk_size_bytes ? `${(activeRelease.apk_size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'Pending'}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={adminApi.getReleaseDownloadUrl(activeRelease.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.btnDownloadApk}</span>
                  </a>
                  <button
                    onClick={() => handleOpenLogsModal(activeRelease)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition shadow-sm"
                  >
                    <Terminal className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t.btnViewBuildLogs}</span>
                  </button>
                </div>
              </div>

              {activeRelease.sha256_hash && (
                <div className="mt-4 pt-3 border-t border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-900 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold shrink-0">SHA-256:</span>
                  <span className="truncate bg-white/80 px-2 py-0.5 rounded border border-emerald-200 select-all">
                    {activeRelease.sha256_hash}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Release Records List */}
          <div className="space-y-4">
            {releases.map((rel) => {
              const isCurrentActive = activeRelease?.id === rel.id;
              const isBuilding = rel.status === 'BUILDING';
              return (
                <div
                  key={rel.id}
                  className={`bg-white rounded-2xl p-6 border shadow-sm transition ${
                    isCurrentActive
                      ? 'border-emerald-500/80 ring-1 ring-emerald-500/20'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-bold text-xs shrink-0">
                        <span>v{rel.version_name}</span>
                        <span className="text-[9px] text-slate-400 font-normal">B{rel.build_number}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            Build {rel.build_number} (versionCode: {rel.version_code})
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            rel.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rel.status === 'VERIFIED'
                              ? 'bg-blue-100 text-blue-800'
                              : rel.status === 'BUILT_UNVERIFIED'
                              ? 'bg-purple-100 text-purple-800'
                              : rel.status === 'BUILDING'
                              ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                              : rel.status === 'PENDING_BUILD'
                              ? 'bg-amber-100 text-amber-800'
                              : rel.status === 'ROLLED_BACK'
                              ? 'bg-rose-100 text-rose-800'
                              : rel.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isBuilding && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>{rel.status}</span>
                          </span>

                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {rel.channel}
                          </span>

                          {isCurrentActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {rel.apk_filename} • {rel.apk_size_bytes ? `${(rel.apk_size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'Size pending'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Terminal Logs button */}
                      <button
                        onClick={() => handleOpenLogsModal(rel)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center gap-1"
                        title={t.btnViewBuildLogs}
                      >
                        <Terminal className="w-3.5 h-3.5 text-slate-600" />
                        <span>{t.btnViewBuildLogs}</span>
                      </button>

                      {/* Trigger Build button */}
                      {(rel.status === 'DRAFT' || rel.status === 'PENDING_BUILD' || rel.status === 'FAILED') && (
                        <button
                          onClick={() => handleOpenBuildModal(rel)}
                          disabled={actionLoading || isBuilding}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black text-white shadow-sm transition flex items-center gap-1"
                        >
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{t.btnTriggerBuild}</span>
                        </button>
                      )}

                      {/* Verify Artifact button */}
                      {(rel.status === 'BUILT_UNVERIFIED' || rel.status === 'PENDING_BUILD' || rel.status === 'DRAFT') && (
                        <button
                          onClick={() => handleVerifyArtifact(rel.id)}
                          disabled={actionLoading || isBuilding}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{t.btnVerifyArtifact}</span>
                        </button>
                      )}

                      {/* Download APK button */}
                      {(rel.apk_size_bytes > 0 || rel.status === 'VERIFIED' || rel.status === 'PUBLISHED') && (
                        <a
                          href={adminApi.getReleaseDownloadUrl(rel.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition flex items-center gap-1"
                          title="Download APK artifact"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.btnDownloadApk}</span>
                        </a>
                      )}

                      {/* Publish to Live Website button */}
                      {rel.status === 'VERIFIED' && !isCurrentActive && (
                        <button
                          onClick={() => handleOpenPublishReleaseModal(rel)}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          <span>{t.btnPublishRelease}</span>
                        </button>
                      )}

                      {/* Emergency Rollback button */}
                      {(rel.status === 'SUPERSEDED' || (rel.status === 'VERIFIED' && !isCurrentActive)) && (
                        <button
                          onClick={() => handleOpenRollback(rel)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t.btnRollbackRelease}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Checksum and Notes Grid */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">{t.artifactHashLabel}:</span>
                      <div className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-800">
                        <span className="truncate flex-1 select-all">
                          {rel.sha256_hash || 'Pending artifact verification'}
                        </span>
                        {rel.sha256_hash && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(rel.sha256_hash);
                              notifySuccess('SHA-256 copied to clipboard');
                            }}
                            className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5"
                            title="Copy SHA-256"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Release Notes:</span>
                      <p className="text-slate-700 italic">
                        {lang === 'mr' ? rel.release_notes_mr : rel.release_notes}
                      </p>
                    </div>
                  </div>

                  {/* Build Logs snippet */}
                  {rel.build_logs && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 font-semibold">{t.buildLogsModalTitle} Preview:</span>
                        <button
                          onClick={() => handleOpenLogsModal(rel)}
                          className="text-brand-600 hover:underline text-[11px] flex items-center gap-1"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Open Full Terminal</span>
                        </button>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 max-h-24 overflow-y-auto whitespace-pre-wrap text-[10px]">
                        {rel.build_logs}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== MODAL: PUBLISH WEBSITE CONTENT ===================== */}
      {showPublishContentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <UploadCloud className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">{t.confirmPublishContentModalTitle}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {t.confirmPublishContentWarning}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowPublishContentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={handlePublishContent}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                {actionLoading ? t.publishingReleaseProgress : t.btnConfirmPublishContent}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CREATE / EDIT ANNOUNCEMENT ===================== */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingAnnouncement ? 'Edit Public Announcement' : t.btnCreateAnnouncement}
              </h3>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.announcementTitleLabel}</label>
                  <input
                    type="text"
                    required
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.announcementTitleMrLabel}</label>
                  <input
                    type="text"
                    required
                    value={announcementTitleMr}
                    onChange={(e) => setAnnouncementTitleMr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.announcementContentLabel}</label>
                <textarea
                  rows={2}
                  required
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.announcementContentMrLabel}</label>
                <textarea
                  rows={2}
                  required
                  value={announcementContentMr}
                  onChange={(e) => setAnnouncementContentMr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.announcementCategoryLabel}</label>
                  <select
                    value={announcementCategory}
                    onChange={(e) => setAnnouncementCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="FEATURE">{t.catFeature}</option>
                    <option value="MAINTENANCE">{t.catMaintenance}</option>
                    <option value="SECURITY">{t.catSecurity}</option>
                    <option value="UPDATE">{t.catUpdate}</option>
                    <option value="POLICY">{t.catPolicy}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.announcementStatusLabel}</label>
                  <select
                    value={announcementStatus}
                    onChange={(e) => setAnnouncementStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition"
                >
                  {actionLoading ? t.loading : 'Save Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: STAGE RELEASE CANDIDATE ===================== */}
      {showStageReleaseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">{t.btnCreateReleaseDraft}</h3>
              <button
                onClick={() => setShowStageReleaseModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStageRelease} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Version Name</label>
                  <input
                    type="text"
                    required
                    placeholder="1.0.2"
                    value={relVersionName}
                    onChange={(e) => setRelVersionName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Build Number</label>
                  <input
                    type="number"
                    required
                    value={relBuildNumber}
                    onChange={(e) => setRelBuildNumber(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">versionCode</label>
                  <input
                    type="number"
                    required
                    min={activeRelease ? activeRelease.version_code + 1 : 16}
                    value={relVersionCode}
                    onChange={(e) => setRelVersionCode(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.releaseChannelLabel}</label>
                  <select
                    value={relChannel}
                    onChange={(e) => setRelChannel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="STABLE">STABLE</option>
                    <option value="BETA">BETA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.buildModeLabel}</label>
                  <select
                    value={relBuildMode}
                    onChange={(e) => setRelBuildMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="LOCAL_DEBUG">Local Debug APK</option>
                    <option value="LOCAL_RELEASE">Local Release (Protected)</option>
                    <option value="CI_DISPATCH">CI GitHub Actions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.releaseNotesEnLabel}</label>
                <textarea
                  rows={2}
                  required
                  placeholder="What is new in this release..."
                  value={relNotesEn}
                  onChange={(e) => setRelNotesEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.releaseNotesMrLabel}</label>
                <textarea
                  rows={2}
                  required
                  placeholder="नवीन वैशिष्ट्यांचा मराठीत तपशील..."
                  value={relNotesMr}
                  onChange={(e) => setRelNotesMr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={relIsMandatory}
                    onChange={(e) => setRelIsMandatory(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">{t.mandatoryUpdateLabel}</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStageReleaseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition"
                >
                  {t.btnCreateReleaseDraft}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: TRIGGER BUILD ===================== */}
      {showBuildModal && targetBuildRelease && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-indigo-600 mb-3">
              <Cpu className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">{t.confirmBuildModalTitle}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {t.confirmBuildWarning}
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 mb-4 space-y-1">
              <div><strong>Target Release:</strong> v{targetBuildRelease.version_name} (Build {targetBuildRelease.build_number})</div>
              <div><strong>versionCode:</strong> {targetBuildRelease.version_code}</div>
              <div><strong>Channel:</strong> {targetBuildRelease.channel}</div>
              <div><strong>Target APK:</strong> {targetBuildRelease.apk_filename}</div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.buildModeLabel}</label>
              <select
                value={buildModeSelect}
                onChange={(e) => setBuildModeSelect(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="LOCAL_DEBUG">{t.buildModeLocalDebug}</option>
                <option value="LOCAL_RELEASE">{t.buildModeLocalRelease}</option>
                <option value="CI_DISPATCH">{t.buildModeCiWorkflow}</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {buildModeSelect === 'LOCAL_DEBUG' && 'Directly executes gradlew.bat assembleDebug using local Android SDK and generates testable APK.'}
                {buildModeSelect === 'LOCAL_RELEASE' && 'Executes release build if signing credentials exist, or reports safe protected state awaiting CI.'}
                {buildModeSelect === 'CI_DISPATCH' && 'Stages release candidate for GitHub Actions release workflow execution.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => { setShowBuildModal(false); setTargetBuildRelease(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={handleConfirmTriggerBuild}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black text-white shadow-sm transition flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{t.btnTriggerBuild}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: LIVE TERMINAL BUILD LOGS ===================== */}
      {showLogsModal && activeLogsRelease && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{t.buildLogsModalTitle}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      v{activeLogsRelease.version_name} (Build {activeLogsRelease.build_number})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                      activeLogsRelease.status === 'BUILDING' ? 'bg-indigo-900/80 text-indigo-300 animate-pulse' :
                      activeLogsRelease.status === 'VERIFIED' ? 'bg-blue-900/80 text-blue-300' :
                      activeLogsRelease.status === 'BUILT_UNVERIFIED' ? 'bg-purple-900/80 text-purple-300' :
                      activeLogsRelease.status === 'FAILED' ? 'bg-red-900/80 text-red-300' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {activeLogsRelease.status}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live polling active (2s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
                  title="Copy terminal logs"
                >
                  {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => { setShowLogsModal(false); setActiveLogsRelease(null); }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Terminal Screen */}
            <div className="flex-1 bg-black/90 rounded-xl p-4 border border-slate-800 overflow-y-auto font-mono text-xs text-emerald-400 whitespace-pre-wrap select-all leading-relaxed shadow-inner">
              {activeLogsText || '[READY] Waiting for build process output...'}
              <div ref={terminalBottomRef} />
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-mono text-[11px]">
                Package: com.homegrocery.app • versionCode: {activeLogsRelease.version_code}
              </span>
              <button
                onClick={() => { setShowLogsModal(false); setActiveLogsRelease(null); }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PUBLISH RELEASE TO PRODUCTION ===================== */}
      {showPublishReleaseModal && targetPublishRelease && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <Rocket className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">{t.confirmPublishReleaseModalTitle}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {t.confirmPublishReleaseWarning}
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 mb-6 space-y-1">
              <div><strong>Version:</strong> v{targetPublishRelease.version_name} (Build {targetPublishRelease.build_number})</div>
              <div><strong>versionCode:</strong> {targetPublishRelease.version_code}</div>
              <div><strong>Channel:</strong> {targetPublishRelease.channel}</div>
              <div><strong>APK File:</strong> {targetPublishRelease.apk_filename} ({(targetPublishRelease.apk_size_bytes / (1024 * 1024)).toFixed(2)} MB)</div>
              <div className="font-mono text-[11px] truncate"><strong>SHA-256:</strong> {targetPublishRelease.sha256_hash}</div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => { setShowPublishReleaseModal(false); setTargetPublishRelease(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={handleConfirmPublishRelease}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                {actionLoading ? t.publishingReleaseProgress : t.btnPublishRelease}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ROLLBACK RELEASE ===================== */}
      {showRollbackModal && rollbackTargetRelease && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">{t.confirmRollbackModalTitle}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {t.confirmRollbackWarning}
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-6 space-y-1">
              <div><strong>Restoring Version:</strong> v{rollbackTargetRelease.version_name} (Build {rollbackTargetRelease.build_number})</div>
              <div><strong>Version Code:</strong> {rollbackTargetRelease.version_code}</div>
              <div><strong>APK:</strong> {rollbackTargetRelease.apk_filename}</div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => { setShowRollbackModal(false); setRollbackTargetRelease(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={handleConfirmRollback}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
              >
                {actionLoading ? t.rollingBackReleaseProgress : t.btnConfirmRollback}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
