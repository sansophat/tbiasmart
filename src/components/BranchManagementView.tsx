import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Warehouse, 
  Coffee, 
  Clock, 
  Phone, 
  Sliders, 
  Save, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  Fingerprint, 
  Plus, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Edit3, 
  Tag, 
  X, 
  Check, 
  Palette, 
  Store, 
  Factory, 
  Hotel, 
  Stethoscope, 
  ShoppingBag, 
  Layers,
  ArrowRightLeft,
  Search,
  ExternalLink
} from 'lucide-react';
import { Branch, BranchTypeConfig, BranchTransferRecord, Employee, Language } from '../types';
import { InteractiveMapPicker } from './InteractiveMapPicker';

interface BranchManagementViewProps {
  branches: Branch[];
  branchTypes?: BranchTypeConfig[];
  employees?: Employee[];
  transferRecords?: BranchTransferRecord[];
  onUpdateBranch: (updatedBranch: Branch) => void;
  onAddBranch?: (newBranch: Branch) => void;
  onDeleteBranch?: (branchId: string) => void;
  onAddBranchType?: (typeConfig: BranchTypeConfig) => void;
  onUpdateBranchType?: (typeConfig: BranchTypeConfig) => void;
  onDeleteBranchType?: (typeId: string) => void;
  lang: Language;
}

const PRESET_BRANCH_IMAGES = [
  {
    name: 'Corporate HQ Office',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    type: 'office',
  },
  {
    name: 'Modern Tech Office',
    url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80',
    type: 'office',
  },
  {
    name: 'Luxury Nightclub',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    type: 'club',
  },
  {
    name: 'Rooftop Lounge & Bar',
    url: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=600&auto=format&fit=crop&q=80',
    type: 'club',
  },
  {
    name: 'Logistics Warehouse',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
    type: 'warehouse',
  },
  {
    name: 'Specialty Coffee Shop',
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80',
    type: 'cafe',
  },
  {
    name: 'Garden Bistro Cafe',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    type: 'cafe',
  },
  {
    name: 'Riverside Cafe',
    url: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&auto=format&fit=crop&q=80',
    type: 'cafe',
  },
  {
    name: 'Retail Boutique & Flagship',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80',
    type: 'boutique',
  },
  {
    name: 'Industrial Production Plant',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
    type: 'factory',
  },
];

