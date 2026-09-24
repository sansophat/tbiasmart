import { KhmerTypographyConfig, Language } from '../types';

export const DEFAULT_KHMER_TYPOGRAPHY: KhmerTypographyConfig = {
  fontFamily: 'Kantumruy Pro',
  headingFontFamily: 'Battambang',
  fontSizeScale: 112, // 112% makes Khmer visually balance English font metrics
  fontWeight: '500', // Medium weight renders Khmer vowels and subscripts with high clarity
  lineHeight: 1.7, // Essential vertical space so sub-letters are not clipped
  letterSpacing: '0.012em',
  textContrast: 'normal',
  enableGlobalKhmerScaling: true,
};

export interface KhmerFontOption {
  id: string;
  nameKh: string;
  nameEn: string;
  category: string;
  recommended: boolean;
  sampleText: string;
  descriptionKh: string;
  weights: string[];
}

export const AVAILABLE_KHMER_BODY_FONTS: KhmerFontOption[] = [
  {
    id: 'Kantumruy Pro',
    nameKh: 'កន្ទុមរុយ ប្រូ (Kantumruy Pro)',
    nameEn: 'Kantumruy Pro (Modern UI - Highly Legible)',
    category: 'Modern Sans',
    recommended: true,
    sampleText: 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃតាមសាខា និងស្កេន QR GPS Geofence',
    descriptionKh: 'ពុម្ពអក្សរទំនើបច្បាស់ល្អបំផុតសម្រាប់អេក្រង់ទូរស័ព្ទ និងកុំព្យូទ័រ អានស្រួលភ្នែកមិនងាយហត់',
    weights: ['300', '400', '500', '600', '700'],
  },
  {
    id: 'Battambang',
    nameKh: 'បាត់ដំបង (Battambang)',
    nameEn: 'Battambang (Classic Standard)',
    category: 'Classic Rounded',
    recommended: true,
    sampleText: 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃតាមសាខា និងស្កេន QR GPS Geofence',
    descriptionKh: 'ពុម្ពអក្សរស្តង់ដារពេញនិយមបំផុត ទម្រង់មូលសមរម្យសម្រាប់ចំណងជើង និងទិន្នន័យ',
    weights: ['400', '700', '900'],
  },
  {
    id: 'Noto Sans Khmer',
    nameKh: 'ណូតូ សាន់ស៍ (Noto Sans Khmer)',
    nameEn: 'Noto Sans Khmer (Clean & Universal)',
    category: 'Clean Sans',
    recommended: false,
    sampleText: 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃតាមសាខា និងស្កេន QR GPS Geofence',
    descriptionKh: 'ពុម្ពអក្សរផ្លូវការរបស់ Google បែបទំនើប គ្មានជើង ត្រង់ស្អាតស័ក្តិសមសម្រាប់ Dashboard',
    weights: ['300', '400', '500', '600', '700'],
  },
  {
    id: 'Siemreap',
    nameKh: 'សៀមរាប (Siemreap)',
    nameEn: 'Siemreap (Clean Administrative)',
    category: 'Clean Sans',
    recommended: false,
    sampleText: 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃតាមសាខា និងស្កេន QR GPS Geofence',
    descriptionKh: 'ពុម្ពអក្សរស្អាត ទន់ភ្លន់ បែបសាមញ្ញងាយស្រួលមើលក្នុងតារាង និងលិខិតរដ្ឋបាល',
    weights: ['400'],
  },
  {
    id: 'Koh Santepheap',
    nameKh: 'កោះសន្តិភាព (Koh Santepheap)',
    nameEn: 'Koh Santepheap (Journal & High Contrast)',
    category: 'Editorial',
    recommended: false,
    sampleText: 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃតាមសាខា និងស្កេន QR GPS Geofence',
    descriptionKh: 'ពុម្ពអក្សរបែបសារព័ត៌មាន និងទស្សនាវដ្តី មានក្បាច់ស្អាត និងភាពដិតច្បាស់',
    weights: ['300', '400', '700'],
  },
  {
    id: 'Hanuman',
    nameKh: 'ហនុមាន (Hanuman)',
    nameEn: 'Hanuman (Serif Traditional)',
    category: 'Serif Traditional',
    recommended: false,
    sampleText: 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃតាមសាខា និងស្កេន QR GPS Geofence',
    descriptionKh: 'ពុម្ពអក្សរបែបក្បាច់បុរាណ សមស្របសម្រាប់លិខិតស្នាម និងឯកសារផ្លូវការ',
    weights: ['400', '700'],
  },
];

