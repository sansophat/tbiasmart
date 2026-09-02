import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Crosshair, 
  Sparkles, 
  Layers, 
  Compass, 
  CheckCircle2, 
  AlertCircle,
  Maximize2,
  RefreshCw,
  Globe,
  Radio
} from 'lucide-react';
import { Language } from '../types';

interface InteractiveMapPickerProps {
  lat: number;
  lng: number;
  radiusMeters?: number;
  onChange: (lat: number, lng: number, addressSuggestion?: { nameKh?: string; nameEn?: string }) => void;
  lang: Language;
  heightClass?: string;
  readOnly?: boolean;
  showSearch?: boolean;
  showPresets?: boolean;
  branchName?: string;
  branchType?: string;
}

const PHNOM_PENH_PRESETS = [
  { nameKh: 'បឹងកេងកង ១ (BKK1)', nameEn: 'Boeung Keng Kang 1 (BKK1)', lat: 11.5528, lng: 104.9272, type: 'commercial' },
  { nameKh: 'ដូនពេញ មាត់ទន្លេ (Riverside)', nameEn: 'Daun Penh Riverside', lat: 11.5645, lng: 104.9189, type: 'entertainment' },
  { nameKh: 'ទួលគោក (Toul Kork)', nameEn: 'Toul Kork Business Hub', lat: 11.5735, lng: 104.8955, type: 'commercial' },
  { nameKh: 'សែនសុខ (Sen Sok Aeon 2)', nameEn: 'Sen Sok / Aeon Mall 2', lat: 11.5880, lng: 104.8810, type: 'retail' },
  { nameKh: 'វេងស្រេង (Veng Sreng Logistics)', nameEn: 'Veng Sreng Industrial Zone', lat: 11.5230, lng: 104.8620, type: 'logistics' },
  { nameKh: 'អាកាសយានដ្ឋានភ្នំពេញ (Airport)', nameEn: 'Phnom Penh Airport Logistics Hub', lat: 11.5460, lng: 104.8450, type: 'logistics' },
  { nameKh: 'ជ្រោយចង្វារ (Chroy Changvar)', nameEn: 'Chroy Changvar Waterfront', lat: 11.5820, lng: 104.9350, type: 'lifestyle' },
  { nameKh: 'កោះពេជ្រ (Diamond Island)', nameEn: 'Koh Pich (Diamond Island)', lat: 11.5540, lng: 104.9390, type: 'commercial' },
];

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  lat,
  lng,
  radiusMeters = 80,
  onChange,
  lang,
  heightClass = 'h-[320px] sm:h-[380px]',
  readOnly = false,
  showSearch = true,
  showPresets = true,
  branchName,
  branchType = 'cafe',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isFetchingGps, setIsFetchingGps] = useState<boolean>(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string>('');
  const [reverseAddress, setReverseAddress] = useState<string>('');

  // Fallback / Initial Coordinates validation
  const safeLat = typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : 11.5564;
  const safeLng = typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : 104.9282;

  // Custom Leaflet Pin Icon with Pulse animation
  const createCustomIcon = (type: string) => {
    const color = type === 'club' ? '#7C3AED' : type === 'warehouse' ? '#D97706' : type === 'cafe' ? '#059669' : '#4F46E5';
    
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: grab;">
          <div style="width: 38px; height: 38px; border-radius: 50% 50% 50% 0; background: ${color}; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
            <div style="transform: rotate(45deg); width: 14px; height: 14px; background: white; border-radius: 50%;"></div>
          </div>
          <div style="width: 14px; height: 6px; background: rgba(0,0,0,0.25); border-radius: 50%; margin-top: -3px; filter: blur(1px);"></div>
        </div>
      `,
      iconSize: [38, 42],
      iconAnchor: [19, 42],
      popupAnchor: [0, -42],
    });
  };

  // Reverse Geocode helper to suggest address
  const fetchReverseAddress = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'km,en' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const shortName = data.address?.road || data.address?.suburb || data.address?.city_district || data.name || data.display_name.split(',')[0];
          setReverseAddress(shortName);
          return {
            nameEn: data.display_name.split(',').slice(0, 3).join(', '),
            nameKh: `តំបន់ ${shortName}, រាជធានីភ្នំពេញ`,
          };
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }
    return undefined;
  };

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [safeLat, safeLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    // Default OpenStreetMap Layer
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add Geofence Circle
    const circle = L.circle([safeLat, safeLng], {
      radius: radiusMeters,
      color: '#4F46E5',
      fillColor: '#6366F1',
      fillOpacity: 0.2,
      weight: 2,
      dashArray: '4, 4',
    }).addTo(map);
    circleRef.current = circle;

    // Add Draggable Marker
    const marker = L.marker([safeLat, safeLng], {
      draggable: !readOnly,
      icon: createCustomIcon(branchType),
    }).addTo(map);
    markerRef.current = marker;

    if (branchName) {
      marker.bindPopup(`<b>${branchName}</b><br/>Lat: ${safeLat.toFixed(5)}<br/>Lng: ${safeLng.toFixed(5)}`);
    }

    // Map Click Event -> Auto Fetch Lat/Lng
    if (!readOnly) {
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const newLat = Number(e.latlng.lat.toFixed(6));
        const newLng = Number(e.latlng.lng.toFixed(6));

        marker.setLatLng([newLat, newLng]);
        circle.setLatLng([newLat, newLng]);

        const addr = await fetchReverseAddress(newLat, newLng);
        onChange(newLat, newLng, addr);
      });

      // Marker Drag Event -> Auto Fetch Lat/Lng
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const newLat = Number(pos.lat.toFixed(6));
        const newLng = Number(pos.lng.toFixed(6));

        circle.setLatLng([newLat, newLng]);
        const addr = await fetchReverseAddress(newLat, newLng);
        onChange(newLat, newLng, addr);
      });
    }

    mapInstanceRef.current = map;

    // Resize fix
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map center and marker when lat, lng, radius, or branchType props change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;

    const currentPos = markerRef.current.getLatLng();
    if (Math.abs(currentPos.lat - safeLat) > 0.00001 || Math.abs(currentPos.lng - safeLng) > 0.00001) {
      markerRef.current.setLatLng([safeLat, safeLng]);
      circleRef.current.setLatLng([safeLat, safeLng]);
      mapInstanceRef.current.panTo([safeLat, safeLng], { animate: true });
    }

    circleRef.current.setRadius(radiusMeters);
    markerRef.current.setIcon(createCustomIcon(branchType));

    if (branchName) {
      markerRef.current.setPopupContent(`<b>${branchName}</b><br/>Lat: ${safeLat.toFixed(5)}, Lng: ${safeLng.toFixed(5)}<br/>Radius: ${radiusMeters}m`);
    }
  }, [safeLat, safeLng, radiusMeters, branchType, branchName]);

  // Switch Map Layer (OSM vs Satellite)
  const handleToggleMapLayer = (type: 'osm' | 'satellite') => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    setMapType(type);

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    if (type === 'satellite') {
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }
  };

  // 1. AUTO FETCH CURRENT DEVICE GPS
  const handleAutoFetchCurrentGps = () => {
    if (!navigator.geolocation) {
      alert(lang === 'km' ? 'កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រ GPS ទេ' : 'Geolocation is not supported by your browser');
      return;
    }

    setIsFetchingGps(true);
    setGpsStatusMessage(lang === 'km' ? 'កំពុងទាញយកទីតាំង GPS...' : 'Acquiring GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsFetchingGps(false);
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));

        setGpsStatusMessage(
          lang === 'km' 
            ? `ទាញយកបានជោគជ័យ! ±${Math.round(pos.coords.accuracy)}m` 
            : `Auto-fetched successfully! ±${Math.round(pos.coords.accuracy)}m`
        );

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
          circleRef.current.setLatLng([newLat, newLng]);
          mapInstanceRef.current.setView([newLat, newLng], 17, { animate: true });
        }

        const addr = await fetchReverseAddress(newLat, newLng);
        onChange(newLat, newLng, addr);

        setTimeout(() => setGpsStatusMessage(''), 4000);
      },
      (err) => {
        setIsFetchingGps(false);
        setGpsStatusMessage(lang === 'km' ? 'មិនអាចទាញយក GPS បានទេ' : 'Could not fetch device GPS.');
        console.warn('GPS Error:', err);
        setTimeout(() => setGpsStatusMessage(''), 4000);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // 2. SEARCH NOMINATIM / PRESET LOCATIONS
  const handleSearchLocation = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // First check if matching preset
      const matchedPreset = PHNOM_PENH_PRESETS.find(
        (p) => p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || p.nameKh.includes(searchQuery)
      );

      if (matchedPreset) {
        setIsSearching(false);
        applyCoordinates(matchedPreset.lat, matchedPreset.lng, {
          nameEn: matchedPreset.nameEn,
          nameKh: matchedPreset.nameKh,
        });
        return;
      }

      // Query OpenStreetMap Nominatim with Phnom Penh bounds
      const query = encodeURIComponent(`${searchQuery}, Phnom Penh, Cambodia`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=4&addressdetails=1`);
      
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const newLat = Number(parseFloat(first.lat).toFixed(6));
          const newLng = Number(parseFloat(first.lon).toFixed(6));
          
          setSearchResults(results);
          applyCoordinates(newLat, newLng, {
            nameEn: first.display_name.split(',').slice(0, 3).join(', '),
            nameKh: `តំបន់ ${searchQuery}, រាជធានីភ្នំពេញ`,
          });
        } else {
          alert(lang === 'km' ? 'រកមិនឃើញទីតាំងនេះទេ សូមជ្រើសរើសពី Presets ឬចុចលើផែនទី' : 'Location not found. Please click directly on the map or choose a preset.');
        }
      }
    } catch (err) {
      console.warn('Search geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Apply coordinates helper
  const applyCoordinates = async (newLat: number, newLng: number, addr?: { nameKh?: string; nameEn?: string }) => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      circleRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.setView([newLat, newLng], 17, { animate: true });
    }
    const resolvedAddr = addr || (await fetchReverseAddress(newLat, newLng));
    onChange(newLat, newLng, resolvedAddr);
  };

  return (
    <div className="space-y-3">
      {/* Top Search Bar & Auto-fetch Action Bar */}
      {showSearch && !readOnly && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input Container */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchLocation(e);
                }
              }}
              placeholder={
                lang === 'km'
                  ? 'ស្វែងរកទីតាំង (ឧ. BKK1, Riverside, Sen Sok, Toul Kork)...'
                  : 'Search landmark, street, or sangkat in Phnom Penh...'
              }
              className="w-full pl-9 pr-20 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium shadow-xs"
            />
            <button
              type="button"
              onClick={handleSearchLocation}
              disabled={isSearching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
            >
              {isSearching ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <span>{lang === 'km' ? 'ស្វែងរក' : 'Search'}</span>
              )}
            </button>
          </div>

          {/* Auto-Fetch GPS Button */}
          <button
            type="button"
            onClick={handleAutoFetchCurrentGps}
            disabled={isFetchingGps}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap shrink-0"
            title={lang === 'km' ? 'ទាញយកទីតាំង GPS ឧបករណ៍ស្វ័យប្រវត្តិ' : 'Auto-fetch current device GPS coordinates'}
          >
            <Crosshair className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin' : ''}`} />
            <span>
              {isFetchingGps
                ? lang === 'km' ? 'កំពុងទាញយក...' : 'Fetching GPS...'
                : lang === 'km' ? 'ទាញយក GPS ស្វ័យប្រវត្តិ' : 'Auto-Fetch GPS'}
            </span>
          </button>
        </div>
      )}

      {/* GPS Status / Reverse Address Toast Feedback */}
      {gpsStatusMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{gpsStatusMessage}</span>
        </div>
      )}

      {/* Interactive Map Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-md">
        {/* Leaflet Map DOM Root */}
        <div ref={mapContainerRef} className={`w-full ${heightClass} z-10`} />

        {/* Map Type Switcher Overlay (Top Right) */}
        <div className="absolute top-3 right-3 z-[400] flex items-center bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => handleToggleMapLayer('osm')}
            className={`px-2.5 py-1 rounded-lg transition ${
              mapType === 'osm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🗺️ Street
          </button>
          <button
            type="button"
            onClick={() => handleToggleMapLayer('satellite')}
            className={`px-2.5 py-1 rounded-lg transition ${
              mapType === 'satellite' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🛰️ Satellite
          </button>
        </div>

        {/* Live Coordinate Pill Overlay (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold">WGS84:</span>
          <span>Lat: <strong className="text-white">{safeLat.toFixed(6)}</strong></span>
          <span className="text-slate-500">|</span>
          <span>Lng: <strong className="text-white">{safeLng.toFixed(6)}</strong></span>
        </div>

        {/* Instructions Badge Overlay (Top Left) */}
        {!readOnly && (
          <div className="hidden sm:flex absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md text-slate-700 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 items-center space-x-1.5 text-[11px] font-bold">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {lang === 'km' ? 'ចុចលើផែនទី ឬអូស Pin ដើម្បី Auto-Fetch កូអរដោនេ' : 'Click map or drag pin to auto-fetch coordinates'}
            </span>
          </div>
        )}
      </div>

      {/* Phnom Penh Quick Preset Pills */}
      {showPresets && !readOnly && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              {lang === 'km' ? 'ទីតាំងពេញនិយមនៅភ្នំពេញ (Quick Auto-Fetch Presets):' : 'Phnom Penh Quick Presets (Click to Auto-Fetch):'}
            </span>
            <span className="text-[10px] text-indigo-600 font-medium">8 Hubs</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {PHNOM_PENH_PRESETS.map((preset, idx) => {
              const isCurrent = Math.abs(safeLat - preset.lat) < 0.001 && Math.abs(safeLng - preset.lng) < 0.001;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyCoordinates(preset.lat, preset.lng, { nameKh: preset.nameKh, nameEn: preset.nameEn })}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition cursor-pointer flex items-center space-x-1 ${
                    isCurrent
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-1 ring-indigo-400 font-bold'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>{lang === 'km' ? preset.nameKh : preset.nameEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
