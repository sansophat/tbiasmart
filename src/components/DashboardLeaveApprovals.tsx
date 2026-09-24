import React, { useState } from 'react';
import { 
  Calendar, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  FileText, 
  User, 
  HeartPulse, 
  Coffee, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Paperclip, 
  ExternalLink,
  MessageSquare,
  Building2,
  ChevronDown,
  ChevronUp,
  Filter,
  Send,
  Zap
} from 'lucide-react';
import { LeaveRequest, Employee, Branch, Language, AuthUser } from '../types';
import { toKhmerNumeral } from '../utils/geoUtils';

interface DashboardLeaveApprovalsProps {
  leaveRequests: LeaveRequest[];
  employees: Employee[];
  branches: Branch[];
  currentUser?: AuthUser | null;
  onUpdateLeaveStatus: (requestId: string, newStatus: 'approved' | 'rejected', comment?: string) => void;
  onNavigateToLeavesTab?: () => void;
  lang: Language;
}

export const DashboardLeaveApprovals: React.FC<DashboardLeaveApprovalsProps> = ({
  leaveRequests,
  employees,
  branches,
  currentUser,
  onUpdateLeaveStatus,
  onNavigateToLeavesTab,
  lang,
}) => {
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Helper to calculate days between dates
  const calculateDays = (start?: string, end?: string): number => {
    if (!start || !end) return 1;
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = e.getTime() - s.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) || diffDays < 1 ? 1 : diffDays;
    } catch {
      return 1;
    }
  };

  const pendingRequests = leaveRequests.filter((r) => r.status === 'pending');
  const approvedRequests = leaveRequests.filter((r) => r.status === 'approved');
  const rejectedRequests = leaveRequests.filter((r) => r.status === 'rejected');

  const filteredRequests = leaveRequests.filter((req) => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (selectedCategory !== 'all' && req.category !== selectedCategory) return false;
    return true;
  });

  const handleApprove = (id: string) => {
    onUpdateLeaveStatus(id, 'approved');
  };

  const handleConfirmReject = (id: string) => {
    onUpdateLeaveStatus(id, 'rejected', rejectComment.trim() || undefined);
    setRejectingId(null);
    setRejectComment('');
  };

  const getCategoryBadge = (category: string, type: string) => {
    if (category === 'sick' || type === 'sick') {
      return {
        labelKh: 'ច្បាប់ឈឺ (Sick Leave)',
        labelEn: 'Sick Leave',
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
        icon: HeartPulse,
      };
    }
    if (category === 'overtime' || type === 'overtime') {
      return {
        labelKh: 'ថែមម៉ោង OT (Overtime)',
        labelEn: 'Overtime Request',
        bg: 'bg-purple-50 border-purple-200 text-purple-700',
        icon: Clock,
      };
    }
    if (category === 'permission' || type === 'half_day') {
      return {
        labelKh: 'សុំចេញមុន/មកយឺត (Permission)',
        labelEn: 'Permission Pass',
        bg: 'bg-cyan-50 border-cyan-200 text-cyan-700',
        icon: Clock,
      };
    }
    if (category === 'urgent' || type === 'urgent') {
      return {
        labelKh: 'ច្បាប់បន្ទាន់ (Urgent Leave)',
        labelEn: 'Urgent Leave',
        bg: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: AlertCircle,
      };
    }
    return {
      labelKh: 'ច្បាប់ប្រចាំឆ្នាំ (Annual Leave)',
      labelEn: 'Annual Leave',
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      icon: Calendar,
    };
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
      {/* Widget Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="relative p-2.5 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 text-indigo-300">
            <Calendar className="w-6 h-6" />
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-black font-battambang">
                {lang === 'km' ? 'ការស្នើសុំច្បាប់ & អនុម័តបន្ទាន់' : 'Staff Leave Requests & Instant Approval'}
              </h2>
              {pendingRequests.length > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                  {lang === 'km' ? `${toKhmerNumeral(pendingRequests.length)} រង់ចាំ` : `${pendingRequests.length} Pending`}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {lang === 'km' ? 'រួចរាល់ទាំងអស់' : 'All Clear'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {lang === 'km'
                ? 'ពិនិត្យមើល និងអនុម័ត ឬបដិសេធពាក្យសុំច្បាប់របស់បុគ្គលិកភ្លាមៗដោយចុច ១ Click'
                : 'Review, approve, or reject employee leave and overtime requests in 1-click'}
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToLeavesTab && (
            <button
              type="button"
              onClick={onNavigateToLeavesTab}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center space-x-1.5 border border-white/10 cursor-pointer"
            >
              <span>{lang === 'km' ? 'គ្រប់គ្រងពេញលេញ' : 'Full Manager'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>{lang === 'km' ? 'រង់ចាំអនុម័ត' : 'Pending'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'pending' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {pendingRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              filterStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>{lang === 'km' ? 'បានអនុម័ត' : 'Approved'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'approved' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {approvedRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              filterStatus === 'rejected'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>{lang === 'km' ? 'បានបដិសេធ' : 'Rejected'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'rejected' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {rejectedRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {leaveRequests.length}
            </span>
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            {lang === 'km' ? 'ប្រភេទ:' : 'Category:'}
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{lang === 'km' ? 'គ្រប់ប្រភេទ (All Types)' : 'All Types'}</option>
            <option value="leave">{lang === 'km' ? 'ច្បាប់ប្រចាំឆ្នាំ (Annual)' : 'Annual Leave'}</option>
            <option value="sick">{lang === 'km' ? 'ច្បាប់ឈឺ (Sick Leave)' : 'Sick Leave'}</option>
            <option value="urgent">{lang === 'km' ? 'ច្បាប់បន្ទាន់ (Urgent)' : 'Urgent Leave'}</option>
            <option value="overtime">{lang === 'km' ? 'ថែមម៉ោង OT' : 'Overtime'}</option>
            <option value="permission">{lang === 'km' ? 'ចេញមុន/មកយឺត' : 'Permission Pass'}</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="p-4 sm:p-6 space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 font-battambang">
              {filterStatus === 'pending'
                ? lang === 'km'
                  ? 'គ្មានពាក្យស្នើសុំច្បាប់កំពុងរង់ចាំទេ!'
                  : 'No Pending Leave Requests'
                : lang === 'km'
                ? 'គ្មានទិន្នន័យច្បាប់ត្រូវបង្ហាញទេ'
                : 'No leave requests found for this filter'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {filterStatus === 'pending'
                ? lang === 'km'
                  ? 'ពាក្យស្នើសុំទាំងអស់ត្រូវបានអនុម័តរួចរាល់។ នៅពេលបុគ្គលិកដាក់ពាក្យស្នើសុំថ្មី វានឹងលេចឡើងនៅទីនេះភ្លាមៗ។'
                  : 'All applications have been processed. New staff leave requests will appear here instantly.'
                : lang === 'km'
                ? 'សូមជ្រើសរើសផ្ទាំងតម្រងផ្សេងទៀតដើម្បីមើលកំណត់ត្រា'
                : 'Select another filter tab above to view historical requests'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredRequests.map((req) => {
              const emp = employees.find((e) => e.id === req.employeeId || e.code === req.employeeCode);
              const branch = branches.find((b) => b.id === req.branchId || b.id === emp?.branchId);
              const badge = getCategoryBadge(req.category, req.type);
              const BadgeIcon = badge.icon;
              const daysCount = calculateDays(req.startDate, req.endDate);
              const isRejecting = rejectingId === req.id;
              const isExpanded = expandedId === req.id;

              return (
                <div
                  key={req.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                    req.status === 'pending'
                      ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300 shadow-xs'
                      : req.status === 'approved'
                      ? 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Staff & Request Details */}
                    <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                      <img
                        src={
                          req.employeeAvatar ||
                          emp?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                        }
                        alt="Employee Avatar"
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-slate-800 text-sm sm:text-base font-battambang">
                            {lang === 'km' ? req.employeeNameKh || req.employeeNameEn : req.employeeNameEn || req.employeeNameKh}
                          </h4>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px] font-bold">
                            {req.employeeCode || emp?.code || 'STAFF'}
                          </span>
                          {branch && (
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>{lang === 'km' ? branch.nameKh : branch.nameEn}</span>
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                            <BadgeIcon className="w-3 h-3" />
                            <span>{lang === 'km' ? badge.labelKh : badge.labelEn}</span>
                          </span>
                        </div>

                        {/* Dates & Duration Banner */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium pt-0.5">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-bold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              {req.startDate === req.endDate ? req.startDate : `${req.startDate} → ${req.endDate}`}
                            </span>
                          </div>

                          <span className="px-2 py-0.5 rounded-lg bg-indigo-100/70 text-indigo-900 font-bold text-xs">
                            {req.category === 'overtime' || req.category === 'permission'
                              ? `${req.hours || 2} ម៉ោង / hrs`
                              : `${daysCount} ថ្ងៃ / ${daysCount} ${daysCount > 1 ? 'days' : 'day'}`}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            {lang === 'km' ? `ដាក់ពាក្យ: ${req.appliedAt}` : `Applied: ${req.appliedAt}`}
                          </span>
                        </div>

                        {/* Reason / Notes Box */}
                        <div className="mt-2 bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                          <div className="flex items-start space-x-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-800">
                                <span className="text-slate-500 font-normal">{lang === 'km' ? 'មូលហេតុ:' : 'Reason:'} </span>
                                {req.reason}
                              </p>
                              {req.attachmentUrl && (
                                <div className="flex items-center space-x-1 text-indigo-600 font-medium text-[11px] pt-1">
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span>{lang === 'km' ? 'ឯកសារភ្ជាប់ / Note:' : 'Attachment / Note:'} {req.attachmentUrl}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Admin comment or Approver info if already processed */}
                        {req.status !== 'pending' && (
                          <div className="mt-2 text-xs flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                              req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {req.status === 'approved' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              <span>
                                {req.status === 'approved'
                                  ? lang === 'km' ? `បានអនុម័តដោយ: ${req.approvedBy || 'Admin'}` : `Approved by: ${req.approvedBy || 'Admin'}`
                                  : lang === 'km' ? `បានបដិសេធដោយ: ${req.approvedBy || 'Admin'}` : `Rejected by: ${req.approvedBy || 'Admin'}`}
                              </span>
                            </span>
                            {req.adminComment && (
                              <span className="text-slate-500 italic">
                                "{req.adminComment}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Instant Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                      {req.status === 'pending' ? (
                        <>
                          <div className="flex items-center space-x-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleApprove(req.id)}
                              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center space-x-1.5 cursor-pointer font-battambang"
                            >
                              <Check className="w-4 h-4" />
                              <span>{lang === 'km' ? 'អនុម័ត (Approve)' : 'Approve'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (rejectingId === req.id) {
                                  setRejectingId(null);
                                } else {
                                  setRejectingId(req.id);
                                  setRejectComment('');
                                }
                              }}
                              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center justify-center space-x-1.5 cursor-pointer font-battambang"
                            >
                              <X className="w-4 h-4" />
                              <span>{lang === 'km' ? 'បដិសេធ (Reject)' : 'Reject'}</span>
                            </button>
                          </div>

                          {/* Reject Reason Quick Input */}
                          {isRejecting && (
                            <div className="w-full sm:w-80 mt-2 p-3 bg-white rounded-xl border border-rose-300 shadow-lg space-y-2 animate-fadeIn">
                              <label className="block text-[11px] font-bold text-slate-700">
                                {lang === 'km' ? 'មូលហេតុនៃការបដិសេធ (Reason for rejection):' : 'Rejection Reason (Optional):'}
                              </label>
                              <input
                                type="text"
                                placeholder={lang === 'km' ? 'ឧ. បុគ្គលិកផ្សេងទៀតបានសុំច្បាប់រួចហើយ' : 'e.g. Staff shortage on this shift'}
                                value={rejectComment}
                                onChange={(e) => setRejectComment(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                              />
                              <div className="flex items-center justify-end space-x-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setRejectingId(null)}
                                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                                >
                                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmReject(req.id)}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm"
                                >
                                  {lang === 'km' ? 'បញ្ជាក់បដិសេធ' : 'Confirm Reject'}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onUpdateLeaveStatus(req.id, req.status === 'approved' ? 'rejected' : 'approved')}
                            className="text-xs text-slate-500 hover:text-indigo-600 font-medium underline cursor-pointer"
                          >
                            {lang === 'km' ? 'ប្តូរស្ថានភាព' : 'Change Decision'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
