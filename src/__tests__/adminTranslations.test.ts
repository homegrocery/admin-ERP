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
});
