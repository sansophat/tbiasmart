import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  RotateCw, 
  X, 
  Check, 
  Sparkles,
  AlertCircle,
  User
} from 'lucide-react';
import { Language } from '../types';

interface EmployeeImageUploaderProps {
  currentAvatar: string;
  onAvatarChange: (newAvatarUrl: string) => void;
  lang: Language;
}

// Curated high quality staff portrait avatar presets
const PRESET_AVATARS = [
  {
    id: 'p1',
    label: 'Male Manager',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p2',
    label: 'Female Staff 1',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p3',
    label: 'Male Staff 1',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p4',
    label: 'Female Staff 2',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p5',
    label: 'Male Staff 2',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p6',
    label: 'Female Staff 3',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p7',
    label: 'Male Barista / Bartender',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p8',
    label: 'Female Reception / Cashier',
    url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&auto=format&fit=crop&q=80',
  },
];

export const EmployeeImageUploader: React.FC<EmployeeImageUploaderProps> = ({
  currentAvatar,
  onAvatarChange,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets' | 'url'>('upload');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Compress / resize image using HTMLCanvas to keep localStorage compact and fast
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(lang === 'km' ? 'សូមជ្រើសរើសឯកសារជារូបភាព (PNG, JPG, WebP)!' : 'Please select an image file (PNG, JPG, WebP)!');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onAvatarChange(dataUrl);
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setIsProcessing(false);
        alert(lang === 'km' ? 'មិនអាចបើករូបភាពបានទេ' : 'Failed to parse image file.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 640 },
            facingMode: 'user',
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } else {
        setCameraError(lang === 'km' ? 'កម្មវិធីរុករកមិនគាំទ្រកាមេរ៉ា' : 'Camera not supported in this browser environment.');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        lang === 'km'
          ? 'មិនអាចបើកកាមេរ៉ាបានទេ (សូមពិនិត្យសិទ្ធិកាមេរ៉ា)'
          : 'Unable to access camera. Please grant camera permission or use file upload.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Crop center square
      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - minDim) / 2;
      const startY = (video.videoHeight - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onAvatarChange(dataUrl);
      stopCamera();
    }
  };

  // Handle Tab Switch
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onAvatarChange(urlInput.trim());
    setUrlInput('');
  };

  return (
    <div className="space-y-3">
      {/* Current Preview Card */}
      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="relative">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Employee Avatar Preview"
              className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-400">
              <User className="w-8 h-8" />
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
              <RotateCw className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>{lang === 'km' ? 'រូបថតបុគ្គលិក' : 'Employee Portrait Photo'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
              ID Badge
            </span>
          </h5>
          <p className="text-[11px] text-slate-500 font-medium">
            {lang === 'km'
              ? 'រូបថតនឹងត្រូវបង្ហាញលើកាតឌីជីថល QR និងផ្ទាំងវត្តមាន'
              : 'Appears on Digital Badges, Entrance Kiosk, & Attendance Logs'}
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 transition ${
            activeTab === 'upload'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{lang === 'km' ? 'បញ្ចូលរូប (Upload)' : 'Upload File'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 transition ${
            activeTab === 'camera'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{lang === 'km' ? 'ថតរូប (Camera)' : 'Take Photo'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 transition ${
            activeTab === 'presets'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'km' ? 'គំរូរូប (Presets)' : 'Presets'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 transition ${
            activeTab === 'url'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>URL</span>
        </button>
      </div>

      {/* TAB 1: File Upload (Click + Drag & Drop) */}
      {activeTab === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
              : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-indigo-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              {lang === 'km'
                ? 'ចុចទីនេះ ឬទម្លាក់រូបភាព (Drag & Drop)'
                : 'Click to upload or drag and drop photo'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              JPG, PNG, WebP up to 5MB (Auto-cropped & compressed)
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Live Camera Capture */}
      {activeTab === 'camera' && (
        <div className="bg-slate-900 rounded-2xl p-3 text-white space-y-3 overflow-hidden">
          {cameraError ? (
            <div className="p-4 bg-rose-950/80 border border-rose-600/40 rounded-xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                {lang === 'km' ? 'ព្យាយាមម្តងទៀត' : 'Retry Camera'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative aspect-square max-h-48 rounded-xl overflow-hidden bg-black mx-auto border border-slate-700 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Guide overlay */}
                <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-full pointer-events-none" />
              </div>

              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ថតរូបឥឡូវនេះ (Snap)' : 'Capture Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  title="Switch / Restart camera"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Preset Curated Avatars */}
      {activeTab === 'presets' && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 font-medium">
            {lang === 'km'
              ? 'ជ្រើសរើសរូបតំណាងគំរូសម្រាប់បុគ្គលិក:'
              : 'Choose a portrait preset:'}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AVATARS.map((preset) => {
              const isSelected = currentAvatar === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onAvatarChange(preset.url)}
                  className={`relative rounded-xl overflow-hidden border-2 transition group ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-300'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full aspect-square object-cover group-hover:scale-105 transition duration-200"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Web Image URL Input */}
      {activeTab === 'url' && (
        <div className="flex space-x-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            {lang === 'km' ? 'ប្រើប្រាស់' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
};
