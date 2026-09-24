import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_BRANCH_TYPES,
  INITIAL_BRANCHES,
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_TRANSFER_RECORDS,
  INITIAL_BRANDING,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_AUDIT_LOGS,
} from './src/data/initialData';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// Enable JSON body parser with increased limit for backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// Centralized Persistent Database Store
// ==========================================
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'system_database.json');

const DEFAULT_STARTER_BRANCH = {
  id: 'br_main_hq',
  nameKh: 'ការិយាល័យកណ្តាល (Head Office)',
  nameEn: 'Main Corporate HQ',
  type: 'office',
  addressKh: 'រាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា',
  addressEn: 'Phnom Penh, Cambodia',
  lat: 11.55802,
  lng: 104.92804,
  radiusMeters: 80,
  openTime: '08:00',
  closeTime: '17:30',
  managerName: 'Administrator',
  contactPhone: '+855 23 888 999',
  themeColor: 'from-indigo-600 to-blue-600',
  iconName: 'Building2',
  activeStaffCount: 0,
};

const DEFAULT_ADMIN_PROFILE = {
  id: 'user_admin',
  username: 'admin',
  email: 'admin@enterprise.com.kh',
  role: 'admin',
  nameKh: 'ទៀង វឌ្ឍនា (នាយក HR)',
  nameEn: 'Tieng Vathana (HR Director)',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  employeeId: 'emp_off_1',
  employeeCode: 'HQ-001',
  branchId: 'br_office',
  roleTitle: 'Super Administrator / HR Director',
  pinCode: '1234',
  password: 'admin',
};

function getCleanBlankState() {
  return {
    branches: [DEFAULT_STARTER_BRANCH],
    branchTypes: INITIAL_BRANCH_TYPES,
    employees: [],
    attendanceRecords: [],
    leaveRequests: [],
    transferRecords: [],
    branding: INITIAL_BRANDING,
    rolePermissions: INITIAL_ROLE_PERMISSIONS,
    systemSettings: INITIAL_SYSTEM_SETTINGS,
    adminProfile: DEFAULT_ADMIN_PROFILE,
    auditLogs: [],
    lastUpdated: new Date().toISOString(),
    isReset: true,
  };
}

function getDemoSeedState() {
  return {
    branches: INITIAL_BRANCHES,
    branchTypes: INITIAL_BRANCH_TYPES,
    employees: INITIAL_EMPLOYEES,
    attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    transferRecords: INITIAL_TRANSFER_RECORDS,
    branding: INITIAL_BRANDING,
    rolePermissions: INITIAL_ROLE_PERMISSIONS,
    systemSettings: INITIAL_SYSTEM_SETTINGS,
    adminProfile: DEFAULT_ADMIN_PROFILE,
    auditLogs: INITIAL_AUDIT_LOGS,
    lastUpdated: new Date().toISOString(),
    isReset: false,
  };
}

// In-Memory Database initialized from file if exists, or demo seed
let serverDb: any = getDemoSeedState();

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.branches)) {
      serverDb = parsed;
      if (!serverDb.adminProfile) {
        serverDb.adminProfile = DEFAULT_ADMIN_PROFILE;
      }
      if (!Array.isArray(serverDb.branchTypes) || serverDb.branchTypes.length === 0) {
        serverDb.branchTypes = INITIAL_BRANCH_TYPES;
      }
      console.log(`[DB] Loaded system database from disk. (${serverDb.branches.length} branches, ${serverDb.employees.length} employees)`);
    }
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(serverDb, null, 2), 'utf-8');
    console.log('[DB] Initialized new system database file on disk.');
  }
} catch (err) {
  console.error('[DB] Error initializing system database file:', err);
}

