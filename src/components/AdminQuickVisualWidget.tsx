import React, { useState, useRef, useEffect } from 'react';
import {
  Type,
  ZoomIn,
  ZoomOut,
  Sliders,
  Check,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  X
} from 'lucide-react';
import { KhmerTypographyConfig, Language, AuthUser, CompanyBranding } from '../types';
import {
  DEFAULT_KHMER_TYPOGRAPHY,
  AVAILABLE_KHMER_BODY_FONTS,
  applyKhmerTypography,
  saveTypographyToStorage
} from '../utils/typographyUtils';

interface AdminQuickVisualWidgetProps {
  currentUser?: AuthUser | null;
  lang: Language;
  branding: CompanyBranding;
  onUpdateBranding: (updated: Partial<CompanyBranding>) => void;
  onNavigateToSettingsTypography?: () => void;
}

export const AdminQuickVisualWidget: React.FC<AdminQuickVisualWidgetProps> = ({
  currentUser,
  lang,
  branding,
  onUpdateBranding,
  onNavigateToSettingsTypography
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const config: KhmerTypographyConfig = branding.typography || DEFAULT_KHMER_TYPOGRAPHY;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isAdmin) return null;

  const updateConfig = (partial: Partial<KhmerTypographyConfig>) => {
    const updated = { ...config, ...partial };
    saveTypographyToStorage(updated);
    onUpdateBranding({ typography: updated });
    applyKhmerTypography(updated, lang);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(135, (config.fontSizeScale || 112) + 4);
    updateConfig({ fontSizeScale: newScale });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(95, (config.fontSizeScale || 112) - 4);
    updateConfig({ fontSizeScale: newScale });
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Quick Trigger Button in Topbar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={lang === 'km' ? 'កែប្រែទំហំ និងពុម្ពអក្សរខ្មែរ (Admin Only)' : 'Khmer Visual & Font Scale (Admin Only)'}
        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
      >
        <Type className="w-3.5 h-3.5 text-indigo-600" />
        <span className="hidden sm:inline text-[11px]">
          {config.fontSizeScale}%
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Flyout Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800">
                {lang === 'km' ? 'ទម្រង់អក្សរខ្មែរ (Admin Visual)' : 'Khmer Visual Quick-Bar'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Size Scale Slider & Zoom Buttons */}
          <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{lang === 'km' ? 'ទំហំពង្រីកអក្សរ:' : 'Font Size Scale:'}</span>
              <span className="text-indigo-600 font-black">{config.fontSizeScale}%</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={config.fontSizeScale <= 95}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                title="Zoom Out (A-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="95"
                max="135"
                step="1"
                value={config.fontSizeScale}
                onChange={(e) => updateConfig({ fontSizeScale: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={config.fontSizeScale >= 135}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                title="Zoom In (A+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Font Selector */}
          <div className="space-y-1.5 mb-3">
            <span className="text-[11px] font-bold text-slate-600 block">
              {lang === 'km' ? 'ជ្រើសរើសពុម្ពអក្សរ (Font Family):' : 'Khmer Font Family:'}
            </span>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {AVAILABLE_KHMER_BODY_FONTS.slice(0, 4).map((f) => {
                const isSelected = config.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateConfig({ fontFamily: f.id })}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <span style={{ fontFamily: `'${f.id}', sans-serif` }}>
                      {lang === 'km' ? f.nameKh : f.nameEn}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* More Settings in Admin Settings */}
          {onNavigateToSettingsTypography && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigateToSettingsTypography();
              }}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បើកផ្ទាំងកំណត់ពេញលេញ (Full Suite)' : 'Open Full Settings'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
