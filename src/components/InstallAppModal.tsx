import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share2, 
  PlusSquare, 
  MoreVertical, 
  CheckCircle2, 
  X, 
  Sparkles,
  ExternalLink,
  Laptop,
  Image as ImageIcon,
  Upload,
  Check,
  Building2,
  Palette
} from 'lucide-react';
import { CompanyBranding, Language } from '../types';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding: CompanyBranding;
  onUpdateBranding?: (branding: CompanyBranding) => void;
  lang: Language;
}

const INSTALL_ICON_PRESETS = [
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=200&auto=format&fit=crop&q=80'
];

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  branding,
  onUpdateBranding,
  lang
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<'ios' | 'android' | 'windows'>('android');
  const [showLogoSelector, setShowLogoSelector] = useState(false);

  useEffect(() => {
    // Detect device platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIos) {
      setDeviceType('ios');
      setSelectedPlatformTab('ios');
    } else if (isAndroid) {
      setDeviceType('android');
      setSelectedPlatformTab('android');
    } else {
      setDeviceType('desktop');
      setSelectedPlatformTab('windows');
    }

    // Check if already installed in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleNativeInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && onUpdateBranding) {
        onUpdateBranding({
          ...branding,
          logoUrl: reader.result,
          appIcon: reader.result
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (url: string) => {
    if (onUpdateBranding) {
      onUpdateBranding({
        ...branding,
        logoUrl: url,
        appIcon: url
      });
    }
  };

  const appDisplayName = lang === 'km' 
    ? (branding.companyNameKh || 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន QR & GPS')
    : (branding.companyNameEn || 'Smart Attendance System');

  const appIcon = branding.logoUrl || branding.appIcon || INSTALL_ICON_PRESETS[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-6 space-y-5 font-hanuman">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="relative mx-auto w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-indigo-100 ring-4 ring-indigo-50/50 group">
            <img src={appIcon} alt="App Icon" className="w-full h-full object-cover" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 font-battambang">
              {lang === 'km' ? 'ដំឡើងកម្មវិធីលើឧបករណ៍របស់អ្នក' : 'Install App to Your Device'}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
              {lang === 'km' 
                ? `បង្ហាញ Logo និងឈ្មោះ ${appDisplayName} នៅលើអេក្រង់ដើម (Home Screen)`
                : `Add ${appDisplayName} with custom icon & name to your Home Screen`}
            </p>
          </div>

          {/* Direct Branding & Logo Selector Toggle */}
          {onUpdateBranding && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowLogoSelector(!showLogoSelector)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'km' ? 'ផ្លាស់ប្តូរ Logo & រូបតំណាង App (Change App Icon)' : 'Change App Icon & Logo'}</span>
              </button>

              {showLogoSelector && (
                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-left animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      {lang === 'km' ? 'ជ្រើសរើស Logo សម្រាប់ដំឡើងលើ Device:' : 'Choose App Icon for Devices:'}
                    </span>
                    <label className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[10px] cursor-pointer transition shadow-2xs">
                      <Upload className="w-3 h-3 text-indigo-600" />
                      <span>{lang === 'km' ? 'បញ្ចូលរូបភាពថ្មី' : 'Upload Image'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1">
                    {INSTALL_ICON_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`relative w-11 h-11 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                          branding.logoUrl === preset
                            ? 'border-indigo-600 ring-2 ring-indigo-400 shadow-sm scale-105'
                            : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <img src={preset} alt={`Icon ${idx + 1}`} className="w-full h-full object-cover" />
                        {branding.logoUrl === preset && (
                          <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 1-Click Native Install Banner if Supported */}
        {deferredPrompt && !isInstalled && (
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-4 text-white space-y-3 shadow-md shadow-indigo-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm font-battambang">
                  {lang === 'km' ? 'ដំឡើងដោយស្វ័យប្រវត្ត ១-Click' : '1-Click Fast Install Ready'}
                </h4>
                <p className="text-[11px] text-indigo-100">
                  {lang === 'km' ? 'កម្មវិធីដំណើរការលឿន ងាយស្រួលស្កេន និងមិនបាត់ទិន្នន័យ' : 'Fast standalone mode with instant punch access'}
                </p>
              </div>
            </div>
            <button
              onClick={handleNativeInstallClick}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer font-battambang"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'km' ? 'ដំឡើងឥឡូវនេះ (Install Now)' : 'Install Now to Home Screen'}</span>
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              {lang === 'km' ? 'កម្មវិធីត្រូវបានដំឡើងនៅលើឧបករណ៍រួចរាល់ហើយ!' : 'Application is already installed on your device!'}
            </span>
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold font-battambang">
          <button
            type="button"
            onClick={() => setSelectedPlatformTab('android')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              selectedPlatformTab === 'android' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatformTab('ios')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              selectedPlatformTab === 'ios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>iPhone / iPad</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatformTab('windows')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              selectedPlatformTab === 'windows' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-sky-600" />
            <span>PC / Windows</span>
          </button>
        </div>

        {/* Step-by-step instructions based on platform */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-3">
          {selectedPlatformTab === 'ios' && (
            <div className="space-y-2.5">
              <span className="font-bold text-slate-800 text-xs block font-battambang">
                {lang === 'km' ? '📱 របៀបដំឡើងលើ iPhone / iPad (Safari):' : '📱 iOS Safari Instructions:'}
              </span>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <p className="text-slate-600">
                  {lang === 'km' 
                    ? 'បើកគេហទំព័រនេះក្នុងកម្មវិធី Safari រួចចុចប៊ូតុង Share (ចែករំលែក)'
                    : 'Open this app in Safari and tap the Share button'}
                  <Share2 className="w-3.5 h-3.5 inline mx-1 text-indigo-600" />
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <p className="text-slate-600">
                  {lang === 'km'
                    ? 'អូសចុះក្រោម រួចជ្រើសរើសយក "Add to Home Screen" (បន្ថែមទៅអេក្រង់ដើម)'
                    : 'Scroll down and tap "Add to Home Screen"'}
                  <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-indigo-600" />
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <p className="text-slate-600">
                  {lang === 'km'
                    ? 'ចុច "Add" នៅជ្រុងខាងស្តាំខាងលើ។ Logo និងឈ្មោះក្រុមហ៊ុននឹងបង្ហាញលើអេក្រង់ដើម!'
                    : 'Tap "Add" at the top right. The company logo & name will appear on your Home Screen!'}
                </p>
              </div>
            </div>
          )}

          {selectedPlatformTab === 'android' && (
            <div className="space-y-2.5">
              <span className="font-bold text-slate-800 text-xs block font-battambang">
                {lang === 'km' ? '🤖 របៀបដំឡើងលើ Android (Chrome):' : '🤖 Android Chrome Instructions:'}
              </span>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <p className="text-slate-600">
                  {lang === 'km' 
                    ? 'ចុចលើសញ្ញាចុចបី (Menu)' 
                    : 'Tap the three dots menu at top right'}
                  <MoreVertical className="w-3.5 h-3.5 inline mx-1 text-emerald-600" />
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <p className="text-slate-600">
                  {lang === 'km'
                    ? 'ជ្រើសរើសយក "Install App" (ដំឡើងកម្មវិធី) ឬ "Add to Home screen"'
                    : 'Select "Install app" or "Add to Home screen"'}
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <p className="text-slate-600">
                  {lang === 'km'
                    ? 'ចុច "Install" ដើម្បីបញ្ជាក់។ កម្មវិធីនឹងត្រូវបន្ថែមលើ Home Screen ដូច App ធម្មតា!'
                    : 'Confirm "Install". The app will appear on your app drawer and home screen!'}
                </p>
              </div>
            </div>
          )}

          {selectedPlatformTab === 'windows' && (
            <div className="space-y-2.5">
              <span className="font-bold text-slate-800 text-xs block font-battambang">
                {lang === 'km' ? '💻 របៀបដំឡើងលើ Windows / Mac / Chrome / Edge:' : '💻 Desktop Chrome & Edge Instructions:'}
              </span>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <p className="text-slate-600">
                  {lang === 'km' 
                    ? 'ចុចលើ Icon ដំឡើង (Install App icon) នៅក្នុង Address Bar ខាងស្តាំដៃ'
                    : 'Click the Install icon in the browser address bar on the right'}
                  <Download className="w-3.5 h-3.5 inline mx-1 text-sky-600" />
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <p className="text-slate-600">
                  {lang === 'km'
                    ? 'ចុច "Install" ដើម្បីបង្កើត Shortcut លើ Windows Taskbar & Desktop Title Bar'
                    : 'Click "Install" to create a dedicated app window with custom title bar & icon'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live Device Home Screen Simulation */}
        <div className="p-3 bg-slate-100 rounded-2xl text-center space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            {lang === 'km' ? 'ទម្រង់បង្ហាញលើ Home Screen:' : 'Home Screen Preview:'}
          </span>
          <div className="inline-flex flex-col items-center p-2 bg-white/70 backdrop-blur rounded-2xl border border-slate-200 shadow-sm">
            <img src={appIcon} alt="Icon" className="w-12 h-12 rounded-xl object-cover shadow-md" />
            <span className="text-[11px] font-bold text-slate-800 mt-1 font-battambang max-w-[120px] truncate text-center">
              {appDisplayName}
            </span>
          </div>
        </div>

        {/* Close action */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer font-battambang"
        >
          {lang === 'km' ? 'បិទផ្ទាំង (Done)' : 'Close'}
        </button>
      </div>
    </div>
  );
};
