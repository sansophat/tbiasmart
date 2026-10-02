import React, { useState } from 'react';
import {
  Sliders,
  Type,
  MoveHorizontal,
  LayoutGrid,
  Check,
  CheckCheck,
  RotateCcw,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Palette,
  Printer,
  Maximize2,
  Minimize2,
  Clock,
  FileSpreadsheet,
  Download,
  FileDown,
  ArrowRight,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import {
  ReportTableSettings,
  TableColumnDef,
  AVAILABLE_FONTS,
  PRESET_COLUMN_VIEWS,
  TableFontFamily,
  TableDensity,
  TableHeaderTheme,
  TableBorderStyle
} from '../types/tableCustomization';
import { Language } from '../types';

interface ReportTableStudioProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReportTableSettings;
  onUpdateSettings: (settings: ReportTableSettings) => void;
  onResetSettings: () => void;
  availableColumns: TableColumnDef[];
  lang: Language;
  tableTitle?: string;
  onExportXlsx?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
}

export const ReportTableStudio: React.FC<ReportTableStudioProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  availableColumns,
  lang,
  tableTitle,
  onExportXlsx,
  onExportCsv,
  onExportPdf,
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'typography' | 'widths' | 'style'>('columns');
  const [columnSearch, setColumnSearch] = useState('');

  if (!isOpen) return null;

  // Immediate live update helper
  const updateSettingsLive = (updater: (prev: ReportTableSettings) => ReportTableSettings) => {
    const next = updater(settings);
    onUpdateSettings(next);
  };

  // 1. Column Visibility Handlers
  const handleToggleColumn = (colId: string) => {
    updateSettingsLive((prev) => {
      const isVisible = prev.visibleColumns.includes(colId);
      if (isVisible) {
        if (prev.visibleColumns.length <= 1) return prev; // keep at least 1
        return {
          ...prev,
          visibleColumns: prev.visibleColumns.filter((id) => id !== colId)
        };
      } else {
        return {
          ...prev,
          visibleColumns: [...prev.visibleColumns, colId]
        };
      }
    });
  };

  const handleSelectAllColumns = () => {
    updateSettingsLive((prev) => ({
      ...prev,
      visibleColumns: availableColumns.map((c) => c.id)
    }));
  };

  const handleSelectEssentialColumns = () => {
    const essential = availableColumns.filter((c) => c.isDefaultVisible).map((c) => c.id);
    updateSettingsLive((prev) => ({
      ...prev,
      visibleColumns: essential
    }));
  };

  const handleApplyPreset = (presetColumns: string[]) => {
    const valid = presetColumns.filter((id) => availableColumns.some((c) => c.id === id));
    if (valid.length > 0) {
      updateSettingsLive((prev) => ({
        ...prev,
        visibleColumns: valid
      }));
    }
  };

  // 2. Typography Handlers
  const handleSetFontSize = (sizePx: number) => {
    const clamped = Math.max(10, Math.min(22, sizePx));
    updateSettingsLive((prev) => ({
      ...prev,
      fontSizePx: clamped
    }));
  };

  const handleSetFontFamily = (fontId: TableFontFamily) => {
    updateSettingsLive((prev) => ({
      ...prev,
      fontFamily: fontId
    }));
  };

  // 3. Column Width Handlers
  const handleSetColumnWidth = (colId: string, width: number) => {
    const colDef = availableColumns.find((c) => c.id === colId);
    const minW = colDef?.minWidth || 40;
    const maxW = colDef?.maxWidth || 600;
    const clamped = Math.max(minW, Math.min(maxW, width));

    updateSettingsLive((prev) => ({
      ...prev,
      columnWidths: {
        ...prev.columnWidths,
        [colId]: clamped
      }
    }));
  };

  const handleApplyWidthScale = (scale: number) => {
    updateSettingsLive((prev) => {
      const nextWidths: Record<string, number> = {};
      availableColumns.forEach((c) => {
        const baseW = c.defaultWidth;
        const newW = Math.round(baseW * scale);
        nextWidths[c.id] = Math.max(c.minWidth, Math.min(c.maxWidth || 600, newW));
      });
      return {
        ...prev,
        columnWidths: nextWidths
      };
    });
  };

  const handleResetColumnWidths = () => {
    updateSettingsLive((prev) => {
      const nextWidths: Record<string, number> = {};
      availableColumns.forEach((c) => {
        nextWidths[c.id] = c.defaultWidth;
      });
      return {
        ...prev,
        columnWidths: nextWidths
      };
    });
  };

  // 4. Style & Density Handlers
  const handleSetDensity = (density: TableDensity) => {
    updateSettingsLive((prev) => ({ ...prev, density }));
  };

  const handleToggleZebra = () => {
    updateSettingsLive((prev) => ({ ...prev, zebraStripes: !prev.zebraStripes }));
  };

  const handleSetBorderStyle = (borderStyle: TableBorderStyle) => {
    updateSettingsLive((prev) => ({ ...prev, borderStyle }));
  };

  const handleSetHeaderTheme = (headerTheme: TableHeaderTheme) => {
    updateSettingsLive((prev) => ({ ...prev, headerTheme }));
  };

  const handleToggleApplyToPrint = () => {
    updateSettingsLive((prev) => ({ ...prev, applyToPrint: !prev.applyToPrint }));
  };

  // Filter columns (excluding any photo/avatar)
  const filteredColumns = availableColumns
    .filter((c) => c.id !== 'avatar' && c.id !== 'photo')
    .filter((c) => {
      if (!columnSearch.trim()) return true;
      const q = columnSearch.toLowerCase();
      return (
        c.labelEn.toLowerCase().includes(q) ||
        c.labelKh.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });

  const selectedFontObj = AVAILABLE_FONTS.find((f) => f.id === settings.fontFamily) || AVAILABLE_FONTS[0];

  return (
    <div className="bg-linear-to-b from-slate-50 to-white rounded-3xl border-2 border-indigo-500/30 p-4 shadow-xl mb-4 transition-all duration-200 animate-in fade-in slide-in-from-top-2">
      {/* Studio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                {lang === 'km' ? 'ផ្ទាំងកែសម្រួលតារាងផ្ទាល់ (Live Table Customizer)' : 'Live Table Customizer Studio'}
              </h3>
              {/* Prominent Live Preview Status Badge */}
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{lang === 'km' ? 'មើលផ្ទាល់លើតារាងពិតប្រាកដ' : 'Instant Real Table Preview Active'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {lang === 'km'
                ? 'ការកែសម្រួលជួរឈរ ពុម្ពអក្សរ ទំហំ និងទទឹង ត្រូវបានអនុវត្តភ្លាមៗលើតារាងជាក់ស្តែងខាងក្រោម'
                : 'Every change to columns, font, size, and widths is instantly previewed on the real table below.'}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex flex-wrap items-center gap-2">
          {onExportXlsx && (
            <button
              type="button"
              onClick={onExportXlsx}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title={lang === 'km' ? 'ទាញយក Excel (.xlsx) តាមម៉ូត PDF ភ្លាមៗ' : 'Download Excel (.xlsx) formatted as PDF'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>{lang === 'km' ? 'Excel (.xlsx)' : 'Excel (.xlsx)'}</span>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title={lang === 'km' ? 'ទាញយក CSV' : 'Export CSV'}
            >
              <Download className="w-3.5 h-3.5 text-teal-200" />
              <span>CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (window.confirm(lang === 'km' ? 'កំណត់ការរៀបចំតារាងទាំងអស់ទៅជាលំនាំដើមវិញ?' : 'Reset all table settings to factory defaults?')) {
                onResetSettings();
              }
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
            title="Reset to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'កំណត់ដើម' : 'Reset Defaults'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-indigo-200"
            title="Done customizing"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{lang === 'km' ? 'រួចរាល់ (Done)' : 'Done'}</span>
          </button>
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 pb-2 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('columns')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'columns'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? '១. ជួរឈរ (Columns)' : '1. Columns'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeTab === 'columns' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {settings.visibleColumns.length}/{availableColumns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'typography'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? '២. ពុម្ព & ទំហំអក្សរ' : '2. Font & Size'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeTab === 'typography' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {settings.fontFamily} • {settings.fontSizePx}px
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('widths')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'widths'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <MoveHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? '៣. ទទឹងជួរឈរ (Widths)' : '3. Column Widths'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'style'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? '៤. រចនាប័ទ្ម & ពណ៌' : '4. Style & Themes'}</span>
          </button>
        </div>

        {/* Real-time Indicator Hint */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>{lang === 'km' ? 'តារាងខាងក្រោមឆ្លុះបញ្ចាំងភ្លាមៗ' : 'The table below updates automatically'}</span>
        </div>
      </div>

      {/* Tab Contents Area */}
      <div className="pt-3">
        {/* ======================================================== */}
        {/* TAB 1: COLUMNS (REMOVE / SHOW ANY COLUMN) */}
        {/* ======================================================== */}
        {activeTab === 'columns' && (
          <div className="space-y-3">
            {/* Quick Presets Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  {lang === 'km' ? 'ទម្រង់កំណត់ស្រាប់:' : 'Presets:'}
                </span>
                {PRESET_COLUMN_VIEWS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.columns)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 text-[11px] font-bold text-slate-700 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                    title={preset.descriptionEn}
                  >
                    <span>{lang === 'km' ? preset.nameKh : preset.nameEn}</span>
                  </button>
                ))}
              </div>

              {/* Action Buttons & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold border border-slate-200 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                  <span>{lang === 'km' ? 'ជ្រើសរើសទាំងអស់' : 'Select All'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectEssentialColumns}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold border border-slate-200 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>{lang === 'km' ? 'លំនាំដើម' : 'Essentials'}</span>
                </button>

                <div className="relative w-44">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    placeholder={lang === 'km' ? 'ស្វែងរកជួរឈរ...' : 'Search column...'}
                    className="w-full pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Columns Grid - Click to toggle any column */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredColumns.map((col) => {
                const isChecked = settings.visibleColumns.includes(col.id);
                const currentWidth = settings.columnWidths[col.id] || col.defaultWidth;

                return (
                  <div
                    key={col.id}
                    onClick={() => handleToggleColumn(col.id)}
                    className={`p-2.5 rounded-2xl border transition flex flex-col justify-between cursor-pointer select-none ${
                      isChecked
                        ? 'bg-indigo-50/70 border-indigo-300 text-slate-900 shadow-2xs ring-1 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-xs truncate">
                        {lang === 'km' ? col.labelKh : col.labelEn}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center transition shrink-0 ${
                          isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span className="truncate">{col.labelEn}</span>
                      <span className="font-mono text-indigo-700 font-bold bg-white/80 px-1 rounded border border-slate-200">
                        {currentWidth}px
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TYPOGRAPHY (FONT FAMILY & FONT SIZE) */}
        {/* ======================================================== */}
        {activeTab === 'typography' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left: Font Size Controls (5 cols) */}
            <div className="md:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">
                    {lang === 'km' ? 'ទំហំអក្សរក្នុងតារាង (Font Size)' : 'Table Font Size'}
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    {lang === 'km' ? 'តារាងខាងក្រោមរីក/រួមតូចភ្លាមៗ' : 'Scales table rows immediately'}
                  </span>
                </div>
                <span className="px-3 py-1 bg-white font-mono font-black text-indigo-600 text-sm rounded-xl border border-slate-200 shadow-2xs">
                  {settings.fontSizePx}px
                </span>
              </div>

              {/* Slider & Stepper */}
              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSetFontSize(settings.fontSizePx - 1)}
                  disabled={settings.fontSizePx <= 10}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 font-black text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs text-xs"
                  title="Smaller text"
                >
                  A-
                </button>

                <input
                  type="range"
                  min="10"
                  max="22"
                  step="1"
                  value={settings.fontSizePx}
                  onChange={(e) => handleSetFontSize(parseInt(e.target.value) || 12)}
                  className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <button
                  type="button"
                  onClick={() => handleSetFontSize(settings.fontSizePx + 1)}
                  disabled={settings.fontSizePx >= 22}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 font-black text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs text-xs"
                  title="Larger text"
                >
                  A+
                </button>
              </div>

              {/* Quick Size Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '10px (Tiny)', val: 10 },
                  { label: '11px (Compact)', val: 11 },
                  { label: '12px (Regular)', val: 12 },
                  { label: '13px (Medium)', val: 13 },
                  { label: '14px (Large)', val: 14 },
                  { label: '16px (XL)', val: 16 },
                  { label: '18px (2XL)', val: 18 },
                  { label: '20px (3XL)', val: 20 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => handleSetFontSize(chip.val)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                      settings.fontSizePx === chip.val
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Font Family Selection (7 cols) */}
            <div className="md:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs">
                  {lang === 'km' ? 'ជ្រើសរើសពុម្ពអក្សរ (Font Family)' : 'Select Font Family'}
                </h4>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  {settings.fontFamily}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {AVAILABLE_FONTS.map((font) => {
                  const isSelected = settings.fontFamily === font.id;
                  return (
                    <div
                      key={font.id}
                      onClick={() => handleSetFontFamily(font.id)}
                      className={`p-2.5 rounded-2xl border transition cursor-pointer select-none ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{font.name}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{font.khName}</div>
                      <div
                        className="text-xs text-slate-800 truncate pt-1 font-medium"
                        style={{ fontFamily: font.familyCss }}
                      >
                        {font.previewText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: COLUMN WIDTHS ADJUSTMENT */}
        {/* ======================================================== */}
        {activeTab === 'widths' && (
          <div className="space-y-3">
            {/* Quick Presets & Drag Instruction */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  {lang === 'km' ? 'ទម្រង់ទទឹងរហ័ស:' : 'Quick Width Scaling:'}
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyWidthScale(0.85)}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
                >
                  {lang === 'km' ? 'តូចបង្រួម (Compact 85%)' : 'Compact (85%)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyWidthScale(1.0)}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
                >
                  {lang === 'km' ? 'ស្តង់ដារ (Normal 100%)' : 'Standard (100%)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyWidthScale(1.25)}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
                >
                  {lang === 'km' ? 'ទូលាយ (Wide 125%)' : 'Wide (125%)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyWidthScale(1.5)}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
                >
                  {lang === 'km' ? 'ធំខ្លាំង (Extra Wide 150%)' : 'Extra Wide (150%)'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetColumnWidths}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
              >
                {lang === 'km' ? 'កំណត់ទទឹងដើម' : 'Reset Widths'}
              </button>
            </div>

            {/* Individual Sliders for visible columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
              {availableColumns
                .filter((c) => settings.visibleColumns.includes(c.id))
                .map((col) => {
                  const width = settings.columnWidths[col.id] || col.defaultWidth;
                  const minW = col.minWidth;
                  const maxW = col.maxWidth || 450;

                  return (
                    <div
                      key={col.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {lang === 'km' ? col.labelKh : col.labelEn}
                        </span>
                        <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {width}px
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min={minW}
                          max={maxW}
                          step="5"
                          value={width}
                          onChange={(e) => handleSetColumnWidth(col.id, parseInt(e.target.value) || minW)}
                          className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Min: {minW}px</span>
                        <span>Max: {maxW}px</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                {lang === 'km'
                  ? 'ព័ត៌មានជំនួយ៖ អ្នកក៏អាចអូសគែមជួរឈរ (th) លើតារាងពិតប្រាកដខាងក្រោម ដើម្បីកែសម្រួលទទឹងបានភ្លាមៗផងដែរ!'
                  : 'Pro Tip: You can also hover and drag the right border of any column header (th) directly on the table below!'}
              </span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: STYLE, DENSITY & THEMES */}
        {/* ======================================================== */}
        {activeTab === 'style' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Density */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
              <h4 className="font-bold text-xs text-slate-800">
                {lang === 'km' ? 'គម្លាតជួរដេក (Density)' : 'Row Density'}
              </h4>
              <div className="space-y-1">
                {[
                  { id: 'compact', labelEn: 'Compact (Tight)', labelKh: 'កៀកបង្រួម' },
                  { id: 'standard', labelEn: 'Standard (Balanced)', labelKh: 'ស្តង់ដារល្មម' },
                  { id: 'spacious', labelEn: 'Spacious (Roomy)', labelKh: 'ស្រឡះទូលាយ' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSetDensity(d.id as TableDensity)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      settings.density === d.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{lang === 'km' ? d.labelKh : d.labelEn}</span>
                    {settings.density === d.id && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Themes */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
              <h4 className="font-bold text-xs text-slate-800">
                {lang === 'km' ? 'ពណ៌ក្បាលតារាង (Header)' : 'Header Theme'}
              </h4>
              <div className="space-y-1">
                {[
                  { id: 'slate-light', label: 'Slate Light (លំនាំដើម)', bg: 'bg-slate-100 text-slate-800' },
                  { id: 'slate-dark', label: 'Dark Navy Pro (ងងឹត)', bg: 'bg-slate-800 text-white' },
                  { id: 'indigo', label: 'Indigo Brand (ស្វាយខៀវ)', bg: 'bg-indigo-700 text-white' },
                  { id: 'clean-white', label: 'Clean White (សស្អាត)', bg: 'bg-white text-slate-900 border border-slate-200' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleSetHeaderTheme(th.id as TableHeaderTheme)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${th.bg} ${
                      settings.headerTheme === th.id ? 'ring-2 ring-indigo-500 shadow-2xs' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <span className="truncate">{th.label}</span>
                    {settings.headerTheme === th.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Row Borders & Stripes */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
              <h4 className="font-bold text-xs text-slate-800">
                {lang === 'km' ? 'បន្ទាត់ & ពណ៌ឆ្លាស់' : 'Borders & Zebra'}
              </h4>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleToggleZebra}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                    settings.zebraStripes
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span>{lang === 'km' ? 'ពណ៌ជួរដេកឆ្លាស់ (Zebra)' : 'Zebra Striping'}</span>
                  <div className={`w-3.5 h-3.5 rounded-full ${settings.zebraStripes ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                </button>

                {[
                  { id: 'subtle', label: 'Subtle Borders (បន្ទាត់ស្រាល)' },
                  { id: 'grid', label: 'Full Grid (ក្រឡាពេញ)' },
                  { id: 'minimal', label: 'Minimal (អប្បបរមា)' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSetBorderStyle(b.id as TableBorderStyle)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      settings.borderStyle === b.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{b.label}</span>
                    {settings.borderStyle === b.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Print & PDF Export Sync */}
            <div
              onClick={handleToggleApplyToPrint}
              className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                settings.applyToPrint ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h5 className="font-bold text-xs text-slate-800">
                    {lang === 'km' ? 'ព្រីន & PDF Sync' : 'Print & PDF Sync'}
                  </h5>
                </div>
                <p className="text-[10px] text-slate-500">
                  {lang === 'km'
                    ? 'អនុវត្តជួរឈរ ពុម្ពអក្សរ និងទំហំនេះពេលព្រីន និងទាញយក PDF'
                    : 'Print and PDF exports inherit your customized columns and fonts.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-indigo-700">
                  {settings.applyToPrint ? (lang === 'km' ? 'បើកដំណើរការ' : 'Active') : (lang === 'km' ? 'បិទ' : 'Disabled')}
                </span>
                <div
                  className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 ${
                    settings.applyToPrint ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-2xs" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