function persistDatabase() {
  try {
    serverDb.lastUpdated = new Date().toISOString();
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(serverDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error persisting database to disk:', err);
  }
}

// In-Memory Real-time State & Peer Tracking
interface ConnectedPeerInfo {
  id: string;
  name: string;
  role: string;
  branchId?: string;
  branchName?: string;
  connectedAt: string;
  lastPing: number;
}

const connectedPeers = new Map<WebSocket, ConnectedPeerInfo>();

// WebSocket Server attached to the HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastPresence() {
  const peersList: ConnectedPeerInfo[] = Array.from(connectedPeers.values());
  const message = JSON.stringify({
    type: 'PRESENCE_STATE',
    payload: {
      onlineCount: peersList.length,
      peers: peersList,
    },
    senderId: 'server',
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastToClients(data: any, excludeClient?: WebSocket) {
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws: WebSocket, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Default peer info
  const peerInfo: ConnectedPeerInfo = {
    id: clientId,
    name: 'Anonymous Device',
    role: 'guest',
    connectedAt: new Date().toISOString(),
    lastPing: Date.now(),
  };

  connectedPeers.set(ws, peerInfo);
  broadcastPresence();

  // Send welcome confirmation without overriding client database
  ws.send(
    JSON.stringify({
      type: 'INIT_ACK',
      payload: {
        clientId,
        serverTime: new Date().toISOString(),
        onlineNodes: connectedPeers.size,
      },
      senderId: 'server',
      timestamp: new Date().toISOString(),
    })
  );

  ws.on('message', (rawMessage: string) => {
    try {
      const parsed = JSON.parse(rawMessage.toString());
      const { type, payload, senderId, senderName, senderRole, senderBranchId } = parsed;

      // Update peer metadata if provided
      if (type === 'PRESENCE_PING') {
        const current = connectedPeers.get(ws);
        if (current) {
          current.name = senderName || current.name;
          current.role = senderRole || current.role;
          current.branchId = senderBranchId || current.branchId;
          current.lastPing = Date.now();
          connectedPeers.set(ws, current);
          broadcastPresence();
        }
        return;
      }

      // If client requests canonical state
      if (type === 'REQUEST_CANONICAL_STATE') {
        ws.send(
          JSON.stringify({
            type: 'CANONICAL_STATE_RESPONSE',
            payload: { state: serverDb },
            senderId: 'server',
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // If client submits a leave request over WebSocket
      if ((type === 'SUBMIT_LEAVE' || type === 'SUBMIT_LEAVE_REQUEST') && payload && payload.id) {
        serverDb.leaveRequests = [payload, ...(serverDb.leaveRequests || []).filter((l: any) => l.id !== payload.id)];
        persistDatabase();

        // Broadcast to all other clients with both event types so neither is missed
        broadcastToClients({
          type: 'SUBMIT_LEAVE',
          payload,
          senderId: senderId || 'client',
          senderName,
          serverTimestamp: new Date().toISOString(),
        }, ws);
        broadcastToClients({
          type: 'SUBMIT_LEAVE_REQUEST',
          payload,
          senderId: senderId || 'client',
          senderName,
          serverTimestamp: new Date().toISOString(),
        }, ws);
        return;
      }

      // If client updates leave status over WebSocket
      if (type === 'UPDATE_LEAVE_STATUS' && payload && payload.requestId) {
        const { requestId, status, approvedBy, comment } = payload;
        if (Array.isArray(serverDb.leaveRequests)) {
          serverDb.leaveRequests = serverDb.leaveRequests.map((l: any) =>
            l.id === requestId
              ? {
                  ...l,
                  status,
                  approvedBy: approvedBy || l.approvedBy,
                  adminComment: comment || l.adminComment,
                }
              : l
          );
          persistDatabase();
        }
      }

      // If client punches attendance over WebSocket
      if (type === 'PUNCH_ATTENDANCE' && payload) {
        const record = payload.record || payload;
        if (record && record.id) {
          serverDb.attendanceRecords = [record, ...(serverDb.attendanceRecords || []).filter((r: any) => r.id !== record.id).slice(0, 499)];
          persistDatabase();
        }
      }

      // Ensure timestamp and forward to all other clients
      const broadcastMsg = {
        ...parsed,
        serverTimestamp: new Date().toISOString(),
      };

      broadcastToClients(broadcastMsg, ws);
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    connectedPeers.delete(ws);
    broadcastPresence();
  });

  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err);
    connectedPeers.delete(ws);
    broadcastPresence();
  });
});

// Clean up stale websocket connections periodically
setInterval(() => {
  const now = Date.now();
  connectedPeers.forEach((info, ws) => {
    if (now - info.lastPing > 90000) {
      try {
        ws.terminate();
      } catch (_) {}
      connectedPeers.delete(ws);
    }
  });
}, 30000);

// ==========================================
// REST API ENDPOINTS
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedClients: connectedPeers.size,
    branchesCount: serverDb.branches?.length || 0,
    employeesCount: serverDb.employees?.length || 0,
  });
});

// 1. GET CANONICAL SYSTEM STATE (Called by new devices/tabs on load)
app.get('/api/system/state', (req, res) => {
  res.json({
    success: true,
    state: serverDb,
    onlineClients: connectedPeers.size,
    lastUpdated: serverDb.lastUpdated,
  });
});