export const AVAILABLE_HEADING_FONTS = [
  { id: 'Battambang', nameKh: 'បាត់ដំបង (Battambang - ស្តង់ដារ)', nameEn: 'Battambang (Standard Bold)' },
  { id: 'Koulen', nameKh: 'គូលែន (Koulen - បែបចំណងជើងធំ)', nameEn: 'Koulen (Bold Display)' },
  { id: 'Kantumruy Pro', nameKh: 'កន្ទុមរុយ ប្រូ (Kantumruy Pro - ទំនើប)', nameEn: 'Kantumruy Pro (Modern)' },
  { id: 'Noto Sans Khmer', nameKh: 'ណូតូ សាន់ស៍ (Noto Sans Khmer)', nameEn: 'Noto Sans Khmer' },
  { id: 'Koh Santepheap', nameKh: 'កោះសន្តិភាព (Koh Santepheap)', nameEn: 'Koh Santepheap' },
  { id: 'Hanuman', nameKh: 'ហនុមាន (Hanuman)', nameEn: 'Hanuman' },
];

export const FONT_SIZE_PRESETS = [
  { scale: 100, labelKh: '១០០% (ដើម)', labelEn: '100% (Standard)', descKh: 'ទំហំដើមតូចល្មម' },
  { scale: 108, labelKh: '១០៨% (ល្មម)', labelEn: '108% (Comfortable)', descKh: 'ងាយស្រួលអានលើទូរស័ព្ទ' },
  { scale: 114, labelKh: '១១៤% (ណែនាំ)', labelEn: '114% (Recommended)', descKh: 'ធំច្បាស់ល្អ មិនចុកភ្នែក' },
  { scale: 122, labelKh: '១២២% (ធំ)', labelEn: '122% (Large)', descKh: 'ធំច្បាស់សម្រាប់អត្ថបទ' },
  { scale: 130, labelKh: '១៣០% (ធំបំផុត)', labelEn: '130% (Extra Large)', descKh: 'សម្រាប់ភ្នែកខ្សោយ' },
];

const LOCAL_STORAGE_KEY = 'attend_khmer_typography_v1';

/**
 * Loads saved typography configuration from localStorage or returns default
 */
export function loadSavedTypography(): KhmerTypographyConfig {
  if (typeof window === 'undefined') return DEFAULT_KHMER_TYPOGRAPHY;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_KHMER_TYPOGRAPHY, ...parsed };
    }
  } catch (err) {
    console.error('Failed to parse typography config from localStorage:', err);
  }
  return DEFAULT_KHMER_TYPOGRAPHY;
}

/**
 * Saves typography configuration to localStorage
 */
export function saveTypographyToStorage(config: KhmerTypographyConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save typography config:', err);
  }
}

/**
 * Applies the typography configuration to the DOM by setting CSS variables on :root
 * and updating HTML classes.
 */
export function applyKhmerTypography(config?: KhmerTypographyConfig | null, lang: Language = 'km'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const currentConfig = config || DEFAULT_KHMER_TYPOGRAPHY;
  const root = document.documentElement;
  const isKhmer = lang === 'km';
  const shouldApply = isKhmer || currentConfig.enableGlobalKhmerScaling;

  const scale = (currentConfig.fontSizeScale || 112) / 100;
  const bodyFont = currentConfig.fontFamily || 'Kantumruy Pro';
  const headingFont = currentConfig.headingFontFamily || 'Battambang';
  const weight = currentConfig.fontWeight || '500';
  const lineHeight = currentConfig.lineHeight || 1.7;
  const letterSpacing = currentConfig.letterSpacing || '0.012em';

  // Apply CSS custom variables
  root.style.setProperty('--kh-font-body', `'${bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`);
  root.style.setProperty('--kh-font-heading', `'${headingFont}', '${bodyFont}', sans-serif`);
  root.style.setProperty('--kh-font-size-scale', `${scale}`);
  root.style.setProperty('--kh-font-weight', weight);
  root.style.setProperty('--kh-line-height', `${lineHeight}`);
  root.style.setProperty('--kh-letter-spacing', letterSpacing);

  if (shouldApply) {
    root.classList.add('khmer-active');
    if (currentConfig.textContrast === 'high') {
      root.classList.add('khmer-high-contrast');
    } else {
      root.classList.remove('khmer-high-contrast');
    }
  } else {
    root.classList.remove('khmer-active');
    root.classList.remove('khmer-high-contrast');
  }
}
