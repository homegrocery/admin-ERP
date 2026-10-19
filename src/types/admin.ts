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
  username: string;
  role: string;
  pin_length: number;
  created_at: string;
  last_login_at: string | null;
  is_locked: boolean;
  failed_login_attempts: number;
  has_active_recovery_code: boolean;
  has_pending_recovery_request: boolean;
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

