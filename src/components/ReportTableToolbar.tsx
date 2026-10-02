import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Type,
  MoveHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  CheckCheck,
  LayoutGrid,
  Eye,
  SlidersHorizontal,
  Sparkles,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import {
  ReportTableSettings,
  TableColumnDef,
  AVAILABLE_FONTS,
  PRESET_COLUMN_VIEWS,
  TableFontFamily,
  TableDensity
} from '../types/tableCustomization';
import { Language } from '../types';
import { ReportTableStudio } from './ReportTableStudio';

interface ReportTableToolbarProps {
  settings: ReportTableSettings;
  onUpdateSettings: (settings: ReportTableSettings) => void;
  onOpenCustomizerModal: () => void;
  availableColumns: TableColumnDef[];
  lang: Language;
  onResetSettings: () => void;
  defaultStudioOpen?: boolean;
  onExportXlsx?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
}

export const ReportTableToolbar: React.FC<ReportTableToolbarProps> = ({
  settings,
  onUpdateSettings,
  onOpenCustomizerModal,
  availableColumns,
  lang,
  onResetSettings,
  defaultStudioOpen = false,
  onExportXlsx,
  onExportCsv,
  onExportPdf,
}) => {
  const [isStudioOpen, setIsStudioOpen] = useState(defaultStudioOpen);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showDensityDropdown, setShowDensityDropdown] = useState(false);

  const columnsRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const densityRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(event.target as Node)) {
        setShowColumnsDropdown(false);
      }
      if (fontRef.current && !fontRef.current.contains(event.target as Node)) {
        setShowFontDropdown(false);
      }
      if (densityRef.current && !densityRef.current.contains(event.target as Node)) {
        setShowDensityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick Font Size increment / decrement
  const handleFontSizeChange = (delta: number) => {
    const nextSize = Math.max(10, Math.min(22, settings.fontSizePx + delta));
    onUpdateSettings({
      ...settings,
      fontSizePx: nextSize,
    });
  };

  // Toggle column
  const handleToggleColumn = (colId: string) => {
    const isVisible = settings.visibleColumns.includes(colId);
    if (isVisible) {
      if (settings.visibleColumns.length <= 1) return; // leave at least 1
      onUpdateSettings({
        ...settings,
        visibleColumns: settings.visibleColumns.filter((id) => id !== colId),
      });
    } else {
      onUpdateSettings({
        ...settings,
        visibleColumns: [...settings.visibleColumns, colId],
      });
    }
  };

  // Quick Font Family selection
  const handleSelectFont = (fontId: TableFontFamily) => {
    onUpdateSettings({
      ...settings,
      fontFamily: fontId,
    });
    setShowFontDropdown(false);
  };

  // Quick Density selection
  const handleSelectDensity = (density: TableDensity) => {
    onUpdateSettings({
      ...settings,
      density,
    });
    setShowDensityDropdown(false);
  };

  // Quick width scaling (Compact, Normal, Wide)
  const handleApplyWidthScale = (scale: number) => {
    const nextWidths: Record<string, number> = {};
    availableColumns.forEach((c) => {
      const baseW = c.defaultWidth;
      const newW = Math.round(baseW * scale);
      nextWidths[c.id] = Math.max(c.minWidth, Math.min(c.maxWidth || 600, newW));
    });
    onUpdateSettings({
      ...settings,
      columnWidths: nextWidths,
    });
  };

  const selectedFontObj = AVAILABLE_FONTS.find((f) => f.id === settings.fontFamily) || AVAILABLE_FONTS[0];

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Left: Primary "Customize Table" Trigger & Quick Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStudioOpen(!isStudioOpen)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold transition shadow-xs cursor-pointer ${
              isStudioOpen
                ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-200 ring-2 ring-emerald-400/40'
                : 'bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-200'
            }`}
            title="Toggle Live Table Customizer Studio (Instant preview on real table below)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>
              {isStudioOpen
                ? (lang === 'km' ? 'ផ្ទាំងកែតារាងផ្ទាល់ (កំពុងបើក)' : 'Live Studio (Active)')
                : (lang === 'km' ? 'កែសម្រួលតារាង (Customize)' : 'Customize Table')}
            </span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] font-mono">
              {settings.visibleColumns.length}/{availableColumns.length}
            </span>
            {isStudioOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>

          {/* Quick Columns Visibility Popover */}
          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
              title="Toggle individual column visibility"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'km' ? 'ជួរឈរ (Columns)' : 'Columns'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

          {showColumnsDropdown && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-30 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-[11px] text-slate-600 uppercase">
                  {lang === 'km' ? 'បិទ/បើកជួរឈរ' : 'Toggle Columns'}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold">
                  {settings.visibleColumns.length} visible
                </span>
              </div>

              {/* Quick actions in columns popover */}
              <div className="flex items-center justify-between text-[11px] pb-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      visibleColumns: availableColumns.map((c) => c.id),
                    })
                  }
                  className="text-indigo-600 hover:underline font-bold"
                >
                  {lang === 'km' ? 'បង្ហាញទាំងអស់' : 'Show All'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      visibleColumns: availableColumns.filter((c) => c.isDefaultVisible).map((c) => c.id),
                    })
                  }
                  className="text-slate-500 hover:underline font-medium"
                >
                  {lang === 'km' ? 'លំនាំដើម' : 'Defaults'}
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {availableColumns.map((col) => {
                  const isVisible = settings.visibleColumns.includes(col.id);
                  return (
                    <div
                      key={col.id}
                      onClick={() => handleToggleColumn(col.id)}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                        isVisible ? 'bg-indigo-50/60 text-slate-900 font-bold' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">
                        {lang === 'km' ? col.labelKh : col.labelEn}
                      </span>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          isVisible ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick In-place Controls (Font Size, Font Family, Density, Widths) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Quick Font Size Buttons */}
        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => handleFontSizeChange(-1)}
            disabled={settings.fontSizePx <= 10}
            className="w-6 h-6 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-black text-[10px] flex items-center justify-center transition shadow-2xs cursor-pointer"
            title="Smaller font size (A-)"
          >
            A-
          </button>
          <span className="px-2 font-mono font-bold text-slate-800 text-[11px]">
            {settings.fontSizePx}px
          </span>
          <button
            type="button"
            onClick={() => handleFontSizeChange(1)}
            disabled={settings.fontSizePx >= 22}
            className="w-6 h-6 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-black text-[10px] flex items-center justify-center transition shadow-2xs cursor-pointer"
            title="Larger font size (A+)"
          >
            A+
          </button>
        </div>

        {/* Quick Font Family Selector */}
        <div className="relative" ref={fontRef}>
          <button
            type="button"
            onClick={() => setShowFontDropdown(!showFontDropdown)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer max-w-[140px]"
            title="Select Font Family"
          >
            <Type className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{settings.fontFamily}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {showFontDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 space-y-1 animate-in fade-in duration-150">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                {lang === 'km' ? 'ជ្រើសរើសពុម្ពអក្សរ' : 'Select Font'}
              </div>
              {AVAILABLE_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleSelectFont(font.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    settings.fontFamily === font.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  style={{ fontFamily: font.familyCss }}
                >
                  <span>{font.name}</span>
                  {settings.fontFamily === font.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Density Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => handleSelectDensity('compact')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              settings.density === 'compact' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Compact padding"
          >
            {lang === 'km' ? 'កៀក' : 'Compact'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectDensity('standard')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              settings.density === 'standard' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Standard padding"
          >
            {lang === 'km' ? 'ល្មម' : 'Standard'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectDensity('spacious')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              settings.density === 'spacious' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Spacious padding"
          >
            {lang === 'km' ? 'ស្រឡះ' : 'Spacious'}
          </button>
        </div>

        {/* Quick Width Presets */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => handleApplyWidthScale(0.85)}
            className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Fit table compact"
          >
            {lang === 'km' ? 'តូច' : 'Fit'}
          </button>
          <button
            type="button"
            onClick={() => handleApplyWidthScale(1.0)}
            className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Normal width"
          >
            {lang === 'km' ? 'ដើម' : 'Auto'}
          </button>
          <button
            type="button"
            onClick={() => handleApplyWidthScale(1.25)}
            className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Wide columns"
          >
            {lang === 'km' ? 'ធំ' : 'Wide'}
          </button>
        </div>

        {/* Quick Excel XLSX Button (Styled as PDF) */}
        {onExportXlsx && (
          <button
            type="button"
            onClick={onExportXlsx}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition border border-emerald-200 shadow-2xs cursor-pointer"
            title={lang === 'km' ? 'ទាញយក Excel (.xlsx) តាមម៉ូត PDF ភ្លាមៗ' : 'Download Excel (.xlsx) formatted as PDF'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        )}

        {/* Quick CSV Button */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition border border-teal-200 shadow-2xs cursor-pointer"
            title={lang === 'km' ? 'ទាញយក CSV' : 'Download CSV'}
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        )}

        {/* Open Side Drawer Button */}
        <button
          type="button"
          onClick={onOpenCustomizerModal}
          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
          title={lang === 'km' ? 'បើកជាផ្ទាំងចំហៀង (Side Drawer)' : 'Open as slide-over drawer panel'}
        >
          <PanelRightOpen className="w-3.5 h-3.5" />
        </button>

        {/* Quick Reset Settings Button */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(lang === 'km' ? 'កំណត់ទំហំ និងជួរឈរទៅជាលំនាំដើម?' : 'Reset table customization to defaults?')) {
              onResetSettings();
            }
          }}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Reset table settings to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    {/* Embedded Live Table Customizer Studio (Positioned directly above the real table for 100% instant preview) */}
    {isStudioOpen && (
      <ReportTableStudio
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onResetSettings={onResetSettings}
        availableColumns={availableColumns}
        lang={lang}
        onExportXlsx={onExportXlsx}
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
      />
    )}
  </div>
);
};