// 2. SAVE FULL/PARTIAL SYSTEM STATE
app.post('/api/system/state', (req, res) => {
  const { state, senderId, senderName } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'Missing state payload' });
  }

  serverDb = {
    ...serverDb,
    ...state,
    lastUpdated: new Date().toISOString(),
  };

  persistDatabase();

  const eventPayload = {
    type: 'SYSTEM_STATE_SYNC',
    payload: { state: serverDb },
    senderId: senderId || 'api_client',
    senderName: senderName || 'Admin',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, state: serverDb });
});

// 3. SYSTEM FACTORY RESET
app.post('/api/system/reset', (req, res) => {
  const { resetType, resetBy, senderId } = req.body;
  const isDemo = resetType === 'demo_seed';

  if (isDemo) {
    serverDb = getDemoSeedState();
  } else {
    serverDb = getCleanBlankState();
  }

  persistDatabase();

  const eventPayload = {
    type: 'SYSTEM_RESET',
    payload: {
      resetType: isDemo ? 'demo_seed' : 'clean_fresh',
      state: serverDb,
      resetBy: resetBy || 'Admin',
    },
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  console.log(`[DB] System reset executed: ${isDemo ? '7-Branch Demo Seed' : 'Brand New Blank Start'}`);
  res.json({ success: true, state: serverDb, resetType });
});

// 4. SYSTEM BACKUP RESTORE
app.post('/api/system/restore', (req, res) => {
  const { backupData, restoreMode, restoredBy, senderId } = req.body;
  if (!backupData || !backupData.branches) {
    return res.status(400).json({ error: 'Invalid backup package provided' });
  }

  if (restoreMode === 'overwrite') {
    serverDb = {
      branches: backupData.branches || [],
      employees: backupData.employees || [],
      attendanceRecords: backupData.attendanceRecords || [],
      leaveRequests: backupData.leaveRequests || [],
      transferRecords: backupData.transferRecords || [],
      branding: backupData.branding || INITIAL_BRANDING,
      rolePermissions: backupData.rolePermissions || INITIAL_ROLE_PERMISSIONS,
      systemSettings: backupData.systemSettings || INITIAL_SYSTEM_SETTINGS,
      adminProfile: backupData.adminProfile || (backupData as any).profile || serverDb.adminProfile || DEFAULT_ADMIN_PROFILE,
      auditLogs: backupData.auditLogs || [],
      lastUpdated: new Date().toISOString(),
      isReset: false,
    };
  } else {
    // Merge mode
    const mergeArrays = (original: any[] = [], incoming: any[] = []) => {
      const map = new Map();
      original.forEach((item) => {
        if (item && item.id) map.set(item.id, item);
      });
      incoming.forEach((item) => {
        if (item && item.id) map.set(item.id, { ...map.get(item.id), ...item });
      });
      return Array.from(map.values());
    };

    serverDb = {
      ...serverDb,
      branches: mergeArrays(serverDb.branches, backupData.branches),
      employees: mergeArrays(serverDb.employees, backupData.employees),
      attendanceRecords: mergeArrays(serverDb.attendanceRecords, backupData.attendanceRecords),
      leaveRequests: mergeArrays(serverDb.leaveRequests, backupData.leaveRequests),
      transferRecords: mergeArrays(serverDb.transferRecords, backupData.transferRecords),
      adminProfile: backupData.adminProfile || (backupData as any).profile 
        ? { ...(serverDb.adminProfile || {}), ...(backupData.adminProfile || (backupData as any).profile) } 
        : serverDb.adminProfile,
      lastUpdated: new Date().toISOString(),
    };
  }

  persistDatabase();

  const eventPayload = {
    type: 'SYSTEM_RESTORE',
    payload: {
      backupData,
      restoreMode: restoreMode || 'overwrite',
      restoredBy: restoredBy || 'Admin',
      state: serverDb,
    },
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  console.log(`[DB] Backup restore executed via ${restoreMode.toUpperCase()} mode.`);
  res.json({ success: true, state: serverDb });
});

// 5. ATTENDANCE PUNCH
app.post('/api/attendance/punch', (req, res) => {
  const { record, employee, branch, senderId } = req.body;
  if (!record || !record.id) {
    return res.status(400).json({ error: 'Missing attendance record' });
  }

  // Prepend to attendance records
  serverDb.attendanceRecords = [record, ...(serverDb.attendanceRecords || []).filter((r: any) => r.id !== record.id)];
  persistDatabase();

  const eventPayload = {
    type: 'PUNCH_ATTENDANCE',
    payload: {
      record,
      employee,
      branch,
    },
    senderId: senderId || 'api_client',
    senderName: record.employeeNameKh || record.employeeNameEn || 'Staff',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, record, totalRecords: serverDb.attendanceRecords.length });
});

// 6. STAFF TRANSFER
app.post('/api/employees/transfer', (req, res) => {
  const { record, senderId } = req.body;
  if (!record || !record.id) {
    return res.status(400).json({ error: 'Missing transfer record' });
  }

  serverDb.transferRecords = [record, ...(serverDb.transferRecords || []).filter((t: any) => t.id !== record.id)];

  // Update employee's branchId
  if (record.employeeId && record.toBranchId && Array.isArray(serverDb.employees)) {
    serverDb.employees = serverDb.employees.map((e: any) =>
      e.id === record.employeeId ? { ...e, branchId: record.toBranchId } : e
    );
  }

  persistDatabase();

  const eventPayload = {
    type: 'TRANSFER_EMPLOYEE',
    payload: record,
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, record });
});

