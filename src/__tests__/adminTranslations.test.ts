import { describe, it, expect } from 'vitest';
import { adminTranslations } from '../i18n/adminTranslations';

describe('Admin ERP Bilingual Translations', () => {
  it('should have parity between English and Marathi translation keys', () => {
    const enKeys = Object.keys(adminTranslations.en).sort();
    const mrKeys = Object.keys(adminTranslations.mr).sort();

    expect(enKeys).toEqual(mrKeys);
  });

  it('should not have empty values in English dictionary', () => {
    Object.entries(adminTranslations.en).forEach(([key, value]) => {
      expect(value, `en.${key} should not be empty`).toBeTruthy();
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
    });
  });

  it('should not have empty values in Marathi dictionary', () => {
    Object.entries(adminTranslations.mr).forEach(([key, value]) => {
      expect(value, `mr.${key} should not be empty`).toBeTruthy();
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
    });
  });

  it('should contain Santosh Koli attribution in both languages', () => {
    expect(adminTranslations.en.developedBy).toContain('Santosh Koli');
    expect(adminTranslations.mr.developedBy).toContain('संतोष कोळी');
  });

  it('should have critical danger zone and confirmation strings', () => {
    expect(adminTranslations.en.confirmPhraseLabel).toContain('DELETE');
    expect(adminTranslations.mr.confirmPhraseLabel).toContain('DELETE');
    expect(adminTranslations.en.cannotDeleteOwner).toContain('Santosh Koli');
    expect(adminTranslations.mr.cannotDeleteOwner).toContain('संतोष कोळी');
  });

  it('Feature 1 & Feature 3: should have accurate recovery code status and account lockout strings', () => {
    expect(adminTranslations.en.codeConfigured).toBe('Set');
    expect(adminTranslations.en.codeNotConfigured).toBe('Not Set');
    expect(adminTranslations.mr.codeConfigured).toBe('सेट');
    expect(adminTranslations.mr.codeNotConfigured).toBe('सेट नाही');
    expect(adminTranslations.en.btnLockAccount).toBe('Lock Account');
    expect(adminTranslations.en.btnActivateAccount).toBe('Activate Account');
    expect(adminTranslations.mr.btnLockAccount).toBe('खाते लॉक करा');
    expect(adminTranslations.mr.btnActivateAccount).toBe('खाते सक्रिय करा');
  });

  it('Build 9 Phase 1: should have reactivation approval consistency strings', () => {
    expect(adminTranslations.en.pendingReactivation).toBe('Pending Reactivation');
    expect(adminTranslations.mr.pendingReactivation).toBe('पुनर्सक्रियीकरण प्रलंबित');
    expect(adminTranslations.en.viewReactivationRequest).toBe('View Reactivation Request');
    expect(adminTranslations.mr.viewReactivationRequest).toBe('पुनर्सक्रियीकरण विनंती पहा');
    expect(adminTranslations.en.directUnlockRestricted).toContain('Direct unlock is restricted');
    expect(adminTranslations.mr.directUnlockRestricted).toContain('थेट अनलॉक प्रतिबंधित आहे');
    expect(adminTranslations.en.reviewInReactivationTab).toContain('Reactivation Requests');
    expect(adminTranslations.mr.reviewInReactivationTab).toContain('पुनर्सक्रियीकरण विनंत्या');
  });

  it('Build 9 Phase 2: should have Default Admin login and PIN show/hide strings in both languages', () => {
    expect(adminTranslations.en.defaultAdmin).toBe('Default Admin');
    expect(adminTranslations.mr.defaultAdmin).toBe('Default Admin');
    expect(adminTranslations.en.adminIdentity).toBe('Administrator Identity');
    expect(adminTranslations.mr.adminIdentity).toBe('प्रशासक ओळख');
    expect(adminTranslations.en.defaultAdminSubtitle).toBeTruthy();
    expect(adminTranslations.mr.defaultAdminSubtitle).toBeTruthy();
    expect(adminTranslations.en.pinValidationLength).toContain('4 or 6');
    expect(adminTranslations.mr.pinValidationLength).toContain('४ किंवा ६');
    expect(adminTranslations.en.showPin).toBe('Show PIN');
    expect(adminTranslations.en.hidePin).toBe('Hide PIN');
    expect(adminTranslations.mr.showPin).toBe('पिन दाखवा');
    expect(adminTranslations.mr.hidePin).toBe('पिन लपवा');
  });
});
