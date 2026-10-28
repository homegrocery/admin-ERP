import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adminApi } from '../services/adminApi';
import { refreshCoordinator } from '../services/refreshCoordinator';
import { adminTranslations } from '../i18n/adminTranslations';

describe('Website & Release Control ERP Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      }
    });
    adminApi.setToken('test-admin-jwt-token');
  });

  afterEach(() => {
    refreshCoordinator.stop();
  });

  describe('Website Content & Draft API Methods', () => {
    it('should call getWebsiteOverview endpoint', async () => {
      const mockOverview = {
        deployment: {
          backendStatus: 'HEALTHY',
          backendUrl: 'https://home-grocery-api.onrender.com',
          erpUrl: 'https://homegrocery.github.io/admin-ERP/',
          websiteUrl: 'https://homegrocery.github.io/download-app/',
          manifestUrl: 'https://homegrocery.github.io/download-app/update.json'
        },
        publishedContent: {
          title: 'Home Grocery',
          titleMr: 'होम ग्रोसरी',
          version: 1
        },
        hasPendingDraft: false,
        activeRelease: {
          versionName: '1.0.1',
          versionCode: 15,
          buildNumber: 8,
          status: 'PUBLISHED'
        },
        recentAnnouncements: []
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockOverview })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.getWebsiteOverview();
      expect(res).toEqual(mockOverview);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/overview',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-admin-jwt-token'
          })
        })
      );
    });

    it('should save website draft via PUT /api/admin/website-control/content/draft', async () => {
      const draftPayload = {
        heroBadgeEn: 'New Fast Delivery 2026',
        heroBadgeMr: 'नवीन वेगवान डिलिव्हरी २०२६'
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            content: { heroBadgeEn: 'New Fast Delivery 2026' }
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.saveWebsiteDraft(draftPayload);
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/content/draft',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(draftPayload)
        })
      );
    });

    it('should publish website content via POST /api/admin/website-control/content/publish', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            publishedRevision: 2,
            publishedAt: '2026-10-28T12:00:00.000Z'
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.publishWebsiteContent('Updated festival offers banner');
      expect(res.success).toBe(true);
      expect(res.publishedRevision).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/content/publish',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ publishNotes: 'Updated festival offers banner' })
        })
      );
    });
  });

  describe('Announcements Management API', () => {
    it('should fetch announcements via GET /api/admin/website-control/announcements', async () => {
      const mockAnnouncements = [
        {
          id: 'ann-1',
          titleEn: 'Scheduled Server Maintenance',
          titleMr: 'नियोजित सर्व्हर देखभाल',
          category: 'MAINTENANCE',
          status: 'PUBLISHED'
        }
      ];

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockAnnouncements })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.getAdminAnnouncements();
      expect(res).toEqual(mockAnnouncements);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/announcements',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-admin-jwt-token'
          })
        })
      );
    });

    it('should create new announcement via POST', async () => {
      const newAnn = {
        titleEn: 'Diwali Special Hours',
        titleMr: 'दिवाळी विशेष वेळ',
        contentEn: 'Deliveries open until 11 PM.',
        contentMr: 'रात्री ११ वाजेपर्यंत डिलिव्हरी सुरू राहील.',
        category: 'UPDATE' as const,
        status: 'PUBLISHED' as const
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'ann-2', ...newAnn }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.createAnnouncement(newAnn);
      expect(res.id).toBe('ann-2');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/announcements',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newAnn)
        })
      );
    });

    it('should update announcement via PUT', async () => {
      const updateData = { status: 'ARCHIVED' as const };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 'ann-1', status: 'ARCHIVED' } })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.updateAnnouncement('ann-1', updateData);
      expect(res.status).toBe('ARCHIVED');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/announcements/ann-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );
    });

    it('should delete announcement via DELETE', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { success: true } })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.deleteAnnouncement('ann-1');
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/announcements/ann-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Android Release & Build API Methods', () => {
    it('should stage new release draft with versionCode validation', async () => {
      const releaseInput = {
        versionName: '1.0.2',
        buildNumber: 9,
        versionCode: 16,
        channel: 'STABLE' as const,
        releaseNotesEn: 'Bug fixes and performance improvements',
        releaseNotesMr: 'दोष निवारण आणि कामगिरी सुधारणा',
        isMandatory: false
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'rel-9', status: 'DRAFT', ...releaseInput }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.createReleaseDraft(releaseInput);
      expect(res.id).toBe('rel-9');
      expect(res.versionCode).toBe(16);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/releases',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(releaseInput)
        })
      );
    });

    it('should trigger release build with buildMode option', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Local debug build workflow initiated in background',
          data: { release: { id: 'rel-9', status: 'BUILDING' } }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.triggerReleaseBuild('rel-9', 'LOCAL_DEBUG');
      expect(res.release.status).toBe('BUILDING');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/releases/rel-9/build',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ buildMode: 'LOCAL_DEBUG' })
        })
      );
    });

    it('should fetch real-time release logs', async () => {
      const mockLogs = {
        id: 'rel-9',
        status: 'BUILDING',
        versionName: '1.0.2',
        versionCode: 16,
        buildNumber: 9,
        buildLogs: '[BUILD START] assembleDebug started...',
        updatedAt: '2026-10-28T22:00:00.000Z'
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockLogs
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.getReleaseLogs('rel-9');
      expect(res.buildLogs).toContain('assembleDebug');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/releases/rel-9/logs',
        expect.anything()
      );
    });

    it('should generate authorized release download URL', () => {
      const url = adminApi.getReleaseDownloadUrl('rel-9');
      expect(url).toContain('/api/admin/website-control/releases/rel-9/download');
      expect(url).toContain('token=test-admin-jwt-token');
    });

    it('should verify release artifact SHA-256 and size', async () => {
      const verificationPayload = {
        sha256: '9ace4da60c6fdfb8a44fced3ce43b6d902db97541ebc1664fe85da05ed0069e6',
        sizeBytes: 9429395,
        downloadUrl: 'https://homegrocery.github.io/download-app/HomeGrocery-v1.0.1-build8.apk'
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'rel-9',
            status: 'READY_TO_PUBLISH',
            apkChecksumSha256: verificationPayload.sha256,
            apkSizeBytes: verificationPayload.sizeBytes
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.verifyReleaseArtifact(
        'rel-9',
        verificationPayload.sha256,
        verificationPayload.sizeBytes,
        verificationPayload.downloadUrl
      );

      expect(res.status).toBe('READY_TO_PUBLISH');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/releases/rel-9/verify-artifact',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(verificationPayload)
        })
      );
    });

    it('should publish verified release and update update-manifest.json', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            release: { id: 'rel-9', status: 'PUBLISHED', versionCode: 16 },
            manifest: {
              version: '1.0.2',
              versionCode: 16,
              buildNumber: 9
            }
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.publishRelease('rel-9');
      expect(res.success).toBe(true);
      expect(res.release.status).toBe('PUBLISHED');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/releases/rel-9/publish',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should rollback release to prior stable version', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            restoredRelease: { id: 'rel-8', status: 'PUBLISHED', versionCode: 15 },
            supersededRelease: { id: 'rel-9', status: 'ROLLED_BACK' },
            manifest: { versionCode: 15 }
          }
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await adminApi.rollbackRelease('rel-9', 'rel-8');
      expect(res.success).toBe(true);
      expect(res.restoredRelease.versionCode).toBe(15);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://home-grocery-api.onrender.com/api/admin/website-control/releases/rel-9/rollback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ targetReleaseId: 'rel-8' })
        })
      );
    });
  });

  describe('Universal Auto-Refresh Integration for Website & Releases', () => {
    it('should register and trigger domain subscriber for website domain', async () => {
      vi.useFakeTimers();

      const websiteListener = vi.fn();
      const unsub = refreshCoordinator.subscribeDomain('website', websiteListener);

      const freshnessSpy = vi.spyOn(adminApi, 'getFreshness').mockResolvedValue({
        notModified: false,
        markers: {
          accounts: 'acc-1',
          reactivation: 'rea-1',
          recovery: 'rec-1',
          audit: 'aud-1',
          profile: 'pro-1',
          website: 'web-v1-published',
          releases: 'rel-v1'
        }
      });

      refreshCoordinator.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(freshnessSpy).toHaveBeenCalled();
      expect(websiteListener).toHaveBeenCalledTimes(1);

      unsub();
      vi.useRealTimers();
    });

    it('should register and trigger domain subscriber for releases domain', async () => {
      vi.useFakeTimers();

      const releaseListener = vi.fn();
      const unsub = refreshCoordinator.subscribeDomain('releases', releaseListener);

      const freshnessSpy = vi.spyOn(adminApi, 'getFreshness').mockResolvedValue({
        notModified: false,
        markers: {
          accounts: 'acc-1',
          reactivation: 'rea-1',
          recovery: 'rec-1',
          audit: 'aud-1',
          profile: 'pro-1',
          website: 'web-v1',
          releases: 'rel-v2-published-build9'
        }
      });

      refreshCoordinator.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(freshnessSpy).toHaveBeenCalled();
      expect(releaseListener).toHaveBeenCalledTimes(1);

      unsub();
      vi.useRealTimers();
    });
  });

  describe('Bilingual Localization Completeness', () => {
    it('should verify all website and release control keys exist in en and mr', () => {
      const en = adminTranslations.en;
      const mr = adminTranslations.mr;

      const expectedKeys = [
        'navReleases',
        'websiteReleaseTitle',
        'websiteReleaseSubtitle',
        'websiteOverviewTab',
        'websiteContentTab',
        'websiteAnnouncementsTab',
        'websiteBuildsTab',
        'siteAddressLabel',
        'activeReleaseCardTitle',
        'openPublicWebsiteBtn',
        'contentEditorTitle',
        'webTitleEn',
        'webTitleMr',
        'btnPublishWebsite',
        'btnPreviewWebsite',
        'draftSavedSuccess',
        'publishContentSuccess',
        'releasesTitle',
        'btnCreateReleaseDraft',
        'releaseVersionLabel',
        'releaseBuildNumberLabel',
        'releaseVersionCodeLabel',
        'releaseChannelLabel',
        'btnPublishRelease',
        'btnRollbackRelease',
        'releasePublishedSuccess',
        'rollbackReleaseSuccess'
      ] as const;

      expectedKeys.forEach((key) => {
        expect(en[key], `Missing English translation for ${key}`).toBeDefined();
        expect(typeof en[key]).toBe('string');
        expect(mr[key], `Missing Marathi translation for ${key}`).toBeDefined();
        expect(typeof mr[key]).toBe('string');
        expect(mr[key].length).toBeGreaterThan(0);
      });
    });
  });
});