// 7. LEAVE STATUS UPDATE
app.post('/api/leaves/status', (req, res) => {
  const { requestId, status, approvedBy, comment, senderId } = req.body;
  if (!requestId || !status) {
    return res.status(400).json({ error: 'Missing requestId or status' });
  }

  if (Array.isArray(serverDb.leaveRequests)) {
    serverDb.leaveRequests = serverDb.leaveRequests.map((l: any) =>
      l.id === requestId
        ? {
            ...l,
            status,
            approvedBy: approvedBy || l.approvedBy,
            managerComment: comment || l.managerComment,
          }
        : l
    );
    persistDatabase();
  }

  const eventPayload = {
    type: 'UPDATE_LEAVE_STATUS',
    payload: { requestId, status, approvedBy, comment },
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true });
});

// 8. LEAVE SUBMISSION
app.post('/api/leaves/submit', (req, res) => {
  const { request, senderId } = req.body;
  if (!request || !request.id) {
    return res.status(400).json({ error: 'Missing leave request' });
  }

  serverDb.leaveRequests = [request, ...(serverDb.leaveRequests || []).filter((l: any) => l.id !== request.id)];
  persistDatabase();

  const eventPayload1 = {
    type: 'SUBMIT_LEAVE',
    payload: request,
    senderId: senderId || 'employee_client',
    timestamp: new Date().toISOString(),
  };

  const eventPayload2 = {
    type: 'SUBMIT_LEAVE_REQUEST',
    payload: request,
    senderId: senderId || 'employee_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload1);
  broadcastToClients(eventPayload2);
  res.json({ success: true, request });
});

// 9. EMPLOYEES MUTATION (ADD/UPDATE/DELETE)
app.post('/api/employees/save', (req, res) => {
  const { employee, isNew, senderId } = req.body;
  if (!employee || !employee.id) {
    return res.status(400).json({ error: 'Missing employee data' });
  }

  if (isNew) {
    serverDb.employees = [employee, ...(serverDb.employees || []).filter((e: any) => e.id !== employee.id)];
  } else {
    serverDb.employees = (serverDb.employees || []).map((e: any) => (e.id === employee.id ? employee : e));
  }

  persistDatabase();

  const eventPayload = {
    type: isNew ? 'ADD_EMPLOYEE' : 'UPDATE_EMPLOYEE',
    payload: employee,
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, employee });
});

app.post('/api/employees/delete', (req, res) => {
  const { employeeId, senderId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ error: 'Missing employeeId' });
  }

  serverDb.employees = (serverDb.employees || []).filter((e: any) => e.id !== employeeId);
  persistDatabase();

  const eventPayload = {
    type: 'DELETE_EMPLOYEE',
    payload: { employeeId },
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true });
});

// 10. BRANCHES MUTATION (SAVE/DELETE)
app.post('/api/branches/save', (req, res) => {
  const { branch, senderId } = req.body;
  if (!branch || !branch.id) {
    return res.status(400).json({ error: 'Missing branch data' });
  }

  const existingIndex = (serverDb.branches || []).findIndex((b: any) => b.id === branch.id);
  if (existingIndex >= 0) {
    serverDb.branches[existingIndex] = branch;
  } else {
    serverDb.branches = [branch, ...(serverDb.branches || [])];
  }

  persistDatabase();

  const eventPayload = {
    type: 'UPDATE_BRANCH',
    payload: branch,
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, branch });
});

