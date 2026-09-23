import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Layers, 
  Clock, 
  Sparkles, 
  Building2, 
  Users, 
  Calendar, 
  Radio, 
  Save, 
  RotateCcw,
  Check,
  HardDrive,
  Copy,
  Sliders,
  ShieldCheck,
  Filter,
  Palette,
  Shield,
  Settings
} from 'lucide-react';
import { 
  Branch, 
  Employee, 
  AttendanceRecord, 
  LeaveRequest, 
  BranchTransferRecord, 
  CompanyBranding, 
  RolePermission, 
  SystemSettings, 
  AuditLogEntry, 
  SystemBackupData, 
  Language,
  ConnectedPeer
} from '../types';
import { 
  generateSystemBackup, 
  downloadBackupFile, 
  validateAndParseBackupJSON,
  saveLocalSnapshot,
  getLocalSnapshots,
  deleteLocalSnapshot,
  LocalSnapshot,
  BackupSelectionOptions,
  DEFAULT_BACKUP_SELECTION
} from '../utils/backupRestoreUtils';
import { realtimeService } from '../utils/realtimeService';
import { syncStateToCloudDatabase, syncStateToCloudImmediate } from '../utils/firebaseSync';
import { Cloud, CloudUpload, Loader2 } from 'lucide-react';

interface BackupRestorePanelProps {
  branches: Branch[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  transferRecords: BranchTransferRecord[];
  branding: CompanyBranding;
  rolePermissions: RolePermission[];
  systemSettings: SystemSettings;
  auditLogs: AuditLogEntry[];
  onRestoreBackup: (backupData: SystemBackupData, mode: 'merge' | 'overwrite') => void;
  onResetSystem: (type: 'demo_seed' | 'clean_fresh') => void;
  onAddAuditLog: (log: AuditLogEntry) => void;
  isLiveSyncConnected: boolean;
  onlinePeersCount: number;
  connectedPeers: ConnectedPeer[];
  lang: Language;
}

export const BackupRestorePanel: React.FC<BackupRestorePanelProps> = ({
  branches,
  employees,
  attendanceRecords,
  leaveRequests,
  transferRecords,
  branding,
  rolePermissions,
  systemSettings,
  auditLogs,
  onRestoreBackup,
  onResetSystem,
  onAddAuditLog,
  isLiveSyncConnected,
  onlinePeersCount,
  connectedPeers,
  lang,
}) => {
  // Selective Export Module State
  const [selectedExportModules, setSelectedExportModules] = useState<BackupSelectionOptions>(DEFAULT_BACKUP_SELECTION);

  // Selective Restore Module State
  const [selectedRestoreModules, setSelectedRestoreModules] = useState<BackupSelectionOptions>(DEFAULT_BACKUP_SELECTION);

  // Snapshot State
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([]);
  const [newSnapshotName, setNewSnapshotName] = useState<string>('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState<boolean>(false);

  // File Upload / Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState<string>('');
  const [parsedBackup, setParsedBackup] = useState<SystemBackupData | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showJsonPaste, setShowJsonPaste] = useState<boolean>(false);
  const [pastedJson, setPastedJson] = useState<string>('');

  // Reset Confirmation State
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetType, setResetType] = useState<'demo_seed' | 'clean_fresh'>('demo_seed');
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');

  // Toast Feedback State
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  useEffect(() => {
    setSnapshots(getLocalSnapshots());
  }, []);