const DEFAULT_BRANCH_TYPES: BranchTypeConfig[] = [
  {
    id: 'club',
    nameKh: 'ក្លិបកម្សាន្ត & រង្គសាល',
    nameEn: 'Nightclub & Lounge',
    iconName: 'Sparkles',
    themeColor: 'from-purple-600 to-indigo-600',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
  },
  {
    id: 'warehouse',
    nameKh: 'ឃ្លាំងទំនិញ & ភស្តុភារ',
    nameEn: 'Logistics & Warehouse',
    iconName: 'Warehouse',
    themeColor: 'from-amber-600 to-orange-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
  },
  {
    id: 'cafe',
    nameKh: 'ហាងកាហ្វេ & ភេសជ្ជៈ',
    nameEn: 'Cafe & Beverage',
    iconName: 'Coffee',
    themeColor: 'from-emerald-600 to-teal-600',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
  {
    id: 'office',
    nameKh: 'ការិយាល័យ & ស្នាក់ការកណ្តាល',
    nameEn: 'Corporate Office & HQ',
    iconName: 'Building2',
    themeColor: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
  },
  {
    id: 'boutique',
    nameKh: 'ហាងលក់ទំនិញ & Showroom',
    nameEn: 'Retail Store & Showroom',
    iconName: 'Store',
    themeColor: 'from-rose-600 to-pink-600',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
  },
  {
    id: 'factory',
    nameKh: 'រោងចក្រ & សិប្បកម្ម',
    nameEn: 'Manufacturing & Plant',
    iconName: 'Factory',
    themeColor: 'from-slate-600 to-zinc-700',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
  },
];

export const BranchManagementView: React.FC<BranchManagementViewProps> = ({
  branches,
  branchTypes = DEFAULT_BRANCH_TYPES,
  employees = [],
  transferRecords = [],
  onUpdateBranch,
  onAddBranch,
  onDeleteBranch,
  onAddBranchType,
  onUpdateBranchType,
  onDeleteBranchType,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'types' | 'transfers'>('branches');
  const [editingBranchId, setEditingBranchId] = useState<string>(branches[0]?.id || 'br_club_1');
  const [searchBranch, setSearchBranch] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Selected branch editing state
  const selectedBranch = branches.find((b) => b.id === editingBranchId) || branches[0];

  const [nameKh, setNameKh] = useState<string>(selectedBranch?.nameKh || '');
  const [nameEn, setNameEn] = useState<string>(selectedBranch?.nameEn || '');
  const [branchType, setBranchType] = useState<string>(selectedBranch?.type || 'office');
  const [addressKh, setAddressKh] = useState<string>(selectedBranch?.addressKh || '');
  const [addressEn, setAddressEn] = useState<string>(selectedBranch?.addressEn || '');
  const [managerName, setManagerName] = useState<string>(selectedBranch?.managerName || '');
  const [radiusMeters, setRadiusMeters] = useState<number>(selectedBranch?.radiusMeters || 85);
  const [openTime, setOpenTime] = useState<string>(selectedBranch?.openTime || '08:00');
  const [closeTime, setCloseTime] = useState<string>(selectedBranch?.closeTime || '17:30');
  const [contactPhone, setContactPhone] = useState<string>(selectedBranch?.contactPhone || '');
  const [imageUrl, setImageUrl] = useState<string>(selectedBranch?.imageUrl || '');
  const [lat, setLat] = useState<number>(selectedBranch?.lat || 11.5580);
  const [lng, setLng] = useState<number>(selectedBranch?.lng || 104.9280);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modals
  const [showAddBranchModal, setShowAddBranchModal] = useState<boolean>(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState<boolean>(false);

  // New Branch Type Form State
  const [newTypeId, setNewTypeId] = useState<string>('');
  const [newTypeNameKh, setNewTypeNameKh] = useState<string>('');
  const [newTypeNameEn, setNewTypeNameEn] = useState<string>('');
  const [newTypeIcon, setNewTypeIcon] = useState<string>('Store');
  const [newTypeColor, setNewTypeColor] = useState<string>('emerald');

  // New Branch Form State
  const [newBranchData, setNewBranchData] = useState({
    nameKh: '',
    nameEn: '',
    type: branchTypes[0]?.id || 'office',
    addressKh: '',
    addressEn: '',
    managerName: '',
    contactPhone: '',
    openTime: '08:00',
    closeTime: '17:30',
    radiusMeters: 75,
    lat: 11.5564,
    lng: 104.9282,
    imageUrl: PRESET_BRANCH_IMAGES[0].url,
  });

  const handleSelectBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setNameKh(branch.nameKh);
    setNameEn(branch.nameEn);
    setBranchType(branch.type);
    setAddressKh(branch.addressKh);
    setAddressEn(branch.addressEn);
    setManagerName(branch.managerName);
    setRadiusMeters(branch.radiusMeters);
    setOpenTime(branch.openTime);
    setCloseTime(branch.closeTime);
    setContactPhone(branch.contactPhone);
    setImageUrl(branch.imageUrl || '');
    setLat(branch.lat);
    setLng(branch.lng);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    if (!selectedBranch) return;
    const updated: Branch = {
      ...selectedBranch,
      nameKh,
      nameEn,
      type: branchType,
      addressKh,
      addressEn,
      managerName,
      lat,
      lng,
      radiusMeters,
      openTime,
      closeTime,
      contactPhone,
      imageUrl,
    };
    onUpdateBranch(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Image Upload handler for branch
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isForNewBranch: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (isForNewBranch) {
          setNewBranchData((prev) => ({ ...prev, imageUrl: result }));
        } else {
          setImageUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Create New Branch Type
  const handleCreateBranchType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeNameEn.trim() || !newTypeNameKh.trim()) return;

    const id = newTypeId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || `type_${Date.now()}`;
    const badgeColorMap: Record<string, { bg: string; text: string; border: string; theme: string }> = {
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', theme: 'from-emerald-600 to-teal-600' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', theme: 'from-indigo-600 to-blue-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', theme: 'from-purple-600 to-indigo-600' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', theme: 'from-amber-600 to-orange-600' },
      rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', theme: 'from-rose-600 to-pink-600' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', theme: 'from-cyan-600 to-blue-600' },
    };

    const scheme = badgeColorMap[newTypeColor] || badgeColorMap.indigo;

    const newTypeConfig: BranchTypeConfig = {
      id,
      nameKh: newTypeNameKh.trim(),
      nameEn: newTypeNameEn.trim(),
      iconName: newTypeIcon,
      themeColor: scheme.theme,
      badgeBg: scheme.bg,
      badgeText: scheme.text,
      badgeBorder: scheme.border,
      descriptionKh: `ប្រភេទសាខា ${newTypeNameKh}`,
      descriptionEn: `${newTypeNameEn} branch category`,
    };

    if (onAddBranchType) {
      onAddBranchType(newTypeConfig);
    }

    setNewTypeId('');
    setNewTypeNameKh('');
    setNewTypeNameEn('');
    setShowAddTypeModal(false);
  };

  // Create New Branch Submit
  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.nameEn.trim() || !newBranchData.nameKh.trim()) return;

    const newBranch: Branch = {
      id: `br_${Date.now()}`,
      nameKh: newBranchData.nameKh,
      nameEn: newBranchData.nameEn,
      type: newBranchData.type,
      addressKh: newBranchData.addressKh || 'រាជធានីភ្នំពេញ',
      addressEn: newBranchData.addressEn || 'Phnom Penh, Cambodia',
      lat: newBranchData.lat,
      lng: newBranchData.lng,
      radiusMeters: newBranchData.radiusMeters,
      openTime: newBranchData.openTime,
      closeTime: newBranchData.closeTime,
      managerName: newBranchData.managerName || 'Branch Manager',
      contactPhone: newBranchData.contactPhone || '012 345 678',
      themeColor: 'from-indigo-600 to-blue-600',
      iconName: 'Building2',
      imageUrl: newBranchData.imageUrl,
      activeStaffCount: 0,
    };

    if (onAddBranch) {
      onAddBranch(newBranch);
    }

    setShowAddBranchModal(false);
    setEditingBranchId(newBranch.id);
    handleSelectBranch(newBranch);
  };

  const getBranchIcon = (type: string) => {
    switch (type) {
      case 'club':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'warehouse':
        return <Warehouse className="w-4 h-4 text-amber-600" />;
      case 'cafe':
        return <Coffee className="w-4 h-4 text-emerald-600" />;
      case 'boutique':
        return <Store className="w-4 h-4 text-rose-600" />;
      case 'factory':
        return <Factory className="w-4 h-4 text-slate-600" />;
      case 'office':
      default:
        return <Building2 className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getTypeConfig = (type: string) => {
    return branchTypes.find((t) => t.id === type) || {
      id: type,
      nameKh: type.toUpperCase(),
      nameEn: type.toUpperCase(),
      badgeBg: 'bg-slate-50',
      badgeText: 'text-slate-700',
      badgeBorder: 'border-slate-200',
    };
  };

  // Filter branches
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.nameEn.toLowerCase().includes(searchBranch.toLowerCase()) ||
      b.nameKh.toLowerCase().includes(searchBranch.toLowerCase()) ||
      b.addressEn.toLowerCase().includes(searchBranch.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || b.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Sub-Navigation Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Building2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>{lang === 'km' ? 'គ្រប់គ្រងសាខា & ប្រភេទសាខា (Branch Management)' : 'Multi-Branch & Geofence Suite'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                  {branches.length} {lang === 'km' ? 'សាខា' : 'Branches'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'km'
                  ? 'កំណត់ទីតាំង Geofence កែប្រែរូបភាពសាខា បង្កើតប្រភេទសាខាថ្មី និងតាមដានប្រវត្តិផ្ទេរបុគ្គលិក'
                  : 'Configure geofencing radius, update venue photos, add custom branch types, and track staff transfers.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Sub-tabs switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('branches')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'branches' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'km' ? '🏢 បញ្ជីសាខា' : '🏢 Branches'}
            </button>
            <button
              onClick={() => setActiveTab('types')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'types' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'km' ? '🏷️ ប្រភេទសាខា' : '🏷️ Branch Types'}
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activeTab === 'transfers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{lang === 'km' ? '🔄 ប្រវត្តិផ្ទេរ' : '🔄 Staff Transfers'}</span>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {transferRecords.length}
              </span>
            </button>
          </div>

          {activeTab === 'branches' && (
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'km' ? 'បង្កើតសាខាថ្មី' : 'Add Branch'}</span>
            </button>
          )}

          {activeTab === 'types' && (
            <button
              onClick={() => setShowAddTypeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'km' ? 'បន្ថែមប្រភេទសាខាថ្មី' : 'Add Branch Type'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: BRANCH CONFIGURATION & VENUE IMAGE MANAGEMENT */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះសាខា ទីតាំង...' : 'Search branch name, address...'}
                value={searchBranch}
                onChange={(e) => setSearchBranch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{lang === 'km' ? 'គ្រប់ប្រភេទសាខាទាំងអស់' : 'All Branch Types'}</option>
                {branchTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {lang === 'km' ? t.nameKh : t.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Branch Cards List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {lang === 'km' ? 'ជ្រើសរើសសាខាដើម្បីកែប្រែ:' : 'Select Branch to Configure:'}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {filteredBranches.length} {lang === 'km' ? 'សាខា' : 'Venues'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                {filteredBranches.map((branch) => {
                  const isSelected = branch.id === editingBranchId;
                  const typeConf = getTypeConfig(branch.type);
                  const staffCount = employees.filter((e) => e.branchId === branch.id).length || branch.activeStaffCount || 0;

                  return (
                    <div
                      key={branch.id}
                      onClick={() => handleSelectBranch(branch)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-sm relative overflow-hidden ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Branch Photo / Image Thumbnail */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-inner">
                          {branch.imageUrl ? (
                            <img
                              src={branch.imageUrl}
                              alt={branch.nameEn}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = PRESET_BRANCH_IMAGES[0].url;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                              {getBranchIcon(branch.type)}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 p-0.5 bg-slate-900/60 rounded-tl text-white">
                            {getBranchIcon(branch.type)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-800 truncate">
                            {lang === 'km' ? branch.nameKh : branch.nameEn}
                          </h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium truncate">
                            <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>{branch.radiusMeters}m Geofence</span>
                            <span>•</span>
                            <span>{branch.openTime}-{branch.closeTime}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {staffCount} {lang === 'km' ? 'បុគ្គលិកប្រចាំការ' : 'staff assigned'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeConf.badgeBg} ${typeConf.badgeText} ${typeConf.badgeBorder}`}>
                          {lang === 'km' ? typeConf.nameKh.split(' ')[0] : typeConf.nameEn.split(' ')[0]}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Branch Parameters Editor (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                    <img
                      src={imageUrl || selectedBranch?.imageUrl || PRESET_BRANCH_IMAGES[0].url}
                      alt={nameEn}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = PRESET_BRANCH_IMAGES[0].url;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowImagePickerModal(true)}
                      className="absolute inset-0 bg-black/40 hover:bg-black/60 flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 hover:opacity-100 transition"
                    >
                      <ImageIcon className="w-4 h-4 mb-0.5" />
                      <span>{lang === 'km' ? 'ប្តូររូប' : 'Change'}</span>
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {lang === 'km' ? nameKh || selectedBranch?.nameKh : nameEn || selectedBranch?.nameEn}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{addressKh || selectedBranch?.addressKh}</p>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold">
                      ID: {selectedBranch?.id}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowImagePickerModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 border border-slate-200 transition shrink-0"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'km' ? 'កែប្រែរូបភាពសាខា' : 'Update Photo'}</span>
                </button>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 text-xs">
                {/* Branch Names & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'ឈ្មោះសាខា (ខ្មែរ):' : 'Branch Name (Khmer):'}
                    </label>
                    <input
                      type="text"
                      value={nameKh}
                      onChange={(e) => setNameKh(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'ឈ្មោះសាខា (អង់គ្លេស):' : 'Branch Name (English):'}
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'ប្រភេទសាខា (Branch Type):' : 'Branch Type:'}
                    </label>
                    <select
                      value={branchType}
                      onChange={(e) => setBranchType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {branchTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {lang === 'km' ? t.nameKh : t.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Branch Image URL quick editor */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                    <span>{lang === 'km' ? 'តំណភ្ជាប់រូបភាពសាខា (Image URL / Photo):' : 'Venue Image URL / Banner:'}</span>
                    <button
                      type="button"
                      onClick={() => setShowImagePickerModal(true)}
                      className="text-indigo-600 hover:underline font-bold text-[11px]"
                    >
                      {lang === 'km' ? 'ជ្រើសរើសពីរូបភាពគំរូ' : 'Pick from gallery'}
                    </button>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <label className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-slate-200 transition shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ផ្ទុកឡើង' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'អាសយដ្ឋាន (ខ្មែរ):' : 'Address (Khmer):'}
                    </label>
                    <input
                      type="text"
                      value={addressKh}
                      onChange={(e) => setAddressKh(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'អាសយដ្ឋាន (English):' : 'Address (English):'}
                    </label>
                    <input
                      type="text"
                      value={addressEn}
                      onChange={(e) => setAddressEn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Interactive Map Picker & Auto-Fetch */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'km' ? 'ផែនទីកំណត់ទីតាំង & Auto-Fetch កូអរដោនេ' : 'Interactive Map & GPS Calibration'}</span>
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold">
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </span>
                  </div>

                  <InteractiveMapPicker
                    lat={lat}
                    lng={lng}
                    radiusMeters={radiusMeters}
                    branchName={lang === 'km' ? nameKh : nameEn}
                    branchType={branchType}
                    lang={lang}
                    heightClass="h-[220px]"
                    onChange={(newLat, newLng) => {
                      setLat(newLat);
                      setLng(newLng);
                    }}
                  />
                </div>

                {/* Geofence Radius Slider */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-xs">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'km' ? 'កាំ Geofence អនុញ្ញាត (Allowed Radius):' : 'Allowed Geofence Perimeter:'}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-indigo-700 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
                      {radiusMeters} {lang === 'km' ? 'ម៉ែត្រ' : 'Meters'}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="20"
                    max="400"
                    step="5"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>20m (Strict Cafe)</span>
                    <span>85m (Nightclub)</span>
                    <span>400m (Large Logistics)</span>
                  </div>
                </div>

                {/* Operating Hours & Manager Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'ម៉ោងចាប់ផ្តើមវេន:' : 'Shift Start:'}
                    </label>
                    <input
                      type="text"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'ម៉ោងបញ្ចប់វេន:' : 'Shift End:'}
                    </label>
                    <input
                      type="text"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === 'km' ? 'លេខទូរស័ព្ទអ្នកគ្រប់គ្រង:' : 'Manager Phone:'}
                    </label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-200 transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>{lang === 'km' ? 'រក្សាទុកការកំណត់សាខា' : 'Save Branch Settings'}</span>
                  </button>

                  {saveSuccess && (
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 animate-bounce">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'km' ? 'បានរក្សាទុក!' : 'Saved!'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANCH TYPES MANAGEMENT */}
      {activeTab === 'types' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'km' ? 'ប្រភេទសាខាដែលមានស្រាប់ក្នុងប្រព័ន្ធ (Configured Branch Types)' : 'Custom Branch Types & Venues'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'km'
                  ? 'បង្កើតប្រភេទសាខាថ្មីដូចជា Boutique, Showroom, Restaurant, Factory, Hospital...'
                  : 'Add and customize venue categories to segment your corporate enterprise hierarchy.'}
              </p>
            </div>

            <button
              onClick={() => setShowAddTypeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'km' ? 'បន្ថែមប្រភេទថ្មី' : 'New Branch Type'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchTypes.map((t) => {
              const branchesUnderType = branches.filter((b) => b.type === t.id);
              return (
                <div
                  key={t.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-indigo-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${t.badgeBg} ${t.badgeText} ${t.badgeBorder}`}>
                      {t.id.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {branchesUnderType.length} {lang === 'km' ? 'សាខា' : 'venues'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{t.nameEn}</h4>
                    <p className="text-xs text-slate-600 font-medium">{t.nameKh}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{t.descriptionEn || t.descriptionKh}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Icon: <span className="font-mono font-bold text-slate-600">{t.iconName}</span>
                    </span>

                    {/* Show delete if custom and has no branches */}
                    {onDeleteBranchType && !['club', 'warehouse', 'cafe', 'office'].includes(t.id) && (
                      <button
                        onClick={() => onDeleteBranchType(t.id)}
                        className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RECENT BRANCH TRANSFERS & AUDIT TRAIL */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {lang === 'km' ? 'ប្រវត្តិនៃការផ្ទេរសាខាបុគ្គលិក (Staff Branch Rotation Records)' : 'Branch Transfer Audit Trail'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km'
                    ? 'កំណត់ត្រាផ្ទេរផ្លូវការ និងការចាក់សោ QR/Geofence ទៅកាន់សាខាថ្មី'
                    : 'Verified records of employee branch reassignments.'}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-100">
              {transferRecords.length} {lang === 'km' ? 'កំណត់ត្រា' : 'Transfers'}
            </span>
          </div>

          {transferRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {lang === 'km' ? 'មិនទាន់មានប្រវត្តិផ្ទេរសាខានៅឡើយទេ' : 'No staff transfers recorded yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {transferRecords.map((tr) => {
                const emp = employees.find((e) => e.id === tr.employeeId || e.code === tr.employeeCode);
                const avatar = tr.employeeAvatar || emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces';

                return (
                  <div
                    key={tr.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Employee Identification */}
                      <div className="flex items-center space-x-3">
                        <img
                          src={avatar}
                          alt={tr.employeeNameEn}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-200"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces';
                          }}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-slate-800">
                              {lang === 'km' ? tr.employeeNameKh : tr.employeeNameEn}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                              {tr.employeeCode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {emp ? (lang === 'km' ? emp.roleKh : emp.role) : 'Transferred Staff'} • {emp?.departmentKh || 'Operations'}
                          </p>
                        </div>
                      </div>

                      {/* Transfer Date */}
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          📅 {tr.effectiveDate || tr.transferDate}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Auth: {tr.transferredBy || tr.approvedBy || 'Admin'}
                        </p>
                      </div>
                    </div>

                    {/* Route Transition */}
                    <div className="flex items-center space-x-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex-1 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                        <span className="text-[10px] text-amber-700 font-bold block uppercase">
                          {lang === 'km' ? '📍 សាខាដើម (From):' : '📍 From Branch:'}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{tr.fromBranchNameEn}</span>
                      </div>

                      <div className="text-indigo-600 font-bold text-base px-1">➔</div>

                      <div className="flex-1 bg-indigo-50/70 p-2 rounded-lg border border-indigo-200">
                        <span className="text-[10px] text-indigo-700 font-bold block uppercase">
                          {lang === 'km' ? '📍 សាខាថ្មី (To):' : '📍 To Assigned Branch:'}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{tr.toBranchNameEn}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    {tr.reason && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 italic">
                        "{tr.reason}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD NEW BRANCH TYPE */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Tag className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-800 text-base">
                  {lang === 'km' ? 'បន្ថែមប្រភេទសាខាថ្មី' : 'Add New Branch Type'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranchType} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'km' ? 'ឈ្មោះប្រភេទសាខា (អង់គ្លេស):' : 'Type Name (English):'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flagship Boutique, Restaurant, Clinic"
                  value={newTypeNameEn}
                  onChange={(e) => {
                    setNewTypeNameEn(e.target.value);
                    if (!newTypeId) {
                      setNewTypeId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'km' ? 'ឈ្មោះប្រភេទសាខា (ខ្មែរ):' : 'Type Name (Khmer):'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. ហាងលក់រាយ Showroom, ភោជនីយដ្ឋាន..."
                  value={newTypeNameKh}
                  onChange={(e) => setNewTypeNameKh(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'km' ? 'អត្តសញ្ញាណ Key (ID):' : 'Type Identifier Key (ID):'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. boutique, clinic, showroom"
                  value={newTypeId}
                  onChange={(e) => setNewTypeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'km' ? 'ពណ៌សម្គាល់ (Theme Badge Color):' : 'Badge Color Theme:'}
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {['indigo', 'emerald', 'purple', 'amber', 'rose', 'cyan'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTypeColor(color)}
                      className={`h-8 rounded-xl border-2 transition ${
                        newTypeColor === color ? 'border-slate-900 scale-105' : 'border-transparent'
                      } ${
                        color === 'indigo' ? 'bg-indigo-500' :
                        color === 'emerald' ? 'bg-emerald-500' :
                        color === 'purple' ? 'bg-purple-500' :
                        color === 'amber' ? 'bg-amber-500' :
                        color === 'rose' ? 'bg-rose-500' : 'bg-cyan-500'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm"
                >
                  {lang === 'km' ? 'រក្សាទុកប្រភេទសាខា' : 'Create Branch Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMAGE PRESET PICKER & UPLOADER */}
      {showImagePickerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {lang === 'km' ? 'ជ្រើសរើស ឬផ្ទុកឡើងរូបភាពសាខា' : 'Branch Venue Image Gallery'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'km' ? 'ជ្រើសរើសរូបភាពគុណភាពខ្ពស់ ឬ Upload រូបថតជាក់ស្តែង' : 'Select high-resolution venue photo or upload custom snapshot'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImagePickerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom File Upload Option */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-indigo-950 text-xs">
                  {lang === 'km' ? 'ផ្ទុកឡើងរូបថតផ្ទាល់ពីកុំព្យូទ័រ / ទូរស័ព្ទ' : 'Upload custom photo from device'}
                </h4>
                <p className="text-[11px] text-indigo-800">Supports JPG, PNG, WebP (auto-compressed)</p>
              </div>

              <label className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition">
                <Upload className="w-4 h-4" />
                <span>{lang === 'km' ? 'ជ្រើសរើសឯកសារ' : 'Choose File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleImageFileUpload(e, false);
                    setShowImagePickerModal(false);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Presets Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {lang === 'km' ? 'រូបភាពគំរូស្អាតៗតាមប្រភេទសាខា (Curated Presets):' : 'Curated Venue Presets:'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESET_BRANCH_IMAGES.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setImageUrl(preset.url);
                      setShowImagePickerModal(false);
                    }}
                    className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition shadow-sm hover:shadow-md ${
                      imageUrl === preset.url ? 'border-indigo-600 ring-2 ring-indigo-500/30' : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="h-28 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="p-2 bg-white flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">{preset.name}</span>
                      {imageUrl === preset.url && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE NEW BRANCH */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-800 text-base">
                  {lang === 'km' ? 'បង្កើតសាខាថ្មីក្នុងប្រព័ន្ធ' : 'Register New Branch Venue'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranchSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'km' ? 'ឈ្មោះសាខា (ខ្មែរ):' : 'Branch Name (Khmer):'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. ហាងកាហ្វេ អារ៉ូម៉ា - សាខាសែនសុខ"
                    value={newBranchData.nameKh}
                    onChange={(e) => setNewBranchData({ ...newBranchData, nameKh: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'km' ? 'ឈ្មោះសាខា (អង់គ្លេស):' : 'Branch Name (English):'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aroma Cafe - Sen Sok"
                    value={newBranchData.nameEn}
                    onChange={(e) => setNewBranchData({ ...newBranchData, nameEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'km' ? 'ប្រភេទសាខា:' : 'Branch Type:'}
                  </label>
                  <select
                    value={newBranchData.type}
                    onChange={(e) => setNewBranchData({ ...newBranchData, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {branchTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {lang === 'km' ? t.nameKh : t.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'km' ? 'កាំ Geofence (ម៉ែត្រ):' : 'Geofence Radius (m):'}
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="500"
                    value={newBranchData.radiusMeters}
                    onChange={(e) => setNewBranchData({ ...newBranchData, radiusMeters: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Latitude:</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newBranchData.lat}
                    onChange={(e) => setNewBranchData({ ...newBranchData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Longitude:</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newBranchData.lng}
                    onChange={(e) => setNewBranchData({ ...newBranchData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Venue Image URL */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'km' ? 'រូបភាពតំណាងសាខា (Image URL):' : 'Branch Venue Image URL:'}
                </label>
                <input
                  type="text"
                  value={newBranchData.imageUrl}
                  onChange={(e) => setNewBranchData({ ...newBranchData, imageUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm"
                >
                  {lang === 'km' ? 'បង្កើតសាខា' : 'Create Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
