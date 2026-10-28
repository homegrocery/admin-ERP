export interface AdminUser {
  id: string;
  mobile_number: string;
  username?: string;
  full_name?: string;
  preferred_language?: 'en' | 'mr';
  role: 'admin';
  pin_length: number;
  created_at?: string;
  updated_at?: string;
}

export interface AccountMetadata {
  id: string;
  mobile_number: string;
  username?: string;
  full_name?: string;
  role: string;
  pin_length: number;
  created_at: string;
  last_login_at: string | null;
  is_locked: boolean;
  lock_type?: 'AUTOMATIC' | 'ADMINISTRATIVE' | null;
  lock_reason?: string | null;
  failed_login_attempts: number;
  has_active_recovery_code: boolean;
  has_recovery_code?: boolean;
  has_pending_recovery_request: boolean;
  has_pending_reactivation_request?: boolean;
  pending_reactivation_request_id?: string | null;
  pending_reactivation_status?: string | null;
}

export interface AccountLockResult {
  success: boolean;
  is_locked: boolean;
  account_id: string;
}

export type RecoveryRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';

export type VerificationMethod = 'PHONE_CALL' | 'IN_PERSON' | 'SECURE_CHANNEL' | 'OWNER_VERIFIED';

export interface RecoveryRequestItem {
  id: string;
  user_id: string;
  mobile_number: string;
  status: RecoveryRequestStatus;
  created_at: string;
  expires_at: string;
  verification_method: VerificationMethod | null;
  failed_attempts: number;
  locked_until: string | null;
  notes: string | null;
}

export interface AuditLogItem {
  id: string;
  timestamp?: string;
  created_at?: string;
  admin_user_id: string;
  action: string;
  target_account_id: string | null;
  target_mobile_number: string | null;
  details: string | null;
  ip_address: string | null;
  is_archived?: number;
  archived_at?: string | null;
  admin_name?: string;
}

export interface PaginatedResult<T> {
  items?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  [key: string]: any;
}

export interface ApprovedRecoveryResult {
  temporaryCode: string;
  expiresAt: string;
  verificationMethod: VerificationMethod;
}

export interface DeletionResult {
  deletedAccountId: string;
  confirmationId?: string;
  cascadedTables?: Record<string, number>;
  message?: string;
  deletedAt?: string;
  sqliteDeleted?: boolean;
  firestoreDeleted?: boolean;
}

export interface BulkDeletionResult {
  success: boolean;
  deletedCount: number;
  count?: number;
  deletedAccountIds: string[];
  deletedAt: string;
  cascadedTotals: Record<string, number>;
}

export interface AuditArchiveResult {
  success: boolean;
  id?: string;
  count?: number;
  archived_at: string;
}

export interface RecoveryDeletionResult {
  success: boolean;
  id: string;
  revokedAuthorizations: number;
  deletedTempCodes: number;
}

export interface BulkRecoveryDeletionResult {
  success: boolean;
  deletedCount: number;
  count?: number;
  deletedAt: string;
  revokedAuthorizations: number;
  deletedTempCodes: number;
}

export interface ArchivedLogDeletionResult {
  success: boolean;
  id: string;
  deletedAt: string;
}

export interface BulkArchivedLogDeletionResult {
  success: boolean;
  count: number;
  deletedCount?: number;
  deletedAt: string;
}

export interface LoginAttemptItem {
  id: string;
  user_id: string | null;
  mobile_number: string;
  attempted_at: string;
  outcome: 'SUCCESS' | 'FAILURE';
  reason: string;
  consecutive_failed_attempts: number;
  lock_triggered: number;
  lock_type: 'AUTOMATIC' | 'ADMINISTRATIVE' | null;
  ip_address: string | null;
  request_id: string | null;
  user_full_name?: string;
}

export interface ReactivationRequestItem {
  id: string;
  user_id: string;
  mobile_number: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  lock_type: 'AUTOMATIC' | 'ADMINISTRATIVE' | null;
  lock_reason: string | null;
  failed_attempts_at_lock: number;
  admin_user_id: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  user_full_name?: string;
}

