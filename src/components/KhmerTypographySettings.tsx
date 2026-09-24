import React, { useState, useEffect } from 'react';
import {
  Type,
  Sparkles,
  Check,
  RotateCcw,
  Save,
  ZoomIn,
  ZoomOut,
  Sliders,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { KhmerTypographyConfig, Language, AuthUser, CompanyBranding } from '../types';
import {
  DEFAULT_KHMER_TYPOGRAPHY,
  AVAILABLE_KHMER_BODY_FONTS,
  AVAILABLE_HEADING_FONTS,
  FONT_SIZE_PRESETS,
  applyKhmerTypography,
  saveTypographyToStorage
} from '../utils/typographyUtils';

interface KhmerTypographySettingsProps {
  currentUser?: AuthUser | null;
  lang: Language;
  branding: CompanyBranding;
  onUpdateBranding: (updated: Partial<CompanyBranding>) => void;
  onAddAuditLog?: (action: string, actionKh: string, details: string, detailsKh: string, status?: 'success' | 'warning' | 'alert') => void;
}

export const KhmerTypographySettings: React.FC<KhmerTypographySettingsProps> = ({
  currentUser,
  lang,
  branding,
  onUpdateBranding,
  onAddAuditLog
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Local editable config initialized from branding.typography or default
  const [config, setConfig] = useState<KhmerTypographyConfig>(() => {
    return branding.typography || DEFAULT_KHMER_TYPOGRAPHY;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if branding prop updates from outside
  useEffect(() => {
    if (branding.typography) {
      setConfig(branding.typography);
    }
  }, [branding.typography]);

  // Apply changes to DOM live for instant preview
  const handleConfigChange = (newPartial: Partial<KhmerTypographyConfig>) => {
    const updated: KhmerTypographyConfig = { ...config, ...newPartial };
    setConfig(updated);
    applyKhmerTypography(updated, lang);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_KHMER_TYPOGRAPHY);
    applyKhmerTypography(DEFAULT_KHMER_TYPOGRAPHY, lang);
  };

  const handleSaveSystemWide = () => {
    if (!isAdmin) return;

    const finalConfig: KhmerTypographyConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.nameKh || currentUser?.nameEn || 'Admin',
    };

    saveTypographyToStorage(finalConfig);
    onUpdateBranding({ typography: finalConfig });
    applyKhmerTypography(finalConfig, lang);

    if (onAddAuditLog) {
      onAddAuditLog(
        'Updated Khmer Typography Settings',
        'បានកែប្រែទម្រង់ពុម្ពអក្សរខ្មែរ (Khmer Typography)',
        `Changed body font to ${finalConfig.fontFamily}, heading to ${finalConfig.headingFontFamily}, size scale to ${finalConfig.fontSizeScale}%`,
        `បានកំណត់ពុម្ពអក្សរតួខ្លួន ${finalConfig.fontFamily}, ចំណងជើង ${finalConfig.headingFontFamily}, ទំហំ ${finalConfig.fontSizeScale}%`,
        'success'
      );
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  if (!isAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center max-w-xl mx-auto my-8">
        <ShieldCheck className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-amber-900 mb-1">
          {lang === 'km' ? 'សិទ្ធិគ្រប់គ្រងត្រូវបានកម្រិត (Admin Only)' : 'Admin Privilege Required'}
        </h3>
        <p className="text-xs text-amber-700">
          {lang === 'km'
            ? 'មុខងារកែប្រែពុម្ពអក្សរ ទំហំ និងទម្រង់ Visual ត្រូវបានអនុញ្ញាតសម្រាប់តែគណនី Admin ប៉ុណ្ណោះ។'
            : 'Only system administrators can customize system-wide font types, sizing, and typography formatting.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-3 border border-indigo-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'km' ? 'មុខងារគ្រប់គ្រងសម្រាប់តែ Admin' : 'Admin Visual & Typography Suite'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 flex items-center gap-2">
              <Type className="w-6 h-6 text-indigo-300" />
              {lang === 'km' ? 'កំណត់ទម្រង់ពុម្ពអក្សរខ្មែរ (Khmer Typography & Visual)' : 'Khmer Typography & Display Settings'}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
              {lang === 'km'
                ? 'ដោះស្រាយបញ្ហាអក្សរតូច ពិបាកមើល ឬមិនសូវច្បាស់។ លោកអ្នកអាចជ្រើសរើសពុម្ពអក្សរទំនើប (Kantumruy Pro, Battambang...) ពង្រីកទំហំ បង្កើនកម្រាស់អក្សរ និងគម្លាតបន្ទាត់ដើម្បីឱ្យបុគ្គលិក និងថ្នាក់ដឹកនាំអានងាយស្រួលបំផុត។'
                : 'Customize font sizes, font families, letter weights, and line heights so Khmer text is crystal clear and comfortable to read on all screens.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'កំណត់ដើម' : 'Reset Defaults'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSystemWide}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 transition cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{lang === 'km' ? 'បានរក្សាទុករួចរាល់!' : 'Saved System-wide!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>{lang === 'km' ? 'រក្សាទុក និងអនុវត្តទូទាំងប្រព័ន្ធ' : 'Save & Apply All'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live Interactive Preview Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              {lang === 'km' ? 'ផ្ទាំងមើលលទ្ធផលផ្ទាល់ (Live Real-time Preview)' : 'Live Interactive Preview'}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {lang === 'km' ? `ទំហំបច្ចុប្បន្ន: ${config.fontSizeScale}% • ពុម្ព: ${config.fontFamily}` : `Scale: ${config.fontSizeScale}% • ${config.fontFamily}`}
          </span>
        </div>

        {/* Preview Frame */}
        <div
          className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/50 p-6 space-y-4 transition-all"
          style={{
            fontFamily: `'${config.fontFamily}', -apple-system, sans-serif`,
            fontWeight: Number(config.fontWeight),
            lineHeight: config.lineHeight,
            letterSpacing: config.letterSpacing,
          }}
        >
          {/* Sample Heading */}
          <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
            <div>
              <h4
                className="text-lg font-bold text-indigo-950"
                style={{ fontFamily: `'${config.headingFontFamily}', sans-serif` }}
              >
                សាខា អារ៉ូម៉ា កាហ្វេ (Aroma Cafe BKK1)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន QR Code & GPS Geofencing ឆ្លាតវៃ' : 'Multi-branch Smart Attendance System'}
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
              {lang === 'km' ? 'វត្តមាន ៩៨.៥% (ធម្មតា)' : '98.5% Present'}
            </span>
          </div>

          {/* Sample Body Paragraph */}
          <div className="text-slate-700 text-sm leading-relaxed space-y-2">
            <p>
              សូមស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងបុគ្គលិក! បុគ្គលិកទាំងអស់ត្រូវធ្វើការស្កេនវត្តមានចូលបំពេញការងារចាប់ពីម៉ោង ០៧:៣០ ព្រឹក ដល់ ០៨:០០ ព្រឹក នៅរង្វង់ Geofence កំណត់ ៧៥ ម៉ែត្រ។
            </p>
            <p className="text-xs text-slate-500">
              * ការស្នើសុំច្បាប់ឈឺ (Sick Leave) និងច្បាប់ប្រចាំឆ្នាំ (Annual Leave) ត្រូវធ្វើការស្នើសុំតាមផតថលបុគ្គលិកយ៉ាងតិច ២៤ ម៉ោងមុនកាលបរិច្ឆេទ។
            </p>
          </div>

          {/* Sample Buttons & Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ស្កេនវត្តមាន QR & GPS</span>
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              ស្នើសុំច្បាប់ឈប់សម្រាក
            </button>
            <span className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
              ម៉ោងធ្វើការ: ៨ ម៉ោង ៣០ នាទី
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Font Family Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Body Font Selection */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Type className="w-4 h-4 text-indigo-600" />
                  {lang === 'km' ? '១. ជ្រើសរើសពុម្ពអក្សរតួខ្លួន (Khmer Body Font)' : '1. Khmer Body Font'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'km'
                    ? 'អនុវត្តលើអត្ថបទ ព័ត៌មានបុគ្គលិក តារាង ប៊ូតុង និងទិន្នន័យទូទៅ'
                    : 'Applies to body text, tables, buttons, inputs, and descriptions.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_KHMER_BODY_FONTS.map((font) => {
                const isSelected = config.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleConfigChange({ fontFamily: font.id })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {lang === 'km' ? font.nameKh : font.nameEn}
                      </span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : font.recommended ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          {lang === 'km' ? 'ណែនាំ' : 'Recommended'}
                        </span>
                      ) : null}
                    </div>

                    <p
                      className="text-xs text-slate-700 line-clamp-2 my-2"
                      style={{ fontFamily: `'${font.id}', sans-serif` }}
                    >
                      {font.sampleText}
                    </p>

                    <span className="text-[10px] text-slate-400 block border-t border-slate-100 pt-1.5">
                      {font.descriptionKh}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Heading Font Selection */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
              <Maximize2 className="w-4 h-4 text-indigo-600" />
              {lang === 'km' ? '២. ជ្រើសរើសពុម្ពអក្សរចំណងជើង (Heading Font)' : '2. Khmer Heading Font'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {lang === 'km'
                ? 'ប្រើប្រាស់សម្រាប់ចំណងជើងទំព័រ ឈ្មោះសាខា និងកាតស្ថិតិសំខាន់ៗ'
                : 'Used for page titles, branch titles, and dashboard widget cards.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {AVAILABLE_HEADING_FONTS.map((font) => {
                const isSelected = config.headingFontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleConfigChange({ headingFontFamily: font.id })}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span
                      className="block text-sm mb-1 truncate"
                      style={{ fontFamily: `'${font.id}', sans-serif` }}
                    >
                      {lang === 'km' ? font.nameKh : font.nameEn}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isSelected ? '✓ សកម្ម (Active)' : font.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Size Scaling & Format Formatting */}
        <div className="lg:col-span-5 space-y-6">
          {/* Size Scaling Controls */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-indigo-600" />
                  {lang === 'km' ? '៣. ទំហំពង្រីកអក្សរ (Font Size Scale)' : '3. Font Size Scale'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'km' ? 'ដោះស្រាយអក្សរតូចពិបាកអាន' : 'Scale overall font sizing'}
                </p>
              </div>
              <span className="text-lg font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
                {config.fontSizeScale}%
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {FONT_SIZE_PRESETS.map((preset) => {
                const isSelected = config.fontSizeScale === preset.scale;
                return (
                  <button
                    key={preset.scale}
                    type="button"
                    onClick={() => handleConfigChange({ fontSizeScale: preset.scale })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">
                      {lang === 'km' ? preset.labelKh : preset.labelEn}
                    </div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {preset.descKh}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><ZoomOut className="w-3 h-3" /> ៩៥%</span>
                <span className="font-semibold text-indigo-600">កម្រិតលម្អិត: {config.fontSizeScale}%</span>
                <span className="flex items-center gap-1">១៣៥% <ZoomIn className="w-3 h-3" /></span>
              </div>
              <input
                type="range"
                min="95"
                max="135"
                step="1"
                value={config.fontSizeScale}
                onChange={(e) => handleConfigChange({ fontSizeScale: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Stroke Boldness / Weight & Line-height */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              {lang === 'km' ? '៤. កម្រាស់អក្សរ & គម្លាតបន្ទាត់ (Weight & Spacing)' : '4. Weight & Spacing'}
            </h3>

            {/* Font Weight */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {lang === 'km' ? 'កម្រាស់តួអក្សរ (Stroke Boldness):' : 'Font Weight:'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: '400', labelKh: 'ធម្មតា (400)', labelEn: 'Normal' },
                  { value: '500', labelKh: 'ដិតល្មម (500)', labelEn: 'Medium', rec: true },
                  { value: '600', labelKh: 'ដិតច្បាស់ (600)', labelEn: 'Semi-Bold' },
                  { value: '700', labelKh: 'ដិតខ្លាំង (700)', labelEn: 'Bold' },
                ].map((w) => {
                  const isSelected = config.fontWeight === w.value;
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => handleConfigChange({ fontWeight: w.value as any })}
                      className={`p-2 rounded-xl border text-center text-xs transition cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="truncate">{lang === 'km' ? w.labelKh : w.labelEn}</div>
                      {w.rec && (
                        <div className="text-[9px] text-emerald-600 font-bold">★ ណែនាំ</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {lang === 'km' ? 'គម្លាតបន្ទាត់ជួរដេក (Line Height Spacing):' : 'Line Height:'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 1.5, label: '1.50 (បង្រួម)' },
                  { value: 1.65, label: '1.65 (ស្តង់ដារ)' },
                  { value: 1.75, label: '1.75 (ធូរស្រួល)', rec: true },
                  { value: 1.9, label: '1.90 (ធំ)' },
                ].map((lh) => {
                  const isSelected = config.lineHeight === lh.value;
                  return (
                    <button
                      key={lh.value}
                      type="button"
                      onClick={() => handleConfigChange({ lineHeight: lh.value })}
                      className={`p-2 rounded-xl border text-center text-xs transition cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div>{lh.label}</div>
                      {lh.rec && <div className="text-[9px] text-emerald-600 font-bold">★ ជើងអក្សរច្បាស់</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* High Contrast Toggle */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  {lang === 'km' ? 'បង្កើនកម្រិតពណ៌ខ្មៅ (High Contrast Readability)' : 'High Contrast Text'}
                </label>
                <p className="text-[11px] text-slate-500">
                  {lang === 'km' ? 'ធ្វើឱ្យអក្សរពណ៌ប្រផេះប្រែជាខ្មៅច្បាស់ងាយអាន' : 'Deepens gray text for better readability'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleConfigChange({ textContrast: config.textContrast === 'high' ? 'normal' : 'high' })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.textContrast === 'high' ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.textContrast === 'high' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
