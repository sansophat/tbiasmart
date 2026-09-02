import { CompanyBranding, Language } from '../types';

/**
 * Dynamically updates document title, favicons, meta tags, and Web App Manifest (PWA)
 * so that when the app is opened or installed to any device home screen, it shows the custom logo and name.
 */
let currentManifestObjectUrl: string | null = null;

export function updateDynamicAppBranding(branding: CompanyBranding, lang: Language = 'km') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const appName = lang === 'km' 
    ? (branding.companyNameKh || 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន QR & GPS')
    : (branding.companyNameEn || 'Smart QR & GPS Attendance System');
  
  const appSlogan = lang === 'km' ? branding.sloganKh : branding.sloganEn;
  const fullTitle = appSlogan ? `${appName} | ${appSlogan}` : appName;

  // 1. Update Window Title Bar
  document.title = fullTitle;

  // 2. Update or Create Meta Tags
  updateOrCreateMetaTag('application-name', appName);
  updateOrCreateMetaTag('apple-mobile-web-app-title', appName);
  updateOrCreateMetaTag('apple-mobile-web-app-capable', 'yes');
  updateOrCreateMetaTag('apple-mobile-web-app-status-bar-style', 'default');
  updateOrCreateMetaTag('theme-color', branding.primaryColor || '#4f46e5');
  updateOrCreateMetaTag('description', appSlogan || `${appName} - Multi-branch QR & GPS Attendance System`);

  // 3. Update Favicon and Apple Touch Icons
  const iconUrl = branding.logoUrl || branding.appIcon || 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=192&auto=format&fit=crop&q=80';

  updateOrCreateLinkTag('icon', iconUrl, 'image/png');
  updateOrCreateLinkTag('shortcut icon', iconUrl, 'image/png');
  updateOrCreateLinkTag('apple-touch-icon', iconUrl);
  updateOrCreateLinkTag('apple-touch-icon-precomposed', iconUrl);

  // 4. Update or Generate Dynamic PWA Web App Manifest
  try {
    const manifestJson = {
      name: `${branding.companyNameKh || 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន'} - ${branding.companyNameEn || 'Attendance System'}`,
      short_name: (branding.companyNameKh || branding.companyNameEn || 'Attendance').slice(0, 20),
      description: appSlogan || 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកគ្រប់សាខា និងគម្រោងទាំងអស់តាមអនឡាញដោយប្រើ QR Code និង GPS Geofencing',
      start_url: '.',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: branding.primaryColor || '#4f46e5',
      orientation: 'portrait-primary',
      categories: ['business', 'productivity', 'utilities'],
      icons: [
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };

    const manifestBlob = new Blob([JSON.stringify(manifestJson, null, 2)], {
      type: 'application/manifest+json'
    });

    if (currentManifestObjectUrl) {
      URL.revokeObjectURL(currentManifestObjectUrl);
    }

    currentManifestObjectUrl = URL.createObjectURL(manifestBlob);
    updateOrCreateLinkTag('manifest', currentManifestObjectUrl);
  } catch (err) {
    console.warn('Could not generate dynamic PWA manifest:', err);
  }
}

function updateOrCreateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateOrCreateLinkTag(rel: string, href: string, type?: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
  if (type) {
    link.setAttribute('type', type);
  }
}