app.post('/api/branches/delete', (req, res) => {
  const { branchId, senderId } = req.body;
  if (!branchId) {
    return res.status(400).json({ error: 'Missing branchId' });
  }

  serverDb.branches = (serverDb.branches || []).filter((b: any) => b.id !== branchId);
  persistDatabase();

  const eventPayload = {
    type: 'DELETE_BRANCH',
    payload: { branchId },
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true });
});

// 11. BRANDING & SYSTEM SETTINGS MUTATION
app.post('/api/system/branding', (req, res) => {
  const { branding, senderId } = req.body;
  if (!branding) {
    return res.status(400).json({ error: 'Missing branding' });
  }

  serverDb.branding = branding;
  persistDatabase();

  const eventPayload = {
    type: 'UPDATE_BRANDING',
    payload: branding,
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, branding });
});

app.post('/api/system/settings', (req, res) => {
  const { settings, senderId } = req.body;
  if (!settings) {
    return res.status(400).json({ error: 'Missing settings' });
  }

  serverDb.systemSettings = settings;
  persistDatabase();

  const eventPayload = {
    type: 'UPDATE_SYSTEM_SETTINGS',
    payload: settings,
    senderId: senderId || 'admin_client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, settings });
});

// 12. USER PROFILE PERSISTENCE (ADMIN & EMPLOYEE)
app.post('/api/user/profile', (req, res) => {
  const { user, employee, senderId } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Missing user profile data' });
  }

  if (user.role === 'admin' || user.id === 'user_admin' || user.username === 'admin') {
    serverDb.adminProfile = {
      ...(serverDb.adminProfile || {}),
      ...user,
    };
  }

  if (employee && employee.id) {
    serverDb.employees = (serverDb.employees || []).map((e: any) =>
      e.id === employee.id ? { ...e, ...employee } : e
    );
  }

  persistDatabase();

  const eventPayload = {
    type: 'UPDATE_USER_PROFILE',
    payload: { user, employee },
    senderId: senderId || 'client',
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(eventPayload);
  res.json({ success: true, user, employee, adminProfile: serverDb.adminProfile });
});

// 13. AUDIT LOGS
app.post('/api/audit/log', (req, res) => {
  const { log } = req.body;
  if (log && log.id) {
    serverDb.auditLogs = [log, ...(serverDb.auditLogs || []).slice(0, 199)];
    persistDatabase();
  }
  res.json({ success: true });
});

// Broadcast generic event
app.post('/api/sync/broadcast', (req, res) => {
  const syncEvent = req.body;
  if (!syncEvent || !syncEvent.type) {
    return res.status(400).json({ error: 'Invalid sync event payload' });
  }

  const broadcastMsg = {
    ...syncEvent,
    serverTimestamp: new Date().toISOString(),
  };

  broadcastToClients(broadcastMsg);
  res.json({ success: true, broadcastCount: wss.clients.size });
});

// Get Live Network Presence Info
app.get('/api/presence', (req, res) => {
  const peersList: ConnectedPeerInfo[] = Array.from(connectedPeers.values());
  res.json({
    onlineCount: peersList.length,
    peers: peersList,
  });
});

// Dynamic Web App Manifest Endpoint for PWA Installation
app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  const b = serverDb.branding || INITIAL_BRANDING;
  const iconUrl = b.logoUrl || b.appIcon || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=512&auto=format&fit=crop&q=80';
  const appTitle = b.companyNameKh || 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន';
  const appTitleEn = b.companyNameEn || 'Smart Attendance';
  const shortTitle = (b.companyNameKh || b.companyNameEn || 'Attendance').slice(0, 18);

  const manifest = {
    name: `${appTitle} | ${appTitleEn}`,
    short_name: shortTitle,
    description: b.sloganKh || b.sloganEn || 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកគ្រប់សាខា និងគម្រោងទាំងអស់តាមអនឡាញដោយប្រើ QR Code និង GPS Geofencing',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: b.primaryColor || '#4f46e5',
    lang: 'km-KH',
    dir: 'ltr',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };

  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-cache');
  res.json(manifest);
});

// ==========================================
// Vite Integration (Dev) & Static Assets (Prod)
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server and WebSocket live on http://0.0.0.0:${PORT} (ws://0.0.0.0:${PORT}/ws)`);
  });
}

startServer();

