import React, { useState } from 'react';
import {
  X,
  Check,
  RotateCcw,
  Sliders,
  Type,
  MoveHorizontal,
  LayoutGrid,
  Sparkles,
  Printer,
  Search,
  CheckCheck,
  ChevronRight,
  Minimize2,
  Maximize2,
  Palette,
  Radio
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

interface ReportTableCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReportTableSettings;
  onSaveSettings: (settings: ReportTableSettings) => void;
  onResetSettings: () => void;
  availableColumns: TableColumnDef[];
  lang: Language;
  tableTitle?: string;
}

export const ReportTableCustomizerModal: React.FC<ReportTableCustomizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSettings,
  availableColumns,
  lang,
  tableTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'typography' | 'widths' | 'style'>('columns');
  const [columnSearch, setColumnSearch] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  // Helper to immediately update real table in real-time
  const updateSettingsLive = (updater: (prev: ReportTableSettings) => ReportTableSettings) => {
    const next = updater(settings);
    onSaveSettings(next);
  };

  // Toggle individual column visibility (immediately reflected on real table)
  const handleToggleColumn = (colId: string) => {
    updateSettingsLive((prev) => {
      const isVisible = prev.visibleColumns.includes(colId);
      if (isVisible) {
        if (prev.visibleColumns.length <= 1) return prev; // Keep at least 1
        return {
          ...prev,
          visibleColumns: prev.visibleColumns.filter((id) => id !== colId),
        };
      } else {
        return {
          ...prev,
          visibleColumns: [...prev.visibleColumns, colId],
        };
      }
    });
  };

  // Quick select all / essential columns (immediately reflected on real table)
  const handleSelectAllColumns = () => {
    updateSettingsLive((prev) => ({
      ...prev,
      visibleColumns: availableColumns.map((c) => c.id),
    }));
  };

  const handleSelectEssentialColumns = () => {
    const essential = availableColumns.filter((c) => c.isDefaultVisible).map((c) => c.id);
    updateSettingsLive((prev) => ({
      ...prev,
      visibleColumns: essential,
    }));
  };

  // Apply column preset (immediately reflected on real table)
  const handleApplyPreset = (presetColumns: string[]) => {
    const valid = presetColumns.filter((id) => availableColumns.some((c) => c.id === id));
    if (valid.length > 0) {
      updateSettingsLive((prev) => ({
        ...prev,
        visibleColumns: valid,
      }));
    }
  };

  // Change font size (immediately reflected on real table)
  const handleSetFontSize = (sizePx: number) => {
    const clamped = Math.max(10, Math.min(22, sizePx));
    updateSettingsLive((prev) => ({
      ...prev,
      fontSizePx: clamped,
    }));
  };

  // Change font family (immediately reflected on real table)
  const handleSetFontFamily = (fontId: TableFontFamily) => {
    updateSettingsLive((prev) => ({
      ...prev,
      fontFamily: fontId,
    }));
  };

  // Adjust column width (immediately reflected on real table)
  const handleSetColumnWidth = (colId: string, width: number) => {
    const colDef = availableColumns.find((c) => c.id === colId);
    const minW = colDef?.minWidth || 40;
    const maxW = colDef?.maxWidth || 600;
    const clamped = Math.max(minW, Math.min(maxW, width));

    updateSettingsLive((prev) => ({
      ...prev,
      columnWidths: {
        ...prev.columnWidths,
        [colId]: clamped,
      },
    }));
  };

  // Width presets (immediately reflected on real table)
  const handleApplyWidthPreset = (factor: number) => {
    updateSettingsLive((prev) => {
      const nextWidths: Record<string, number> = {};
      availableColumns.forEach((c) => {
        const baseW = c.defaultWidth;
        const newW = Math.round(baseW * factor);
        nextWidths[c.id] = Math.max(c.minWidth, Math.min(c.maxWidth || 600, newW));
      });
      return {
        ...prev,
        columnWidths: nextWidths,
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
        columnWidths: nextWidths,
      };
    });
  };

  // Style updates (immediately reflected on real table)
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

  const handleResetAll = () => {
    if (window.confirm(lang === 'km' ? 'តើអ្នកចង់កំណត់ការរៀបចំតារាងទាំងអស់ទៅជាលំនាំដើមវិញឬ?' : 'Reset all table settings to factory defaults?')) {
      onResetSettings();
    }
  };

  // Filter columns by search (excluding photo/avatar)
  const filteredColumns = availableColumns
    .filter((c) => c.id !== 'avatar' && c.id !== 'photo')
    .filter((c) => {
      if (!columnSearch.trim()) return true;
      const q = columnSearch.toLowerCase();
      return c.labelEn.toLowerCase().includes(q) || c.labelKh.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    });

  const selectedFontObj = AVAILABLE_FONTS.find((f) => f.id === settings.fontFamily) || AVAILABLE_FONTS[0];

  // If minimized into floating side dock button
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl border border-indigo-500 font-bold text-xs transition cursor-pointer hover:scale-105"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <Sliders className="w-4 h-4" />
          <span>{lang === 'km' ? 'បើកផ្ទាំងកែតារាង (Live Customizer)' : 'Expand Customizer'}</span>
          <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
            {settings.fontSizePx}px • {settings.fontFamily}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/10 pointer-events-none animate-in fade-in duration-150">
      {/* Slide-over Side Drawer (Allows real table to be visible on the left!) */}
      <div
        className="w-full sm:w-[480px] lg:w-[500px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header with Real-Time Live Status Indicator */}
        <div className="p-4 border-b border-slate-200 bg-linear-to-r from-slate-50 via-indigo-50/40 to-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-800 text-sm sm:text-base">
                  {lang === 'km' ? 'កែសម្រួលតារាងផ្ទាល់' : 'Customize Real Table'}
                </h3>
                {/* Live Pulse Indicator */}
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{lang === 'km' ? 'មើលផ្ទាល់' : 'Live Sync'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'km'
                  ? 'ការផ្លាស់ប្តូរត្រូវបានអនុវត្តភ្លាមៗលើតារាងជាក់ស្តែងខាងឆ្វេង'
                  : 'Changes apply immediately to the actual table on your screen.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Minimize drawer to see full table"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-3 border-b border-slate-200 bg-slate-50/80 gap-1 overflow-x-auto py-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('columns')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
              activeTab === 'columns'
                ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ជួរឈរ (Columns)' : 'Columns'}</span>
            <span className="text-[10px] font-mono opacity-80">({settings.visibleColumns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
              activeTab === 'typography'
                ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ពុម្ព & ទំហំ' : 'Font & Size'}</span>
            <span className="text-[10px] font-mono opacity-80">({settings.fontSizePx}px)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('widths')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
              activeTab === 'widths'
                ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MoveHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ទំហំជួរឈរ' : 'Widths'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
              activeTab === 'style'
                ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ប្លង់ & គម្លាត' : 'Style & Rows'}</span>
          </button>
        </div>

        {/* Live Sync Notice Bar */}
        <div className="bg-emerald-50/70 px-4 py-1.5 border-b border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>{lang === 'km' ? 'មើលការផ្លាស់ប្តូរផ្ទាល់លើតារាង' : 'Real table updates instantly below'}</span>
          </span>
          <span className="font-mono text-[10px] text-emerald-700 bg-white/60 px-1.5 py-0.5 rounded border border-emerald-200">
            {settings.fontFamily} • {settings.fontSizePx}px
          </span>
        </div>

        {/* Drawer Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: COLUMNS VISIBILITY */}
          {activeTab === 'columns' && (
            <div className="space-y-4">
              {/* Presets Bar */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'km' ? 'ទម្រង់កំណត់ស្រាប់ (Presets)' : 'Quick Column Presets'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLUMN_VIEWS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.columns)}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 text-[11px] font-bold text-slate-700 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                    >
                      <span>{lang === 'km' ? preset.nameKh : preset.nameEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons & Search filter */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                    <span>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectEssentialColumns}
                    className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>{lang === 'km' ? 'លំនាំដើម' : 'Default'}</span>
                  </button>
                </div>

                <div className="relative flex-1 max-w-[190px]">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    placeholder={lang === 'km' ? 'ស្វែងរក...' : 'Filter...'}
                    className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Columns Checkbox List */}
              <div className="space-y-1.5">
                {filteredColumns.map((col) => {
                  const isChecked = settings.visibleColumns.includes(col.id);
                  const currentWidth = settings.columnWidths[col.id] || col.defaultWidth;

                  return (
                    <div
                      key={col.id}
                      onClick={() => handleToggleColumn(col.id)}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer select-none ${
                        isChecked
                          ? 'bg-indigo-50/50 border-indigo-200 text-slate-900 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/80 text-slate-400 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center transition shrink-0 ${
                            isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {lang === 'km' ? col.labelKh : col.labelEn}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {lang === 'km' ? col.labelEn : col.labelKh} • {currentWidth}px
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {col.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY (FONT & FONT SIZE) */}
          {activeTab === 'typography' && (
            <div className="space-y-5">
              {/* Font Size Selector */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">
                      {lang === 'km' ? 'ទំហំអក្សរក្នុងតារាង (Font Size)' : 'Table Font Size'}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'km' ? 'តារាងពិតប្រាកដនឹងរីក/រួមតូចភ្លាមៗ' : 'Real table scales immediately'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-black text-indigo-600 font-mono">
                      {settings.fontSizePx}px
                    </span>
                  </div>
                </div>

                {/* Stepper & Slider */}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => handleSetFontSize(settings.fontSizePx - 1)}
                    disabled={settings.fontSizePx <= 10}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 font-black text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs text-xs"
                    title="A-"
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
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => handleSetFontSize(settings.fontSizePx + 1)}
                    disabled={settings.fontSizePx >= 22}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 font-black text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs text-xs"
                    title="A+"
                  >
                    A+
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    { label: '10px (XS)', val: 10 },
                    { label: '11px (Small)', val: 11 },
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

              {/* Font Family Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">
                    {lang === 'km' ? 'ជ្រើសរើសពុម្ពអក្សរ (Font Family)' : 'Select Font Family'}
                  </h4>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                    {settings.fontFamily}
                  </span>
                </div>

                <div className="space-y-2">
                  {AVAILABLE_FONTS.map((font) => {
                    const isSelected = settings.fontFamily === font.id;
                    return (
                      <div
                        key={font.id}
                        onClick={() => handleSetFontFamily(font.id)}
                        className={`p-3 rounded-2xl border transition cursor-pointer select-none space-y-1 ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">
                            {font.name}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {font.khName}
                        </div>
                        <div
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 truncate"
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

          {/* TAB 3: COLUMN WIDTHS */}
          {activeTab === 'widths' && (
            <div className="space-y-4">
              {/* Width Presets */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'km' ? 'ទម្រង់កំណត់ទំហំរហ័ស (Width Presets)' : 'Width Presets'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyWidthPreset(0.85)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
                  >
                    {lang === 'km' ? 'តូច (Compact)' : 'Compact'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetColumnWidths}
                    className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer shadow-2xs"
                  >
                    {lang === 'km' ? 'ដើម (Default)' : 'Default'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWidthPreset(1.25)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
                  >
                    {lang === 'km' ? 'ធំ (Spacious)' : 'Spacious'}
                  </button>
                </div>
              </div>

              {/* Hint about draggable column borders */}
              <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {lang === 'km'
                    ? 'អ្នកក៏អាចអូសគែមជួរឈរ (Column Border Drag) ផ្ទាល់លើតារាងដើម្បីកែទំហំបានដែរ!'
                    : 'Tip: You can also drag column header borders directly on the table!'}
                </span>
              </div>

              {/* Per-column Width Adjusters */}
              <div className="space-y-1.5">
                {availableColumns
                  .filter((c) => c.id !== 'avatar' && settings.visibleColumns.includes(c.id))
                  .map((col) => {
                    const curW = settings.columnWidths[col.id] || col.defaultWidth;

                    return (
                      <div
                        key={col.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-between gap-2"
                      >
                        <div className="min-w-[120px]">
                          <div className="font-bold text-xs text-slate-800">
                            {lang === 'km' ? col.labelKh : col.labelEn}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {curW}px
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSetColumnWidth(col.id, curW - 10)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>

                          <input
                            type="range"
                            min={col.minWidth}
                            max={col.maxWidth || 450}
                            step="5"
                            value={curW}
                            onChange={(e) => handleSetColumnWidth(col.id, parseInt(e.target.value) || col.defaultWidth)}
                            className="w-24 sm:w-32 accent-indigo-600 cursor-pointer"
                          />

                          <button
                            type="button"
                            onClick={() => handleSetColumnWidth(col.id, curW + 10)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetColumnWidth(col.id, col.defaultWidth)}
                            title="Reset width"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer text-[10px]"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 4: STYLE & DENSITY */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Density Options */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-800 text-xs">
                  {lang === 'km' ? 'គម្លាតបន្ទាត់ជួរដេក (Row Density)' : 'Row Height & Density'}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact', labelEn: 'Compact', labelKh: 'កៀក (32px)' },
                    { id: 'standard', labelEn: 'Standard', labelKh: 'ល្មម (42px)' },
                    { id: 'spacious', labelEn: 'Spacious', labelKh: 'ស្រឡះ (54px)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSetDensity(item.id as TableDensity)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        settings.density === item.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 text-xs'
                      }`}
                    >
                      <div className="text-xs">{lang === 'km' ? item.labelKh : item.labelEn}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zebra Striping Toggle */}
              <div
                onClick={handleToggleZebra}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  settings.zebraStripes ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <h5 className="font-bold text-xs text-slate-800">
                    {lang === 'km' ? 'ឆ្នូតពណ៌ឆ្លាស់គ្នា (Zebra Striping)' : 'Zebra Striped Rows'}
                  </h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'km' ? 'ជួយឱ្យងាយស្រួលមើលមិនច្រឡំបន្ទាត់' : 'Subtle alternating row colors.'}
                  </p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                    settings.zebraStripes ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-2xs" />
                </div>
              </div>

              {/* Header Color Theme */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                <h5 className="font-bold text-xs text-slate-800">
                  {lang === 'km' ? 'ពណ៌ក្បាលតារាង (Header Theme)' : 'Header Color Theme'}
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'slate-light', label: 'Slate Light', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
                    { id: 'slate-dark', label: 'Dark Navy (Pro)', bg: 'bg-slate-800 text-white border-slate-900' },
                    { id: 'indigo', label: 'Indigo Brand', bg: 'bg-indigo-700 text-white border-indigo-800' },
                    { id: 'clean-white', label: 'Clean White', bg: 'bg-white text-slate-900 border-slate-200' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSetHeaderTheme(theme.id as TableHeaderTheme)}
                      className={`p-2 rounded-xl border font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                        settings.headerTheme === theme.id ? 'ring-2 ring-indigo-500 shadow-2xs' : ''
                      } ${theme.bg}`}
                    >
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Print & PDF sync */}
              <div
                onClick={handleToggleApplyToPrint}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  settings.applyToPrint ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">
                      {lang === 'km'
                        ? 'អនុវត្តលើការព្រីន & PDF (Print Sync)'
                        : 'Apply to Print & PDF Export'}
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {lang === 'km'
                        ? 'សន្លឹកម៉ោងព្រីនចេញនឹងប្រើពុម្ព និងជួរឈរដូចគ្នានេះ'
                        : 'Printout inherits customized columns & fonts.'}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                    settings.applyToPrint ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-2xs" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'កំណត់ដើម' : 'Reset'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-indigo-200"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{lang === 'km' ? 'រួចរាល់ (Done)' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