  const triggerAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertBanner({ type, message });
    setTimeout(() => setAlertBanner(null), 5000);
  };

  // Toggle export module
  const toggleExportModule = (key: keyof BackupSelectionOptions) => {
    setSelectedExportModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle restore module
  const toggleRestoreModule = (key: keyof BackupSelectionOptions) => {
    setSelectedRestoreModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Select / Deselect All Export Modules
  const setAllExportModules = (value: boolean) => {
    setSelectedExportModules({
      branches: value,
      employees: value,
      attendanceRecords: value,
      leaveRequests: value,
      transferRecords: value,
      branding: value,
      rolePermissions: value,
      systemSettings: value,
      auditLogs: value,
    });
  };

  // Select / Deselect All Restore Modules
  const setAllRestoreModules = (value: boolean) => {
    setSelectedRestoreModules({
      branches: value,
      employees: value,
      attendanceRecords: value,
      leaveRequests: value,
      transferRecords: value,
      branding: value,
      rolePermissions: value,
      systemSettings: value,
      auditLogs: value,
    });
  };

  const activeExportModulesCount = Object.values(selectedExportModules).filter(Boolean).length;

  // 1. BACKUP DOWNLOAD WITH SELECTION
  const handleDownloadBackup = () => {
    if (activeExportModulesCount === 0) {
      triggerAlert('error', lang === 'km' ? 'សូមជ្រើសរើសយ៉ាងហោចណាស់ ១ ផ្នែកដើម្បីទាញយក!' : 'Please select at least 1 module to export!');
      return;
    }

    const backupData = generateSystemBackup(
      branches,
      employees,
      attendanceRecords,
      leaveRequests,
      transferRecords,
      branding,
      rolePermissions,
      systemSettings,
      auditLogs,
      selectedExportModules
    );

    const suffix = activeExportModulesCount === 9 ? 'FullBackup' : 'SelectiveBackup';
    downloadBackupFile(backupData, `${branding.companyNameEn || 'Attendance'}_${suffix}`);

    const exportedModuleNames = Object.entries(selectedExportModules)
      .filter(([_, active]) => active)
      .map(([k]) => k)
      .join(', ');

    onAddAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Super Admin',
      actorRole: 'admin',
      action: 'Exported System Backup',
      actionKh: 'ទាញយកឯកសារបម្រុងទុកប្រព័ន្ធ (JSON Backup)',
      module: 'backup',
      details: `Generated ${suffix} with modules: [${exportedModuleNames}]. Checksum: ${backupData.checksum}`,
      detailsKh: `បានទាញយកឯកសារបម្រុងទុក (${suffix}) ផ្នែក: [${exportedModuleNames}]។`,
      status: 'success',
    });

    triggerAlert(
      'success', 
      lang === 'km' 
        ? `ឯកសារបម្រុងទុក (${activeExportModulesCount}/៩ ផ្នែក) ត្រូវបានទាញយកជោគជ័យ!` 
        : `Selective backup (${activeExportModulesCount}/9 modules) downloaded successfully!`
    );
  };

  // 2. CREATE SNAPSHOT
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSnapshotName.trim() || `Snapshot ${new Date().toLocaleTimeString()}`;
    const backupData = generateSystemBackup(
      branches,
      employees,
      attendanceRecords,
      leaveRequests,
      transferRecords,
      branding,
      rolePermissions,
      systemSettings,
      auditLogs,
      selectedExportModules
    );

    const updated = saveLocalSnapshot(name, backupData);
    setSnapshots(updated);
    setNewSnapshotName('');
    setIsCreatingSnapshot(false);

    triggerAlert('success', lang === 'km' ? `បានរក្សាទុកចំណុចស្តារ (Snapshot): "${name}"` : `Local snapshot "${name}" created successfully!`);
  };

  // 3. RESTORE FROM SNAPSHOT
  const handleRestoreFromSnapshot = (snap: LocalSnapshot) => {
    if (window.confirm(lang === 'km' ? `តើអ្នកពិតជាចង់ស្តារទិន្នន័យពីចំណុច "${snap.name}" មែនទេ?` : `Are you sure you want to restore system state from snapshot "${snap.name}"?`)) {
      onRestoreBackup(snap.data, 'overwrite');
      triggerAlert('success', lang === 'km' ? `ប្រព័ន្ធត្រូវបានស្តារជោគជ័យពី "${snap.name}"!` : `System restored successfully from "${snap.name}"!`);
    }
  };

  // 4. DELETE SNAPSHOT
  const handleDeleteSnapshot = (id: string) => {
    const updated = deleteLocalSnapshot(id);
    setSnapshots(updated);
  };

  // 5. HANDLE FILE UPLOAD
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFileContent(content);
      processBackupContent(content);
    };
    reader.readAsText(file);
  };

  const processBackupContent = (jsonText: string) => {
    const result = validateAndParseBackupJSON(jsonText);
    if (!result.valid || !result.data) {
      setValidationError(result.error || 'Invalid backup JSON file format');
      setParsedBackup(null);
    } else {
      setValidationError('');
      setParsedBackup(result.data);
    }
  };

  // 6. EXECUTE RESTORE WITH MODULE FILTER
  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    const filteredBackup: SystemBackupData = {
      ...parsedBackup,
      branches: selectedRestoreModules.branches ? parsedBackup.branches : undefined,
      employees: selectedRestoreModules.employees ? parsedBackup.employees : undefined,
      attendanceRecords: selectedRestoreModules.attendanceRecords ? parsedBackup.attendanceRecords : undefined,
      leaveRequests: selectedRestoreModules.leaveRequests ? parsedBackup.leaveRequests : undefined,
      transferRecords: selectedRestoreModules.transferRecords ? parsedBackup.transferRecords : undefined,
      branding: selectedRestoreModules.branding ? parsedBackup.branding : undefined,
      rolePermissions: selectedRestoreModules.rolePermissions ? parsedBackup.rolePermissions : undefined,
      systemSettings: selectedRestoreModules.systemSettings ? parsedBackup.systemSettings : undefined,
      auditLogs: selectedRestoreModules.auditLogs ? parsedBackup.auditLogs : undefined,
    };

    setIsRestoring(true);
    setTimeout(() => {
      onRestoreBackup(filteredBackup, restoreMode);
      setIsRestoring(false);
      setParsedBackup(null);
      setUploadedFileContent('');
      setPastedJson('');
      setShowJsonPaste(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      triggerAlert(
        'success',
        lang === 'km'
          ? `ការស្តារទិន្នន័យ (${restoreMode === 'overwrite' ? 'ជំនួសទាំងស្រុង' : 'បញ្ចូលបន្ថែម'}) ទទួលបានជោគជ័យ!`
          : `System data restore (${restoreMode.toUpperCase()}) completed successfully and synced across all nodes!`
      );
    }, 600);
  };

  // 7. EXECUTE RESET
  const handleConfirmReset = (typeToReset?: 'demo_seed' | 'clean_fresh') => {
    const target = typeToReset || resetType;
    onResetSystem(target);
    setShowResetModal(false);
    setResetConfirmInput('');

    triggerAlert(
      'success',
      lang === 'km'
        ? target === 'demo_seed'
          ? 'ប្រព័ន្ធត្រូវបានកំណត់ឡើងវិញទៅទិន្នន័យគំរូដើម ៧ សាខាជោគជ័យ!'
          : 'ប្រព័ន្ធត្រូវបានសម្អាតទទេរស្អាត (Brand New Start) ជោគជ័យ!'
        : target === 'demo_seed'
        ? 'System reset to 7-branch official demo seed state!'
        : 'System wiped clean to brand new fresh start!'
    );
  };

  // Total items calculation
  const currentTotalRecords = branches.length + employees.length + attendanceRecords.length + leaveRequests.length + transferRecords.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Alert Notification Toast */}
      {alertBanner && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 ${
            alertBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : alertBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            {alertBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : alertBanner.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold">{alertBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertBanner(null)}
            className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-time Server Sync Architecture Status Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-white">
                    {lang === 'km' ? 'ម៉ាស៊ីនមេ និងការធ្វើសមកាលកម្ម Real-Time' : 'Real-Time Server Synchronization Mesh'}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isLiveSyncConnected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {isLiveSyncConnected ? '● Live WebSocket Connected' : '○ Reconnecting Mesh'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {lang === 'km'
                    ? 'រាល់ការស្កេនវត្តមាន (Check-in/Out), ការផ្ទេរសាខា, និងការសុំច្បាប់ ធ្វើសមកាលកម្មភ្លាមៗលើគ្រប់ឧបករណ៍'
                    : 'All check-in, check-out, staff transfers, and leave approvals synchronize instantaneously across all client devices and Kiosks.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                {lang === 'km' ? 'ឧបករណ៍អនឡាញ' : 'Online Nodes'}
              </span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {onlinePeersCount} {lang === 'km' ? 'គ្រឿង' : 'Devices'}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                {lang === 'km' ? 'ទិន្នន័យសរុប' : 'Total System Records'}
              </span>
              <span className="text-base font-black text-indigo-400 font-mono">
                {currentTotalRecords.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={async () => {
                setIsSyncingCloud(true);
                try {
                  const ok = await syncStateToCloudImmediate({
                    branches,
                    employees,
                    attendanceRecords,
                    leaveRequests,
                    transferRecords,
                    branding,
                    rolePermissions,
                    systemSettings,
                    auditLogs,
                  });
                  if (ok) {
                    triggerAlert(
                      'success',
                      lang === 'km'
                        ? `☁️ បានបញ្ជូនទិន្នន័យ (${branches.length} សាខា, ${employees.length} បុគ្គលិក, ${attendanceRecords.length} វត្តមាន) ទៅកាន់ Cloud Firestore រួចរាល់!`
                        : `☁️ Synced ${branches.length} branches, ${employees.length} employees, and ${attendanceRecords.length} records to Cloud Firestore!`
                    );
                  } else {
                    triggerAlert('error', lang === 'km' ? 'មានបញ្ហាក្នុងការរក្សាទុកទៅកាន់ Cloud' : 'Failed to sync to Cloud database');
                  }
                } finally {
                  setIsSyncingCloud(false);
                }
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-emerald-600/30"
            >
              {isSyncingCloud ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span>
                {isSyncingCloud
                  ? lang === 'km' ? 'កំពុងបញ្ជូន...' : 'Syncing...'
                  : lang === 'km' ? 'បញ្ចូលទៅ Cloud ឥឡូវ' : 'Sync to Cloud Now'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                realtimeService.sendPing();
                triggerAlert('info', lang === 'km' ? 'បានផ្ញើសញ្ញា Heartbeat ទៅកាន់ម៉ាស៊ីនមេ!' : 'Heartbeat ping sent to WebSocket server!');
              }}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'Ping ម៉ាស៊ីនមេ' : 'Ping Server'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Backup & Restore Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: 1. COMPLETE BACKUP & SNAPSHOTS */}
        <div className="space-y-6">
          {/* 1. Selective / Full Backup Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {lang === 'km' ? '១. ទាញយកឯកសារបម្រុងទុក (Backup Data)' : '1. System Data Backup'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {lang === 'km' ? 'ជ្រើសរើសផ្នែកទិន្នន័យដែលចង់ទាញយកជាឯកសារ JSON សុវត្ថិភាព' : 'Select specific modules or export full database in secure JSON format.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-100">
                  {activeExportModulesCount}/9 {lang === 'km' ? 'ផ្នែក' : 'Selected'}
                </span>
              </div>
            </div>

            {/* Module Selection Filter Bar */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'km' ? 'ជ្រើសរើសទិន្នន័យសម្រាប់ទាញយក (Select Modules):' : 'Select Modules to Include in Backup:'}</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setAllExportModules(true)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                  >
                    {lang === 'km' ? 'ជ្រើសទាំងអស់' : 'Select All'}
                  </button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => setAllExportModules(false)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    {lang === 'km' ? 'ដកទាំងអស់' : 'Clear All'}
                  </button>
                </div>
              </div>

              {/* Interactive Modular Checkbox Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {/* Branches */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('branches')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.branches
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.branches ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'សាខា (Branches)' : 'Branches'}</span>
                      <span className="text-[10px] font-mono opacity-80">{branches.length} {lang === 'km' ? 'ទីតាំង' : 'locations'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.branches ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.branches && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Employees */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('employees')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.employees
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.employees ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'បុគ្គលិក (Staff)' : 'Employees'}</span>
                      <span className="text-[10px] font-mono opacity-80">{employees.length} {lang === 'km' ? 'នាក់' : 'records'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.employees ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.employees && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Attendance Records */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('attendanceRecords')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.attendanceRecords
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.attendanceRecords ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'វត្តមាន (Punches)' : 'Attendance'}</span>
                      <span className="text-[10px] font-mono opacity-80">{attendanceRecords.length} {lang === 'km' ? 'កំណត់ត្រា' : 'logs'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.attendanceRecords ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.attendanceRecords && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Leave Requests */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('leaveRequests')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.leaveRequests
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.leaveRequests ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'ច្បាប់ឈប់ (Leaves)' : 'Leave Requests'}</span>
                      <span className="text-[10px] font-mono opacity-80">{leaveRequests.length} {lang === 'km' ? 'ច្បាប់' : 'requests'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.leaveRequests ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.leaveRequests && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Branch Transfers */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('transferRecords')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.transferRecords
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.transferRecords ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'ផ្ទេរសាខា (Transfers)' : 'Transfers'}</span>
                      <span className="text-[10px] font-mono opacity-80">{transferRecords.length} {lang === 'km' ? 'ប្រវត្តិ' : 'history'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.transferRecords ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.transferRecords && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Audit Logs */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('auditLogs')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.auditLogs
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.auditLogs ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'សវនកម្ម (Audit Logs)' : 'Audit Logs'}</span>
                      <span className="text-[10px] font-mono opacity-80">{auditLogs.length} {lang === 'km' ? 'កំណត់ត្រា' : 'logs'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.auditLogs ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.auditLogs && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Branding & Logo */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('branding')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.branding
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.branding ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Palette className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'ស្លាកយីហោ (Branding)' : 'Branding & Logo'}</span>
                      <span className="text-[10px] font-mono opacity-80">{branding.companyNameEn || 'Preset'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.branding ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.branding && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* Permissions & Roles */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('rolePermissions')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.rolePermissions
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.rolePermissions ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'សិទ្ធិ (Permissions)' : 'Role Permissions'}</span>
                      <span className="text-[10px] font-mono opacity-80">{rolePermissions.length} {lang === 'km' ? 'តួនាទី' : 'roles'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.rolePermissions ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.rolePermissions && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {/* System Settings */}
                <button
                  type="button"
                  onClick={() => toggleExportModule('systemSettings')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedExportModules.systemSettings
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-xl ${selectedExportModules.systemSettings ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Settings className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{lang === 'km' ? 'ការកំណត់ (Settings)' : 'System Settings'}</span>
                      <span className="text-[10px] font-mono opacity-80">{lang === 'km' ? 'គោលការណ៍' : 'Config'}</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedExportModules.systemSettings ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedExportModules.systemSettings && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={activeExportModulesCount === 0}
              onClick={handleDownloadBackup}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-indigo-200"
            >
              <Download className="w-4 h-4" />
              <span>
                {activeExportModulesCount === 9
                  ? lang === 'km'
                    ? 'ទាញយកកញ្ចប់ទិន្នន័យទាំងអស់ (Download Full Backup .JSON)'
                    : 'Download Full System Backup (.JSON)'
                  : lang === 'km'
                  ? `ទាញយកផ្នែកជ្រើសរើស (${activeExportModulesCount}/៩ ផ្នែក) .JSON`
                  : `Download Selected Modules (${activeExportModulesCount}/9 Modules) .JSON`}
              </span>
            </button>
          </div>

          {/* 2. In-Browser Instant Snapshots (Restore Points) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {lang === 'km' ? 'ចំណុចស្តាររហ័ស (Local In-Browser Snapshots)' : 'Instant Local Snapshots (Restore Points)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {lang === 'km' ? 'រក្សាទុកទិន្នន័យបច្ចុប្បន្នសម្រាប់ស្តារឡើងវិញភ្លាមៗ' : 'Quickly save instant checkpoints in browser storage for 1-click rollbacks.'}
                  </p>
                </div>
              </div>

              {!isCreatingSnapshot && (
                <button
                  type="button"
                  onClick={() => setIsCreatingSnapshot(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? '+ ចំណុចស្តារថ្មី' : '+ New Point'}</span>
                </button>
              )}
            </div>

            {/* Create Form */}
            {isCreatingSnapshot && (
              <form onSubmit={handleCreateSnapshot} className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <label className="block text-xs font-bold text-emerald-950">
                  {lang === 'km' ? 'ឈ្មោះសម្គាល់ចំណុចស្តារ (Snapshot Name):' : 'Snapshot Label / Reason:'}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    value={newSnapshotName}
                    onChange={(e) => setNewSnapshotName(e.target.value)}
                    placeholder={lang === 'km' ? 'ឧ. មុនពេលបូកសរុបប្រាក់ខែ, មុនប្តូរបុគ្គលិក...' : 'e.g. Before Payroll, Before Shift Reallocation...'}
                    className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    {lang === 'km' ? 'រក្សាទុក' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSnapshot(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </form>
            )}

            {/* Snapshots List */}
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
              {snapshots.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
                  {lang === 'km' ? 'មិនទាន់មានចំណុចស្តារ (Snapshot) នៅឡើយទេ' : 'No local snapshots saved yet. Click "+ New Point" to capture current state.'}
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 flex items-center justify-between transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-800 truncate">{snap.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({snap.data.summary.branchesCount} br / {snap.data.summary.employeesCount} staff / {snap.data.summary.attendanceRecordsCount} punches)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{snap.timestamp}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreFromSnapshot(snap)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                        title={lang === 'km' ? 'ស្តារឡើងវិញ' : 'Restore'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{lang === 'km' ? 'ស្តារ' : 'Restore'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title={lang === 'km' ? 'លុប' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2. RESTORE FILE & SYSTEM RESET */}
        <div className="space-y-6">
          {/* 1. Restore Backup File Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {lang === 'km' ? '២. ស្តារទិន្នន័យពីឯកសារ (Restore from JSON)' : '2. Restore System from Backup'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {lang === 'km' ? 'បញ្ចូលឯកសារ JSON បម្រុងទុកដើម្បីស្តារទិន្នន័យប្រព័ន្ធឡើងវិញ' : 'Import JSON backup file, review record counts, and execute synchronized restore.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowJsonPaste(!showJsonPaste)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                {showJsonPaste ? (lang === 'km' ? 'បញ្ចូលឯកសារ' : 'Upload File') : (lang === 'km' ? 'បិទភ្ជាប់កូដ JSON' : 'Paste Raw JSON')}
              </button>
            </div>

            {/* Mode selection: Upload or Paste */}
            {!showJsonPaste ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="backup-file-input"
                />
                <label
                  htmlFor="backup-file-input"
                  className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/80 hover:bg-indigo-50/30 flex flex-col items-center justify-center cursor-pointer transition text-center group"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition mb-2" />
                  <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-indigo-600">
                    {lang === 'km' ? 'ចុចដើម្បីជ្រើសរើសឯកសារ .JSON បម្រុងទុក' : 'Click or Drag & Drop Backup .JSON File here'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">
                    {lang === 'km' ? 'គាំទ្រឯកសារបម្រុងទុកគ្រប់កំណែ' : 'Supports complete system backup archives'}
                  </span>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={pastedJson}
                  onChange={(e) => {
                    setPastedJson(e.target.value);
                    if (e.target.value.trim()) processBackupContent(e.target.value);
                  }}
                  placeholder='{"version": "2.4.0", "branches": [...], "employees": [...]}'
                  className="w-full font-mono text-[11px] p-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>
            )}

            {/* Validation Error */}
            {validationError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Validated Backup Preview Card */}
            {parsedBackup && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-indigo-950">
                      {lang === 'km' ? 'ឯកសារត្រឹមត្រូវ ត្រៀមស្តារឡើងវិញ:' : 'Valid Backup Archive Detected:'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                    {parsedBackup.checksum}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 font-bold block">{lang === 'km' ? 'សាខា' : 'Branches'}</span>
                    <span className="font-bold text-indigo-900">{parsedBackup.summary.branchesCount}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 font-bold block">{lang === 'km' ? 'បុគ្គលិក' : 'Staff'}</span>
                    <span className="font-bold text-indigo-900">{parsedBackup.summary.employeesCount}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 font-bold block">{lang === 'km' ? 'វត្តមាន' : 'Attendance'}</span>
                    <span className="font-bold text-indigo-900">{parsedBackup.summary.attendanceRecordsCount}</span>
                  </div>
                </div>

                {/* Module Selective Restore Toggles */}
                <div className="space-y-2 pt-2 border-t border-indigo-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                      <Filter className="w-3 h-3 text-indigo-600" />
                      <span>{lang === 'km' ? 'ជ្រើសរើសផ្នែកដែលត្រូវស្តារ (Modules to Restore):' : 'Select Modules to Restore:'}</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setAllRestoreModules(true)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {lang === 'km' ? 'ជ្រើសទាំងអស់' : 'All'}
                      </button>
                      <span className="text-slate-300 text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={() => setAllRestoreModules(false)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700"
                      >
                        {lang === 'km' ? 'ដកទាំងអស់' : 'None'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                    {/* Branches */}
                    {parsedBackup.branches !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('branches')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.branches
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'សាខា' : 'Branches'} ({parsedBackup.branches.length})
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.branches ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.branches && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* Employees */}
                    {parsedBackup.employees !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('employees')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.employees
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'បុគ្គលិក' : 'Staff'} ({parsedBackup.employees.length})
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.employees ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.employees && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* Attendance Records */}
                    {parsedBackup.attendanceRecords !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('attendanceRecords')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.attendanceRecords
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'វត្តមាន' : 'Attendance'} ({parsedBackup.attendanceRecords.length})
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.attendanceRecords ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.attendanceRecords && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* Leaves */}
                    {parsedBackup.leaveRequests !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('leaveRequests')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.leaveRequests
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'ច្បាប់' : 'Leaves'} ({parsedBackup.leaveRequests.length})
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.leaveRequests ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.leaveRequests && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* Transfers */}
                    {parsedBackup.transferRecords !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('transferRecords')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.transferRecords
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'ផ្ទេរ' : 'Transfers'} ({parsedBackup.transferRecords.length})
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.transferRecords ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.transferRecords && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* Branding */}
                    {parsedBackup.branding !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('branding')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.branding
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'ស្លាកយីហោ' : 'Branding'}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.branding ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.branding && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* Roles / Permissions */}
                    {parsedBackup.rolePermissions !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('rolePermissions')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.rolePermissions
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'សិទ្ធិ' : 'Roles'} ({parsedBackup.rolePermissions.length})
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.rolePermissions ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.rolePermissions && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* System Settings */}
                    {parsedBackup.systemSettings !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('systemSettings')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.systemSettings
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'ការកំណត់' : 'Settings'}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.systemSettings ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.systemSettings && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* Audit Logs */}
                    {parsedBackup.auditLogs !== undefined && (
                      <button
                        type="button"
                        onClick={() => toggleRestoreModule('auditLogs')}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          selectedRestoreModules.auditLogs
                            ? 'bg-white border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                            : 'bg-indigo-50/40 border-indigo-200/50 text-slate-400 line-through'
                        }`}
                      >
                        <span className="text-[11px] truncate">
                          {lang === 'km' ? 'សវនកម្ម' : 'Audit Logs'} ({parsedBackup.auditLogs.length})
                        </span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedRestoreModules.auditLogs ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selectedRestoreModules.auditLogs && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {lang === 'km' ? 'ជ្រើសរើសរបៀបស្តារ:' : 'Select Restore Strategy:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('overwrite')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        restoreMode === 'overwrite'
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 font-medium hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs block leading-tight">
                        {lang === 'km' ? 'ជំនួសទាំងស្រុង (Overwrite)' : 'Clean Overwrite'}
                      </span>
                      <span className="text-[9px] opacity-80 block mt-0.5">
                        {lang === 'km' ? 'លុបទិន្នន័យចាស់ ដាក់ថ្មី' : 'Replace all existing records'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        restoreMode === 'merge'
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 font-medium hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs block leading-tight">
                        {lang === 'km' ? 'បញ្ចូលបន្ថែម (Merge)' : 'Merge Datasets'}
                      </span>
                      <span className="text-[9px] opacity-80 block mt-0.5">
                        {lang === 'km' ? 'កែប្រែ & បន្ថែមថ្មី' : 'Update matches, append new'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleExecuteRestore}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer shadow-md shadow-indigo-200"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'km' ? 'កំពុងស្តារទិន្នន័យ...' : 'Restoring & Broadcasting...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {lang === 'km' ? 'បញ្ជាក់ការស្តារទិន្នន័យ និង Sync ទៅកាន់ប្រព័ន្ធ' : 'Execute Synchronized System Restore'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 2. Factory Reset & Data Clearing Card */}
          <div className="bg-rose-50/50 p-6 sm:p-7 rounded-3xl border border-rose-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-rose-950 text-base">
                  {lang === 'km' ? '៣. ការកំណត់ប្រព័ន្ធឡើងវិញ (Factory Reset / Clear)' : '3. Factory Reset & System Data Reset'}
                </h3>
                <p className="text-[11px] text-rose-700 font-medium">
                  {lang === 'km'
                    ? 'កំណត់ប្រព័ន្ធឡើងវិញទៅទិន្នន័យគំរូដើម ៧ សាខា ឬសម្អាតទិន្នន័យប្រវត្តិទាំងអស់'
                    : 'Reinitialize system state to standard 7-branch seed demo data or clean fresh start.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetType('demo_seed');
                  setShowResetModal(true);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-rose-100/60 text-rose-700 border border-rose-300 font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{lang === 'km' ? 'កំណត់ទៅទិន្នន័យគំរូ ៧ សាខា' : 'Reset to 7-Branch Seed Data'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetType('clean_fresh');
                  setShowResetModal(true);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-md shadow-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>{lang === 'km' ? 'សម្អាតទិន្នន័យទាំងអស់ (Clean Slate)' : 'Wipe Clean & Fresh Start'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {resetType === 'clean_fresh'
                    ? lang === 'km'
                      ? 'កំណត់ប្រព័ន្ធទទេរស្អាត ចាប់ផ្តើមថ្មី (Blank Brand New Start)'
                      : 'Wipe System Clean & Blank Brand New Start'
                    : lang === 'km'
                    ? 'កំណត់ទៅទិន្នន័យគំរូដើម ៧ សាខា (Restore 7-Branch Seed Data)'
                    : 'Restore 7-Branch Demonstration Seed State'}
                </h3>
                <span className="text-[11px] text-rose-600 font-bold">
                  {resetType === 'clean_fresh'
                    ? lang === 'km'
                      ? '⚠️ សម្អាតទិន្នន័យបុគ្គលិក, វត្តមាន, ច្បាប់ និង Log ទាំងអស់'
                      : '⚠️ Empties all staff, punches, leaves, and logs'
                    : lang === 'km'
                    ? '🔄 ស្តារឡើងវិញនូវ ៧ សាខា និង ២១ បុគ្គលិកគំរូ'
                    : '🔄 Reinitializes 7 branches, 21 demo staff, and records'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-2">
              <p className="font-bold">
                {resetType === 'clean_fresh'
                  ? lang === 'km'
                    ? 'តើអ្នកប្រាកដជាចង់សម្អាតប្រព័ន្ធទាំងមូលឱ្យទទេរស្អាតដូចដើម (Brand New Blank Start) មែនទេ?'
                    : 'Are you sure you want to wipe the system to a clean blank slate (brand new start)?'
                  : lang === 'km'
                  ? 'តើអ្នកប្រាកដជាចង់ស្តារទិន្នន័យគំរូដើម ៧ សាខាឡើងវិញមែនទេ?'
                  : 'Are you sure you want to restore the official 7-branch demonstration system?'}
              </p>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                {resetType === 'clean_fresh'
                  ? lang === 'km'
                    ? 'ទិន្នន័យបុគ្គលិកទាំងអស់, ប្រវត្តិស្កេនវត្តមាន, សំណើសុំច្បាប់, ការផ្ទេរសាខា និង Audit Log នឹងត្រូវបានលុបចោលទាំងស្រុង។ ប្រព័ន្ធនឹងរៀបចំសាខាកណ្តាលថ្មីស្រឡាងមួយសម្រាប់ចាប់ផ្តើមអាជីវកម្មរបស់អ្នក។'
                    : 'All employee profiles, check-in punch history, leave approvals, branch transfers, and logs will be emptied. The system will be initialized to a clean blank slate ready for your company.'
                  : lang === 'km'
                  ? 'ទិន្នន័យគំរូដើម ៧ សាខា (ក្លិប Sapphire, Rooftop Eclipse, ឃ្លាំងកណ្តាល, Aroma Cafe ៤ សាខា) នឹងត្រូវស្តារឡើងវិញ។'
                  : 'The official 7-branch multi-venue setup (Sapphire Club, Eclipse Sky, Central Logistics Warehouse, and 4 Aroma Cafe branches) will be restored.'}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmInput('');
                }}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer text-center"
              >
                {lang === 'km' ? 'បោះបង់ (Cancel)' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmReset(resetType)}
                className={`px-6 py-3 rounded-2xl font-bold text-xs text-white transition cursor-pointer shadow-lg text-center flex items-center justify-center space-x-2 ${
                  resetType === 'clean_fresh'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {resetType === 'clean_fresh' ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{lang === 'km' ? 'បាទ/ចាស សម្អាតទទេរស្អាតឥឡូវនេះ (Wipe Blank Now)' : 'Yes, Wipe Clean & Blank Start'}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>{lang === 'km' ? 'បាទ/ចាស កំណត់ទៅទិន្នន័យគំរូ ៧ សាខា' : 'Yes, Restore 7-Branch Seed'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
