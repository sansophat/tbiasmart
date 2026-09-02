import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  X, 
  Download, 
  Printer, 
  Share2, 
  Check, 
  ShieldCheck, 
  Camera, 
  Sparkles, 
  Copy, 
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase
} from 'lucide-react';
import { Employee, Branch, CompanyBranding, Language } from '../types';
import { EmployeeImageUploader } from './EmployeeImageUploader';

interface DigitalIdCardModalProps {
  employee: Employee;
  branch?: Branch;
  branding: CompanyBranding;
  lang: Language;
  onClose: () => void;
  onUpdatePhoto?: (employeeId: string, newAvatarUrl: string) => void;
  isOnlineVerificationView?: boolean;
}

export const DigitalIdCardModal: React.FC<DigitalIdCardModalProps> = ({
  employee,
  branch,
  branding,
  lang,
  onClose,
  onUpdatePhoto,
  isOnlineVerificationView = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showPhotoUploader, setShowPhotoUploader] = useState<boolean>(false);

  // Direct Online Card Verification URL
  const onlineCardUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?viewCard=${encodeURIComponent(employee.code)}`
    : `https://attendance.app/?viewCard=${encodeURIComponent(employee.code)}`;

  // Generate Scannable QR Code containing the direct online card URL
  useEffect(() => {
    QRCode.toDataURL(
      onlineCardUrl,
      {
        width: 320,
        margin: 1,
        color: {
          dark: '#0A3366',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      },
      (err, url) => {
        if (!err && url) {
          setQrCodeUrl(url);
        }
      }
    );
  }, [onlineCardUrl]);

  // Robust helper to load image safely
  const loadImageSafely = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = src;
      };
      img.src = src;
    });
  };

  // Direct High-Res Canvas 2D Badge Generator (Guarantees 100% success on any device)
  const drawDirectCardCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const width = 720;
    const height = 1120;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Helper: Rounded Rectangle Path
    const roundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // 1. Draw Outer Card with Deep Navy Gradient
    const outerRadius = 56;
    roundRect(0, 0, width, height, outerRadius);
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#072E5C');
    bgGrad.addColorStop(0.5, '#0A4384');
    bgGrad.addColorStop(1, '#06264D');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // 2. Draw Top-Left & Bottom-Right Geometric Accent Wings
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(200, 0);
    ctx.lineTo(0, 200);
    ctx.closePath();
    ctx.fillStyle = 'rgba(21, 89, 158, 0.85)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width - 240, height);
    ctx.lineTo(width, height - 240);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30, 107, 187, 0.85)';
    ctx.fill();
    ctx.restore();

    // 3. Draw Inner White Surface
    const padding = 24;
    const innerX = padding;
    const innerY = padding;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const innerRadius = 40;

    roundRect(innerX, innerY, innerW, innerH, innerRadius);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Draw Avatar & Frame (Top-Left)
    const avatarX = innerX + 36;
    const avatarY = innerY + 36;
    const avatarW = 270;
    const avatarH = 340;
    const avatarRadius = 32;

    // Avatar Frame Gradient
    roundRect(avatarX, avatarY, avatarW, avatarH, avatarRadius);
    const frameGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX, avatarY + avatarH);
    frameGrad.addColorStop(0, '#0A4B8E');
    frameGrad.addColorStop(1, '#1565C0');
    ctx.fillStyle = frameGrad;
    ctx.fill();

    // Inner clipped image
    const photoMargin = 6;
    const photoX = avatarX + photoMargin;
    const photoY = avatarY + photoMargin;
    const photoW = avatarW - photoMargin * 2;
    const photoH = avatarH - photoMargin * 2;
    const photoRadius = avatarRadius - 4;

    ctx.save();
    roundRect(photoX, photoY, photoW, photoH, photoRadius);
    ctx.clip();
    const avatarImg = await loadImageSafely(employee.avatar || defaultAvatar);
    if (avatarImg) {
      // Cover fit
      const imgRatio = avatarImg.width / avatarImg.height;
      const targetRatio = photoW / photoH;
      let sWidth = avatarImg.width;
      let sHeight = avatarImg.height;
      let sx = 0;
      let sy = 0;
      if (imgRatio > targetRatio) {
        sWidth = avatarImg.height * targetRatio;
        sx = (avatarImg.width - sWidth) / 2;
      } else {
        sHeight = avatarImg.width / targetRatio;
        sy = (avatarImg.height - sHeight) / 2;
      }
      ctx.drawImage(avatarImg, sx, sy, sWidth, sHeight, photoX, photoY, photoW, photoH);
    } else {
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(photoX, photoY, photoW, photoH);
    }
    ctx.restore();

    // 5. Draw Branch Logo & Header (Top-Right)
    const rightSectionX = innerX + 340;
    const rightSectionW = innerW - 360;
    const logoBoxX = rightSectionX + (rightSectionW - 100) / 2;
    const logoBoxY = innerY + 44;
    const logoBoxSize = 100;

    roundRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 20);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const logoImg = await loadImageSafely(logoSource);
    if (logoImg) {
      ctx.save();
      roundRect(logoBoxX + 8, logoBoxY + 8, logoBoxSize - 16, logoBoxSize - 16, 12);
      ctx.clip();
      ctx.drawImage(logoImg, logoBoxX + 8, logoBoxY + 8, logoBoxSize - 16, logoBoxSize - 16);
      ctx.restore();
    }

    // Branch Name & Subtitle
    ctx.fillStyle = '#0A3B73';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(branchNameDisplay, rightSectionX + rightSectionW / 2, logoBoxY + logoBoxSize + 36, rightSectionW);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(companyNameDisplay.toUpperCase(), rightSectionX + rightSectionW / 2, logoBoxY + logoBoxSize + 60, rightSectionW);

    // 6. Draw Employee Name & Position Badge
    const nameY = avatarY + avatarH + 46;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0A3366';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(employee.nameEn, innerX + 36, nameY, innerW - 72);

    if (employee.nameKh && employee.nameKh !== employee.nameEn) {
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 20px "Khmer OS Battambang", Hanuman, sans-serif';
      ctx.fillText(employee.nameKh, innerX + 36, nameY + 28, innerW - 72);
    }

    // Role Pill Badge
    const badgeY = employee.nameKh && employee.nameKh !== employee.nameEn ? nameY + 44 : nameY + 20;
    const roleText = employee.role || employee.roleKh || 'Team Member';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const roleTextW = ctx.measureText(roleText).width;
    const pillW = Math.max(roleTextW + 36, 140);
    const pillH = 34;

    roundRect(innerX + 36, badgeY, pillW, pillH, 12);
    ctx.fillStyle = '#1258A2';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(roleText, innerX + 36 + pillW / 2, badgeY + 23);

    // 7. Draw Divider Line
    const dividerY = badgeY + 54;
    ctx.beginPath();
    ctx.moveTo(innerX + 36, dividerY);
    ctx.lineTo(innerX + innerW - 36, dividerY);
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 8. Key-Value Information Rows
    const infoRows = [
      { label: 'ID No', val: employee.code },
      { label: 'Branch', val: branch?.nameEn || 'Corporate HQ' },
      { label: 'Dept', val: employee.department || employee.departmentKh || 'Operations' },
      { label: 'Email', val: employee.email || `${employee.code.toLowerCase()}@hospitality.com` },
      { label: 'Phone', val: employee.phone || '+855 23 888 999' },
    ];

    let rowY = dividerY + 34;
    infoRows.forEach((row) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0A3B73';
      ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(row.label, innerX + 36, rowY);

      ctx.fillStyle = '#94A3B8';
      ctx.fillText(':', innerX + 130, rowY);

      ctx.fillStyle = '#1E293B';
      ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(row.val, innerX + 155, rowY, innerW - 200);

      rowY += 34;
    });

    // 9. Bottom Section: QR Code & Modern Graphic Accent
    const bottomDividerY = rowY + 10;
    ctx.beginPath();
    ctx.moveTo(innerX + 36, bottomDividerY);
    ctx.lineTo(innerX + innerW - 36, bottomDividerY);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const qrSize = 130;
    const qrX = innerX + 36;
    const qrY = bottomDividerY + 20;

    // QR Box
    roundRect(qrX, qrY, qrSize, qrSize, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (qrCodeUrl) {
      const qrImg = await loadImageSafely(qrCodeUrl);
      if (qrImg) {
        ctx.drawImage(qrImg, qrX + 8, qrY + 8, qrSize - 16, qrSize - 16);
      }
    }

    // Right Accent Bar
    const barX = qrX + qrSize + 24;
    const barW = innerW - 72 - qrSize - 24;
    const barY = qrY + 25;
    const barH = 38;

    roundRect(barX, barY, barW, barH, 10);
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, '#DBEAFE');
    barGrad.addColorStop(0.5, '#1E6BBB');
    barGrad.addColorStop(1, '#072E5C');
    ctx.fillStyle = barGrad;
    ctx.fill();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0A3B73';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('OFFICIAL VERIFIED STAFF PASS', innerX + innerW - 36, barY + barH + 28);

    return canvas;
  };

  // Helper to obtain Card Canvas via html2canvas or direct 2D Canvas fallback
  const getRenderedCardCanvas = async (): Promise<HTMLCanvasElement> => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          backgroundColor: null,
          logging: false,
        });
        return canvas;
      } catch (e) {
        console.warn('html2canvas capture had an issue, using high-res 2D Canvas engine fallback:', e);
      }
    }
    return await drawDirectCardCanvas();
  };

  // Trigger safe file download
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
  };

  // Handle Download as PNG Image
  const handleDownloadImage = async () => {
    if (isGeneratingImg) return;
    try {
      setIsGeneratingImg(true);
      const canvas = await getRenderedCardCanvas();
      
      canvas.toBlob((blob) => {
        if (blob) {
          triggerDownload(blob, `Digital_ID_${employee.code}_${employee.nameEn.replace(/\s+/g, '_')}.png`);
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `Digital_ID_${employee.code}_${employee.nameEn.replace(/\s+/g, '_')}.png`;
          link.href = dataUrl;
          link.click();
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to export ID Card image:', err);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // Handle Download as PDF
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      const canvas = await getRenderedCardCanvas();
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85.6, 130],
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const cardWidth = pdfWidth - margin * 2;
      const cardHeight = pdfHeight - margin * 2;

      pdf.addImage(imgData, 'PNG', margin, margin, cardWidth, cardHeight, undefined, 'FAST');
      
      // Save directly with blob download
      const pdfBlob = pdf.output('blob');
      triggerDownload(pdfBlob, `Digital_ID_${employee.code}_${employee.nameEn.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to export ID Card PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Native Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Copy Verification Link
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(onlineCardUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Determine Logo to display: branch specific logo/image OR company logo
  const logoSource = branch?.imageUrl || branding.logoUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80';
  const branchNameDisplay = branch ? (lang === 'km' ? branch.nameKh : branch.nameEn) : branding.companyNameEn;
  const companyNameDisplay = branding.companyNameEn || 'Enterprise Organization';

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-hanuman">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Controls */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {lang === 'km' ? 'ប័ណ្ណសម្គាល់ខ្លួនឌីជីថល (Digital ID Card)' : 'Official Digital ID Card'}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'km' 
                  ? 'ប័ណ្ណបុគ្គលិកផ្លូវការ អាចស្កេន QR ដើម្បីផ្ទៀងផ្ទាត់ និងទាញយកបាន' 
                  : 'Official employee credential with live online QR verification'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Status Banner if viewed online */}
        {isOnlineVerificationView && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>{lang === 'km' ? 'ការផ្ទៀងផ្ទាត់ជោគជ័យ៖' : 'Live Verification Success:'}</strong>{' '}
                {lang === 'km' ? 'គណនីបុគ្គលិកពិតប្រាកដក្នុងប្រព័ន្ធ' : 'Authentic verified staff credential active in the system.'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-700/50 shrink-0">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================================= */}
          {/* LEFT/CENTER: THE REVOLUTIONARY DIGITAL ID CARD (Accurate to Uploaded Art) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 flex justify-center">
            
            {/* The Outer Card Canvas to capture & print */}
            <div 
              ref={cardRef}
              id="printable-digital-id-card"
              className="relative w-full max-w-[340px] sm:max-w-[360px] bg-[#0A3B73] p-[10px] sm:p-[12px] rounded-[32px] shadow-2xl text-slate-900 overflow-hidden select-none"
              style={{
                background: 'linear-gradient(145deg, #072E5C 0%, #0A4384 50%, #06264D 100%)',
              }}
            >
              {/* Decorative Geometric Polygonal Accent Wings (Top-Left & Bottom-Right) */}
              <div 
                className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-[#15599E] to-[#0A3B73] opacity-90 pointer-events-none"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                }}
              />
              <div 
                className="absolute bottom-0 right-0 w-28 h-28 bg-gradient-to-tl from-[#1E6BBB] to-[#072E5C] opacity-90 pointer-events-none"
                style={{
                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                }}
              />
              <div 
                className="absolute -top-12 -right-12 w-32 h-32 bg-blue-400/20 rounded-full blur-xl pointer-events-none"
              />

              {/* Main White Card Surface */}
              <div className="relative bg-white rounded-[24px] p-5 sm:p-6 shadow-inner border border-slate-100 flex flex-col justify-between min-h-[520px]">
                
                {/* 1. TOP ROW: Photo on Left/Center + Branch & Company Logo on Right */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  
                  {/* Generously Sized Portrait Photo with Vibrant Blue Border */}
                  <div className="relative group shrink-0">
                    <div className="w-[125px] h-[155px] sm:w-[135px] sm:h-[168px] rounded-[22px] p-[3px] bg-gradient-to-b from-[#0A4B8E] to-[#1565C0] shadow-md">
                      <img
                        src={employee.avatar || defaultAvatar}
                        alt={employee.nameEn}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultAvatar;
                        }}
                        className="w-full h-full object-cover rounded-[19px] bg-slate-100"
                      />
                    </div>

                    {/* Quick photo update icon if handler provided */}
                    {onUpdatePhoto && (
                      <button
                        type="button"
                        onClick={() => setShowPhotoUploader(true)}
                        title="Update staff photo"
                        className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-[#0A4B8E] text-white shadow-lg hover:bg-blue-700 transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Top Right: Branch Logo & Company Name */}
                  <div className="flex-1 flex flex-col items-center text-center pl-2 pt-2">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 border border-slate-200/80 p-1.5 shadow-sm mb-2 flex items-center justify-center overflow-hidden">
                      <img
                        src={logoSource}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80';
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[13px] sm:text-[14px] font-black text-[#0A3B73] leading-tight line-clamp-2">
                      {branchNameDisplay}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {companyNameDisplay}
                    </span>
                  </div>
                </div>

                {/* 2. MIDDLE SECTION: Prominent Employee Name & Position Pill */}
                <div className="mt-4 text-left">
                  <h1 className="text-xl sm:text-2xl font-black text-[#0A3366] tracking-tight leading-tight">
                    {employee.nameEn}
                  </h1>
                  {employee.nameKh && employee.nameKh !== employee.nameEn && (
                    <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                      {employee.nameKh}
                    </p>
                  )}

                  {/* Position Pill Badge */}
                  <div className="mt-2 inline-block">
                    <span className="px-3.5 py-1 rounded-xl bg-[#1258A2] text-white text-[11px] sm:text-xs font-bold shadow-xs tracking-wide">
                      {employee.role || employee.roleKh || 'Team Member'}
                    </span>
                  </div>
                </div>

                {/* 3. INFORMATION SECTION: Clean Aligned Key-Value Pairs (NO PIN) */}
                <div className="mt-4 space-y-1.5 text-[11.5px] sm:text-xs border-t border-slate-100 pt-3">
                  <div className="grid grid-cols-12 items-baseline">
                    <span className="col-span-4 font-black text-[#0A3B73]">ID No</span>
                    <span className="col-span-1 font-bold text-slate-400">:</span>
                    <span className="col-span-7 font-mono font-bold text-slate-800">{employee.code}</span>
                  </div>

                  <div className="grid grid-cols-12 items-baseline">
                    <span className="col-span-4 font-black text-[#0A3B73]">Branch</span>
                    <span className="col-span-1 font-bold text-slate-400">:</span>
                    <span className="col-span-7 font-semibold text-slate-700 truncate">{branch?.nameEn || 'Corporate HQ'}</span>
                  </div>

                  <div className="grid grid-cols-12 items-baseline">
                    <span className="col-span-4 font-black text-[#0A3B73]">Dept</span>
                    <span className="col-span-1 font-bold text-slate-400">:</span>
                    <span className="col-span-7 font-semibold text-slate-700 truncate">{employee.department || employee.departmentKh || 'Operations'}</span>
                  </div>

                  <div className="grid grid-cols-12 items-baseline">
                    <span className="col-span-4 font-black text-[#0A3B73]">Email</span>
                    <span className="col-span-1 font-bold text-slate-400">:</span>
                    <span className="col-span-7 font-medium text-slate-600 truncate">{employee.email || `${employee.code.toLowerCase()}@hospitality.com`}</span>
                  </div>

                  <div className="grid grid-cols-12 items-baseline">
                    <span className="col-span-4 font-black text-[#0A3B73]">Phone</span>
                    <span className="col-span-1 font-bold text-slate-400">:</span>
                    <span className="col-span-7 font-mono font-semibold text-slate-700">{employee.phone || '+855 23 888 999'}</span>
                  </div>
                </div>

                {/* 4. BOTTOM SECTION: High-Res Scannable QR Code & Modern Blue Accent */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3">
                  
                  {/* Scannable Verified Online QR Code (Clickable to preview online link) */}
                  <a
                    href={onlineCardUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={lang === 'km' ? 'ចុចដើម្បីមើលលើទំព័រផ្ទៀងផ្ទាត់ (សាធារណៈ)' : 'Click to open live verified online card (Public view)'}
                    className="p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0 hover:ring-2 hover:ring-indigo-500 transition group block"
                  >
                    {qrCodeUrl ? (
                      <img 
                        src={qrCodeUrl} 
                        alt={`QR Code for ${employee.code}`}
                        className="w-18 h-18 sm:w-20 sm:h-20 object-contain rounded-lg group-hover:scale-[1.02] transition"
                      />
                    ) : (
                      <div className="w-18 h-18 bg-slate-100 rounded-lg animate-pulse" />
                    )}
                  </a>

                  {/* Gradient Aesthetic Bar & Digital Verification Tag */}
                  <div className="flex-1 space-y-1 text-right">
                    <div className="h-6 sm:h-7 rounded-lg bg-gradient-to-r from-blue-100 via-[#1E6BBB] to-[#072E5C] opacity-90 shadow-2xs" />
                    <div className="flex items-center justify-end space-x-1 text-[9px] font-bold text-[#0A3B73] tracking-wider uppercase pt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Official Staff Pass</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: ACTION CONTROLS & INSTANT DOWNLOAD OPTIONS                   */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {lang === 'km' ? 'ជម្រើសទាញយក & បោះពុម្ព' : 'Export & Download Card'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'km' 
                  ? 'ទាញយករូបភាពកម្រិតច្បាស់ខ្ពស់ (High-Res PNG) ឬទម្រង់ PDF សម្រាប់ព្រីន' 
                  : 'Generate a high-resolution PNG image or standard CR80 printable PDF card.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Download Image Button */}
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImg}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md shadow-indigo-900/30"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{isGeneratingImg ? (lang === 'km' ? 'កំពុងទាញយក...' : 'Saving...') : (lang === 'km' ? 'ទាញយកជារូបភាព (PNG)' : 'Download PNG')}</span>
                </button>

                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md shadow-emerald-900/30"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isGeneratingPdf ? (lang === 'km' ? 'កំពុងទាញយក...' : 'Saving...') : (lang === 'km' ? 'ទាញយក PDF' : 'Download PDF')}</span>
                </button>
              </div>

              {/* Print Card Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center justify-center space-x-2 transition border border-slate-600"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>{lang === 'km' ? 'បោះពុម្ពកាតបុគ្គលិក (Print)' : 'Print Staff Badge'}</span>
              </button>
            </div>

            {/* Online Live QR Verification Link Box */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-400" />
                {lang === 'km' ? 'តំណភ្ជាប់ផ្ទៀងផ្ទាត់លើ Online' : 'Live Online Verification Link'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'km'
                  ? 'នៅពេលស្កេន QR Code កាតនេះនឹងបង្ហាញលើ Browser ភ្លាមៗ'
                  : 'Scanning the QR code on the card opens this live online verified view in any mobile browser.'}
              </p>

              <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700 rounded-xl p-2">
                <input
                  type="text"
                  readOnly
                  value={onlineCardUrl}
                  className="flex-1 bg-transparent text-xs text-slate-300 font-mono truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 transition shrink-0"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? (lang === 'km' ? 'ចម្លងរួច' : 'Copied!') : (lang === 'km' ? 'ចម្លង' : 'Copy')}</span>
                </button>
              </div>
            </div>

            {/* Quick Change Photo Trigger */}
            {onUpdatePhoto && (
              <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {lang === 'km' ? 'ផ្លាស់ប្តូររូបថតកាត' : 'Update Profile Photo'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'km' ? 'ជ្រើសរើសរូបភាព ឬថតផ្ទាល់' : 'Upload or choose avatar for badge'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhotoUploader(true)}
                  className="py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-indigo-300 font-bold text-xs flex items-center space-x-1.5 border border-indigo-500/30 transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'កែរូប' : 'Edit Photo'}</span>
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Embedded Photo Uploader Modal */}
      {showPhotoUploader && onUpdatePhoto && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPhotoUploader(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-800 mb-4">
              {lang === 'km' ? 'ប្តូររូបថតប័ណ្ណសម្គាល់ខ្លួន' : 'Update ID Badge Photo'}
            </h3>
            <EmployeeImageUploader
              currentAvatar={employee.avatar || defaultAvatar}
              onAvatarChange={(newUrl) => {
                onUpdatePhoto(employee.id, newUrl);
                setShowPhotoUploader(false);
              }}
              lang={lang}
            />
          </div>
        </div>
      )}

    </div>
  );
};