// Universal Auto-Refresh & Change Detection (Build 9 Phase 1.5 & Phase 2.5)
export type RefreshDomain = 'accounts' | 'reactivation' | 'recovery' | 'audit' | 'profile' | 'website' | 'releases';

export interface FreshnessMarkers {
  accounts: string;
  reactivation: string;
  recovery: string;
  audit: string;
  profile: string;
  website?: string;
  releases?: string;
}

export interface FreshnessSummary {
  totalAccounts: number;
  lockedAccounts: number;
  pendingReactivations: number;
  pendingRecoveries: number;
  totalAuditLogs: number;
}

export interface FreshnessData {
  markers: FreshnessMarkers;
  summary: FreshnessSummary;
  etag: string;
  serverTime: string;
}

export interface RefreshStatus {
  isConnected: boolean;
  isPaused: boolean;
  lastChecked: Date | null;
  lastChanged: Date | null;
  error: string | null;
}

// Build 9 Phase 2.5: Website & Release Control Types
export interface WebsiteContentData {
  title: string;
  titleMr: string;
  tagline: string;
  taglineMr: string;
  heroAnnouncement: string;
  heroAnnouncementMr: string;
  heroBadge: string;
  heroBadgeMr: string;
  description: string;
  descriptionMr: string;
  downloadCta: string;
  downloadCtaMr: string;
  officialSiteUrl: string;
  themeAccent: string;
  features: Array<{ id: string; title: string; titleMr: string; desc: string; descMr: string }>;
  faqs: Array<{ id: string; q: string; qMr: string; a: string; aMr: string }>;
  supportLinks: {
    privacyPolicy: string;
    terms: string;
    developerAttribution: string;
    developerAttributionMr: string;
  };
}

export interface PublicAnnouncementItem {
  id: string;
  title: string;
  title_mr: string;
  content: string;
  content_mr: string;
  category: 'FEATURE' | 'MAINTENANCE' | 'SECURITY' | 'UPDATE' | 'POLICY';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  published_at: string | null;
  expires_at: string | null;
  safe_links: Array<{ label: string; url: string }> | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ReleaseRecordItem {
  id: string;
  version_name: string;
  versionName?: string;
  build_number: number;
  buildNumber?: number;
  version_code: number;
  versionCode?: number;
  channel: 'STABLE' | 'BETA';
  status: 'DRAFT' | 'PENDING_BUILD' | 'BUILDING' | 'BUILT_UNVERIFIED' | 'READY_TO_PUBLISH' | 'VERIFIED' | 'PUBLISHED' | 'ROLLED_BACK' | 'FAILED' | 'SUPERSEDED';
  release_notes: string;
  release_notes_mr: string;
  is_mandatory: number;
  min_supported_build: number;
  apk_filename: string;
  apk_download_url: string;
  apk_size_bytes: number;
  sha256_hash: string;
  git_commit_hash?: string | null;
  git_branch?: string;
  build_logs?: string | null;
  verified_at?: string | null;
  published_at?: string | null;
  rolled_back_at?: string | null;
  created_at: string;
  updated_at: string;
  initiated_by: string;
  buildMode?: 'LOCAL_DEBUG' | 'LOCAL_RELEASE' | 'CI_DISPATCH';
  isBlocked?: boolean;
  blockReason?: string;
}

export interface ReleaseLogResponse {
  id: string;
  status: string;
  versionName: string;
  versionCode: number;
  buildNumber: number;
  buildLogs: string;
  updatedAt: string;
}

export interface WebsiteOverviewData {
  publishedUrl: string;
  deploymentStatus: string;
  lastPublishedAt: string | null;
  publishedRevision: number;
  publishedEtag: string;
  hasUnpublishedDraft: boolean;
  activeRelease: {
    versionName: string;
    buildNumber: number;
    versionCode: number;
    channel: string;
    status: string;
    apkFilename: string;
    apkDownloadUrl: string;
    apkSizeBytes: number;
    sha256Hash: string;
    publishedAt: string | null;
  } | null;
  announcementCounts: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
}
