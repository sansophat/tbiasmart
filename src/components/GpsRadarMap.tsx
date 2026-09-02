import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  Radio, 
  Compass, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Warehouse, 
  Coffee, 
  Building2, 
  Flame,
  Maximize2,
  Crosshair,
  ExternalLink,
  Layers,
  Globe,
  RefreshCw,
  LocateFixed,
  Lock
} from 'lucide-react';
import { Branch, UserGeoLocation, Language, AuthUser, Employee } from '../types';
import { calculateDistanceMeters, formatDistance, toKhmerNumeral } from '../utils/geoUtils';

interface GpsRadarMapProps {
  branches: Branch[];
  currentGeo: UserGeoLocation;
  setCurrentGeo: (geo: UserGeoLocation) => void;
  lang: Language;
  currentUser?: AuthUser | null;
  employees?: Employee[];
  onUpdateBranchLocation?: (
    branchId: string,
    lat: number,
    lng: number,
    employeeId?: string
  ) => { success: boolean; message: string } | void;
}

export const GpsRadarMap: React.FC<GpsRadarMapProps> = ({
  branches,
  currentGeo,
  setCurrentGeo,
  lang,
  currentUser,
  employees = [],
  onUpdateBranchLocation,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || 'br_club_1');
  const [activeFilter, setActiveFilter] = useState<'all' | 'club' | 'warehouse' | 'cafe' | 'office'>('all');
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');
  const [isLiveWatching, setIsLiveWatching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const branchLayersRef = useRef<{ [id: string]: { marker: L.Marker; circle: L.Circle } }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const distanceToSelected = calculateDistanceMeters(
    currentGeo.lat,
    currentGeo.lng,
    selectedBranch.lat,
    selectedBranch.lng
  );
  const isSelectedWithin = distanceToSelected <= selectedBranch.radiusMeters;

  const filteredBranches = branches.filter((b) => {
    if (activeFilter === 'all') return true;
    return b.type === activeFilter;
  });

  // Sort branches by real distance to user
  const branchesSortedByDistance = [...branches].map((b) => ({
    ...b,
    distanceToUser: calculateDistanceMeters(currentGeo.lat, currentGeo.lng, b.lat, b.lng),
  })).sort((a, b) => a.distanceToUser - b.distanceToUser);

  // Fetch real GPS on demand
  const handleFetchRealGps = () => {
    if (!navigator.geolocation) {
      alert(lang === 'km' ? 'កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រ GPS ទេ' : 'Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newGeo: UserGeoLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
          isReal: true,
          label: lang === 'km' ? `GPS ជាក់ស្តែង (ភាពសុក្រឹត ±${Math.round(pos.coords.accuracy)}m)` : `Real GPS (±${Math.round(pos.coords.accuracy)}m)`,
        };
        setCurrentGeo(newGeo);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([newGeo.lat, newGeo.lng], 16, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geo error:', err);
        alert(
          lang === 'km'
            ? 'មិនអាចទាញយក GPS បានទេ: ' + err.message + ' (សូមពិនិត្យមើល Location Permission)'
            : 'Could not fetch GPS: ' + err.message + ' (Please check location permissions)'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Toggle Continuous Real-time GPS Watch
  const toggleLiveWatch = () => {
    if (isLiveWatching) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveWatching(false);
    } else {
      if (!navigator.geolocation) return;
      setIsLiveWatching(true);
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentGeo({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: pos.timestamp,
            isReal: true,
            label: lang === 'km' ? `GPS កំពុងតាមដានបន្តផ្ទាល់ (±${Math.round(pos.coords.accuracy)}m)` : `Live Tracking (±${Math.round(pos.coords.accuracy)}m)`,
          });
        },
        (err) => {
          console.warn('Watch error:', err);
          setIsLiveWatching(false);
        },
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
      watchIdRef.current = id;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Set branch coordinates to user's current GPS location
  const handleCalibrateBranchToMyLocation = (branch: Branch) => {
    if (onUpdateBranchLocation) {
      const isStaffRole = currentUser?.role === 'employee';
      const staffEmp = employees.find(
        (e) => e.id === currentUser?.employeeId || e.code === currentUser?.employeeCode
      );

      if (isStaffRole && staffEmp?.gpsCalibratedBranchId === branch.id) {
        alert(
          lang === 'km'
            ? `🔒 ទីតាំង GPS សាខានេះត្រូវបានកំណត់រួចរាល់ហើយ! បុគ្គលិកអាចកំណត់បានតែ ១ ដងគត់ក្នុងសាខាមួយ។ មិនអាចផ្លាស់ប្តូរទៅកាន់ទីតាំងផ្សេងទៀតបានទេ លុះត្រាតែមានការផ្ទេរទៅកាន់សាខាថ្មី ទើបអាចកំណត់ឡើងវិញបាន។`
            : `🔒 Branch GPS is locked! You have already calibrated your GPS for this branch (allowed 1st time only). You cannot change it until officially transferred to another branch.`
        );
        return;
      }

      const res = onUpdateBranchLocation(branch.id, currentGeo.lat, currentGeo.lng, staffEmp?.id);
      if (res && res.message) {
        alert(res.message);
      } else {
        alert(
          lang === 'km'
            ? `បានកំណត់ទីតាំងសាខា "${branch.nameKh}" ទៅកាន់កូអរដោនេ GPS របស់អ្នកដោយជោគជ័យ!`
            : `Branch "${branch.nameEn}" coordinates calibrated to your current GPS position!`
        );
      }
    }
  };

  // Create custom Leaflet branch icon
  const createBranchIcon = (type: string, isSelected: boolean) => {
    const color = type === 'club' ? '#7C3AED' : type === 'warehouse' ? '#D97706' : type === 'cafe' ? '#059669' : '#4F46E5';
    const border = isSelected ? '3px solid #F59E0B' : '2px solid white';
    const scale = isSelected ? 'transform: scale(1.15);' : '';

    return L.divIcon({
      className: 'custom-branch-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; ${scale} transition: all 0.2s;">
          <div style="width: 36px; height: 36px; border-radius: 50% 50% 50% 0; background: ${color}; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: ${border};">
            <div style="transform: rotate(45deg); width: 12px; height: 12px; background: white; border-radius: 50%;"></div>
          </div>
          <div style="width: 14px; height: 5px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [36, 40],
      iconAnchor: [18, 40],
      popupAnchor: [0, -40],
    });
  };

  // Create custom user GPS icon
  const createUserIcon = () => {
    return L.divIcon({
      className: 'custom-user-gps-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(6, 182, 212, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #06B6D4; border: 3px solid white; box-shadow: 0 0 10px rgba(6, 182, 212, 0.8);"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [selectedBranch.lat, selectedBranch.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when Map Type changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZoom = 19;

    if (mapType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    }

    const newLayer = L.tileLayer(url, { maxZoom }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Render & Update Branch Markers and Geofence Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old layers
    Object.values(branchLayersRef.current).forEach(({ marker, circle }) => {
      map.removeLayer(marker);
      map.removeLayer(circle);
    });
    branchLayersRef.current = {};

    // Add new filtered branches
    filteredBranches.forEach((branch) => {
      const isSelected = branch.id === selectedBranchId;
      const color = branch.type === 'club' ? '#7C3AED' : branch.type === 'warehouse' ? '#D97706' : branch.type === 'cafe' ? '#059669' : '#4F46E5';

      // Geofence Circle
      const circle = L.circle([branch.lat, branch.lng], {
        radius: branch.radiusMeters,
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.25 : 0.12,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: isSelected ? undefined : '4, 4',
      }).addTo(map);

      // Marker
      const marker = L.marker([branch.lat, branch.lng], {
        icon: createBranchIcon(branch.type, isSelected),
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px;">
          <strong style="font-size: 13px; color: #1e1b4b;">${lang === 'km' ? branch.nameKh : branch.nameEn}</strong><br/>
          <span style="color: #64748b;">📍 ${branch.addressEn}</span><br/>
          <span style="color: #4f46e5; font-weight: bold;">🛡️ Geofence: ${branch.radiusMeters}m</span><br/>
          <span style="color: #059669;">⏰ Open: ${branch.openTime} - ${branch.closeTime}</span>
        </div>
      `);

      marker.on('click', () => {
        setSelectedBranchId(branch.id);
      });

      branchLayersRef.current[branch.id] = { marker, circle };
    });
  }, [filteredBranches, selectedBranchId, lang]);

  // Update User GPS Marker & Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }
    if (userCircleRef.current) {
      map.removeLayer(userCircleRef.current);
    }

    if (currentGeo.lat && currentGeo.lng) {
      // User Marker
      const uMarker = L.marker([currentGeo.lat, currentGeo.lng], {
        icon: createUserIcon(),
        zIndexOffset: 1000,
      }).addTo(map);

      uMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 4px;">
          <strong style="color: #0891b2;">👤 ${lang === 'km' ? 'ទីតាំង GPS របស់អ្នក' : 'Your Live Device GPS'}</strong><br/>
          <span style="color: #64748b;">Lat: ${currentGeo.lat.toFixed(6)}, Lng: ${currentGeo.lng.toFixed(6)}</span><br/>
          <span style="color: #059669;">Accuracy: ±${currentGeo.accuracy || 5}m</span>
        </div>
      `);
      userMarkerRef.current = uMarker;

      // Accuracy Circle
      if (currentGeo.accuracy && currentGeo.accuracy > 5) {
        const uCircle = L.circle([currentGeo.lat, currentGeo.lng], {
          radius: currentGeo.accuracy,
          color: '#06B6D4',
          fillColor: '#06B6D4',
          fillOpacity: 0.08,
          weight: 1,
          dashArray: '3, 3',
        }).addTo(map);
        userCircleRef.current = uCircle;
      }
    }
  }, [currentGeo, lang]);

  // Fly to selected branch when selection changes
  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranchId(branch.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([branch.lat, branch.lng], 16, { animate: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-800 font-battambang flex items-center gap-2">
                <span>{lang === 'km' ? 'ផែនទីផ្ទៀងផ្ទាត់ GPS Geofence ជាក់ស្តែង' : 'Real-time GPS Geofence Radar'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 font-hanuman">
                  Live Hardware GPS
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium font-hanuman mt-1">
                {lang === 'km' 
                  ? 'ផែនទីផ្កាយរណប & ផ្លូវគមនាគមន៍ពិតប្រាកដ បង្ហាញកាំសុវត្ថិភាព Geofence នៃសាខានីមួយៗ និងទីតាំងឧបករណ៍ផ្ទាល់របស់អ្នក'
                  : 'Live satellite & street map tracking your device GPS position against official branch geofence boundary rings.'}
              </p>
            </div>
          </div>
        </div>

        {/* GPS Control Buttons */}
        <div className="flex items-center space-x-2 w-full md:w-auto font-hanuman">
          <button
            onClick={toggleLiveWatch}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
              isLiveWatching
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800 animate-pulse'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveWatching ? 'text-cyan-600' : 'text-slate-500'}`} />
            <span>{isLiveWatching ? (lang === 'km' ? 'កំពុងតាមដានបន្តផ្ទាល់...' : 'Tracking Live...') : (lang === 'km' ? 'បើកការតាមដានបន្ត' : 'Track Live GPS')}</span>
          </button>

          <button
            onClick={handleFetchRealGps}
            disabled={isLocating}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
          >
            {isLocating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            <span>{lang === 'km' ? 'ទាញយក GPS ពិត' : 'Get Current GPS'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map (8 cols) & Live Branch Geofence Metrics (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Leaflet Map (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            {/* Filter Pills & Map Type Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-hanuman">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    activeFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'km' ? `ទាំងអស់ (${branches.length})` : `All (${branches.length})`}
                </button>
                <button
                  onClick={() => setActiveFilter('club')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeFilter === 'club' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🍸 {lang === 'km' ? 'ក្លិប' : 'Clubs'}
                </button>
                <button
                  onClick={() => setActiveFilter('warehouse')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeFilter === 'warehouse' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📦 {lang === 'km' ? 'ឃ្លាំង' : 'Warehouse'}
                </button>
                <button
                  onClick={() => setActiveFilter('cafe')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeFilter === 'cafe' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ☕ {lang === 'km' ? 'កាហ្វេ' : 'Cafes'}
                </button>
                <button
                  onClick={() => setActiveFilter('office')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeFilter === 'office' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏢 {lang === 'km' ? 'ការិយាល័យ' : 'Office'}
                </button>
              </div>

              {/* Map Type (Street vs Satellite) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setMapType('osm')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition ${
                    mapType === 'osm' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ផែនទីផ្លូវ' : 'Street'}</span>
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition ${
                    mapType === 'satellite' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ផ្កាយរណប' : 'Satellite'}</span>
                </button>
              </div>
            </div>

            {/* Real Leaflet Map Container */}
            <div className="relative w-full h-[420px] sm:h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-0">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Floating Map Overlay Status */}
              <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] shadow-md flex items-center space-x-2 font-hanuman">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
                <span className="font-bold text-slate-800">
                  {currentGeo.isReal ? '🟢 Live GPS Active' : '📍 Initial Location'}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  (±{currentGeo.accuracy || 5}m)
                </span>
              </div>
            </div>

            {/* Proximity List */}
            <div className="space-y-2 pt-2 font-hanuman">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-bold">
                <span>{lang === 'km' ? 'ចម្ងាយពីទីតាំងបច្ចុប្បន្នរបស់អ្នកទៅគ្រប់សាខា:' : 'Proximity from your device to all branches:'}</span>
                <span className="text-indigo-600 font-semibold">{branchesSortedByDistance.length} {lang === 'km' ? 'សាខា' : 'branches'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {branchesSortedByDistance.map((b) => {
                  const isSelected = b.id === selectedBranchId;
                  const isWithin = b.distanceToUser <= b.radiusMeters;

                  return (
                    <button
                      key={b.id}
                      onClick={() => handleSelectBranch(b)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200'
                          : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isWithin ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <div className="truncate">
                          <div className="font-bold text-xs text-slate-800 truncate font-battambang">
                            {lang === 'km' ? b.nameKh : b.nameEn}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Geofence: {b.radiusMeters}m
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-xs font-mono font-bold ${isWithin ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {formatDistance(b.distanceToUser, lang)}
                        </span>
                        <span className={`block text-[9px] font-bold uppercase ${isWithin ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isWithin ? 'IN RANGE' : 'AWAY'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Branch Geofence Inspector & Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-4 font-hanuman">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-battambang">
                    {lang === 'km' ? 'ព័ត៌មានលម្អិតសាខា' : 'Branch Geofence Inspector'}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">{selectedBranch.nameEn}</span>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isSelectedWithin ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {isSelectedWithin ? (lang === 'km' ? 'ក្នុងកាំ' : 'INSIDE') : (lang === 'km' ? 'ក្រៅកាំ' : 'OUTSIDE')}
              </span>
            </div>

            {/* Branch Header Details */}
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-base font-battambang">
                {lang === 'km' ? selectedBranch.nameKh : selectedBranch.nameEn}
              </h4>
              <p className="text-xs text-slate-500 flex items-start gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>{lang === 'km' ? selectedBranch.addressKh : selectedBranch.addressEn}</span>
              </p>
            </div>

            {/* Distance Comparison Card */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isSelectedWithin
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-rose-50/70 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span>{lang === 'km' ? 'ចម្ងាយពីឧបករណ៍របស់អ្នក:' : 'Distance to your device:'}</span>
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {formatDistance(distanceToSelected, lang)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>{lang === 'km' ? 'កាំ Geofence អតិបរមា:' : 'Allowed Geofence Radius:'}</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedBranch.radiusMeters} {lang === 'km' ? 'ម៉ែត្រ' : 'm'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[11px]">
                {isSelectedWithin ? (
                  <div className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'km' ? 'ទីតាំងត្រឹមត្រូវ អនុញ្ញាតឱ្យស្កេនវត្តមាន' : 'Position Verified! Inside Geofence.'}</span>
                  </div>
                ) : (
                  <div className="text-rose-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {lang === 'km'
                        ? `លើសដែនកំណត់ ${formatDistance(distanceToSelected - selectedBranch.radiusMeters, lang)}`
                        : `Outside boundary by ${formatDistance(distanceToSelected - selectedBranch.radiusMeters, lang)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Coordinates & Navigation Controls */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Branch Lat/Lng:</span>
                  <span className="font-bold text-slate-900">{selectedBranch.lat.toFixed(5)}, {selectedBranch.lng.toFixed(5)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Your GPS Lat/Lng:</span>
                  <span className="font-bold text-cyan-700">{currentGeo.lat.toFixed(5)}, {currentGeo.lng.toFixed(5)}</span>
                </div>
              </div>

              {/* Set Branch to My GPS (For Admin Setup / Real Testing at Current Location) */}
              {onUpdateBranchLocation && (
                <div>
                  {Boolean(
                    currentUser?.role === 'employee' &&
                    employees.find(
                      (e) => e.id === currentUser?.employeeId || e.code === currentUser?.employeeCode
                    )?.gpsCalibratedBranchId === selectedBranch.id
                  ) ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold block">
                            {lang === 'km' ? 'GPS សាខាបានចាក់សោ (លើកទី ១)' : 'Branch GPS Locked (1st-Time Active)'}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">
                            {lang === 'km' ? 'អាចប្តូរបានលុះត្រាតែផ្ទេរសាខា' : 'Unlocked only upon branch transfer'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded border border-emerald-300 text-emerald-800 shadow-2xs">
                        🔒 {lang === 'km' ? 'ជាប់សោ' : 'Locked'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCalibrateBranchToMyLocation(selectedBranch)}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold border border-indigo-700 text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {currentUser?.role === 'employee'
                          ? (lang === 'km' ? 'កំណត់សាខានេះនៅទីតាំង GPS ខ្ញុំ (លើកទី ១)' : 'Set Branch to My GPS (1st-Time Only)')
                          : (lang === 'km' ? 'កំណត់សាខានេះនៅទីតាំង GPS របស់ខ្ញុំ' : 'Set Branch Coordinates to My GPS')}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* External Google Maps Navigation link */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.lat},${selectedBranch.lng}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'បើកផ្លូវក្នុង Google Maps' : 'Open in Google Maps'}</span>
              </a>
            </div>

            {/* Anti-Fraud Protection Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'km' ? 'សុវត្ថិភាពទិន្នន័យ GPS ផ្ទាល់:' : 'Live Anti-Fraud Safeguards:'}</span>
              </div>
              <p>• {lang === 'km' ? 'ផ្ទៀងផ្ទាត់កូអរដោនេ Hardware GPS ដោយផ្ទាល់ពីរលកផ្កាយរណប' : 'Hardware GPS satellite signal verification'}</p>
              <p>• {lang === 'km' ? 'កត់ត្រាចម្ងាយ និងកម្រិតភាពសុក្រឹតចូលក្នុងប្រព័ន្ធរាល់ពេលស្កេន' : 'Distance & accuracy logged into database on every punch'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
