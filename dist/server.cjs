"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_ws = require("ws");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var server = import_http.default.createServer(app);
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "system_database.json");
var CONFIG_FILE = import_path.default.join(process.cwd(), "firebase-applet-config.json");
var firestoreDb = null;
if (import_fs.default.existsSync(CONFIG_FILE)) {
  try {
    const config = JSON.parse(import_fs.default.readFileSync(CONFIG_FILE, "utf-8"));
    const fApp = !(0, import_app.getApps)().length ? (0, import_app.initializeApp)(config) : (0, import_app.getApps)()[0];
    firestoreDb = (0, import_firestore.getFirestore)(fApp, config.firestoreDatabaseId || "(default)");
    console.log("[Firebase] Server initialized Firestore client successfully.");
  } catch (err) {
    console.warn("[Firebase] Server could not initialize Firestore:", err);
  }
}
function sanitizeForFirestore(obj) {
  if (obj === void 0) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => item === void 0 ? null : sanitizeForFirestore(item));
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== void 0) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}
async function syncToFirestore(patch) {
  if (!firestoreDb) return;
  try {
    const sanitizedPatch = sanitizeForFirestore({
      ...patch,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    });
    await (0, import_firestore.setDoc)(
      (0, import_firestore.doc)(firestoreDb, "attendance_system", "app_state_v1"),
      sanitizedPatch,
      { merge: true }
    );
  } catch (err) {
    console.warn("[Firebase] Error syncing to Firestore from server:", err);
  }
}
var DEFAULT_ADMIN_PROFILE = {
  id: "user_admin",
  username: "admin",
  email: "admin@pp-hospitality.com.kh",
  role: "admin",
  nameKh: "\u179F\u17B6\u1793\u17D2\u178F \u179F\u17BB\u1795\u17B6\u178F",
  nameEn: "San Sophat",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  employeeId: "emp_1790150117850",
  employeeCode: "EMP-001",
  branchId: "br_main_hq",
  roleTitle: "Super Administrator / HR Director",
  pinCode: "1234",
  password: "admin"
};
var DEFAULT_BRANDING = {
  companyNameKh: "\u1780\u17D2\u179A\u17BB\u1798\u17A0\u17CA\u17BB\u1793 \u1792\u17B8\u1794\u17CA\u17B8\u17A2\u17B6\u1799\u17A2\u17C1 \u1781\u17C1\u1798\u1794\u17BC\u178C\u17B6 \u1785\u17C6\u1780\u17B6\u178F\u17CB",
  companyNameEn: "TBIA Cambodia Co., Ltd.",
  sloganKh: "\u179F\u17C1\u179C\u17B6\u1780\u1798\u17D2\u1798\u1797\u17C1\u179F\u1787\u17D2\u1787\u17C8 \u1793\u17B7\u1784\u1780\u17B6\u179A\u1794\u178A\u17B7\u179F\u178E\u17D2\u178B\u17B6\u179A\u1780\u17B7\u1785\u17D2\u1785\u179B\u17C6\u178A\u17B6\u1794\u17CB\u1781\u17D2\u1796\u179F\u17CB",
  sloganEn: "Excellence in Hospitality & Premium Beverage Service",
  logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80",
  themeColor: "indigo",
  primaryColorHex: "#4f46e5",
  loginStyle: "option_b",
  supportEmail: "admin@pp-hospitality.com.kh",
  supportPhone: "+855 23 888 999",
  addressKh: "\u17A2\u1782\u17B6\u179A\u1796\u17B6\u178E\u17B7\u1787\u17D2\u1787\u1780\u1798\u17D2\u1798\u1780\u178E\u17D2\u178F\u17B6\u179B \u179A\u17B6\u1787\u1792\u17B6\u1793\u17B8\u1797\u17D2\u1793\u17C6\u1796\u17C1\u1789 \u1796\u17D2\u179A\u17C7\u179A\u17B6\u1787\u17B6\u178E\u17B6\u1785\u1780\u17D2\u179A\u1780\u1798\u17D2\u1796\u17BB\u1787\u17B6",
  addressEn: "Central Corporate Tower, Phnom Penh, Kingdom of Cambodia"
};
var DEFAULT_STARTER_BRANCH = {
  id: "br_main_hq",
  nameKh: "\u1780\u17B6\u179A\u17B7\u1799\u17B6\u179B\u17D0\u1799\u1780\u178E\u17D2\u178F\u17B6\u179B (Head Office)",
  nameEn: "Main Corporate HQ",
  type: "office",
  addressKh: "\u179A\u17B6\u1787\u1792\u17B6\u1793\u17B8\u1797\u17D2\u1793\u17C6\u1796\u17C1\u1789 \u1796\u17D2\u179A\u17C7\u179A\u17B6\u1787\u17B6\u178E\u17B6\u1785\u1780\u17D2\u179A\u1780\u1798\u17D2\u1796\u17BB\u1787\u17B6",
  addressEn: "Phnom Penh Commercial Center, Kingdom of Cambodia",
  lat: 11.56625,
  lng: 104.91811,
  radiusMeters: 80,
  openTime: "08:00",
  closeTime: "17:30",
  managerName: "San Sophat",
  contactPhone: "+855 23 888 999",
  themeColor: "from-indigo-600 to-blue-600",
  iconName: "Building2",
  activeStaffCount: 2
};
function readDbFileFromDisk() {
  if (import_fs.default.existsSync(DB_FILE)) {
    try {
      const raw = import_fs.default.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.branches)) {
        return parsed;
      }
    } catch (e) {
      console.warn("[DB] Could not parse DB_FILE:", e);
    }
  }
  return null;
}
function getCleanBlankState() {
  const current = readDbFileFromDisk();
  return {
    branches: current?.branches && current.branches.length > 0 ? current.branches : [DEFAULT_STARTER_BRANCH],
    branchTypes: current?.branchTypes || [],
    employees: current?.employees || [],
    attendanceRecords: [],
    leaveRequests: [],
    transferRecords: [],
    branding: current?.branding || DEFAULT_BRANDING,
    rolePermissions: current?.rolePermissions || [],
    systemSettings: current?.systemSettings || {
      strictGeofenceEnforcement: true,
      enableSelfieVerification: true,
      autoCheckoutHours: 12,
      overtimeThresholdHours: 8,
      gracePeriodMins: 15,
      broadcastActive: true,
      broadcastNoticeKh: "\u{1F4E2} \u179F\u17BC\u1798\u179A\u17C6\u179B\u17B9\u1780\u1794\u17BB\u1782\u17D2\u1782\u179B\u17B7\u1780\u1782\u17D2\u179A\u1794\u17CB\u179F\u17B6\u1781\u17B6\u17D6 \u179F\u17BC\u1798\u1785\u17BB\u17C7\u179C\u178F\u17D2\u178F\u1798\u17B6\u1793\u1791\u17B6\u1793\u17CB\u1798\u17C9\u17C4\u1784 \u1793\u17B7\u1784\u179A\u1780\u17D2\u179F\u17B6\u179C\u17B7\u1793\u17D0\u1799\u1780\u17B6\u179A\u1784\u17B6\u179A\u17B1\u17D2\u1799\u1794\u17B6\u1793\u1781\u17D2\u1787\u17B6\u1794\u17CB\u1781\u17D2\u1787\u17BD\u1793\u17D4",
      broadcastNoticeEn: "\u{1F4E2} Reminder to all branches: Please punch in on time and maintain standard workplace protocols.",
      enableAuditLogs: true,
      defaultLanguage: "km"
    },
    adminProfile: current?.adminProfile || DEFAULT_ADMIN_PROFILE,
    auditLogs: current?.auditLogs || [],
    staffAlerts: [],
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    isReset: true
  };
}
function getDemoSeedState() {
  const diskState = readDbFileFromDisk();
  if (diskState) {
    if (!Array.isArray(diskState.staffAlerts)) {
      diskState.staffAlerts = [];
    }
    return diskState;
  }
  return getCleanBlankState();
}
var serverDb = getDemoSeedState();
if (!Array.isArray(serverDb.staffAlerts)) {
  serverDb.staffAlerts = [];
}
try {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(DB_FILE)) {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(serverDb, null, 2), "utf-8");
    console.log("[DB] Initialized new system database file on disk.");
  } else {
    console.log(`[DB] Loaded system database from disk. (${serverDb.branches?.length || 0} branches, ${serverDb.employees?.length || 0} employees)`);
  }
} catch (err) {
  console.error("[DB] Error initializing system database file:", err);
}
async function reconcileWithFirestoreOnStart() {
  if (!firestoreDb) return;
  try {
    const docRef = (0, import_firestore.doc)(firestoreDb, "attendance_system", "app_state_v1");
    const snap = await (0, import_firestore.getDoc)(docRef);
    if (snap.exists()) {
      const cloudData = snap.data();
      const cloudEmps = Array.isArray(cloudData.employees) ? cloudData.employees.length : 0;
      const diskEmps = Array.isArray(serverDb.employees) ? serverDb.employees.length : 0;
      const cloudBranches = Array.isArray(cloudData.branches) ? cloudData.branches.length : 0;
      const diskBranches = Array.isArray(serverDb.branches) ? serverDb.branches.length : 0;
      if (diskEmps > 0 && cloudEmps === 0) {
        console.log(`[Firestore Sync] Restoring ${diskEmps} employees and ${diskBranches} branches from disk to Firestore...`);
        await (0, import_firestore.setDoc)(docRef, sanitizeForFirestore({
          ...serverDb,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        }), { merge: true });
        console.log("[Firestore Sync] Restored to Firestore successfully.");
      } else if (cloudEmps > 0 && diskEmps === 0) {
        console.log(`[Firestore Sync] Loading ${cloudEmps} employees from Firestore to disk...`);
        serverDb = { ...serverDb, ...cloudData };
        persistDatabase();
      } else if (cloudEmps > 0 && diskEmps > 0) {
        const empMap = /* @__PURE__ */ new Map();
        (serverDb.employees || []).forEach((e) => empMap.set(e.id || e.code, e));
        (cloudData.employees || []).forEach((e) => empMap.set(e.id || e.code, { ...empMap.get(e.id || e.code), ...e }));
        serverDb.employees = Array.from(empMap.values());
        const punchMap = /* @__PURE__ */ new Map();
        (serverDb.attendanceRecords || []).forEach((r) => punchMap.set(r.id, r));
        (cloudData.attendanceRecords || []).forEach((r) => punchMap.set(r.id, r));
        serverDb.attendanceRecords = Array.from(punchMap.values());
        persistDatabase();
        await (0, import_firestore.setDoc)(docRef, sanitizeForFirestore({
          ...serverDb,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        }), { merge: true });
      }
    } else {
      console.log("[Firestore Sync] Initializing Firestore doc from system database...");
      await (0, import_firestore.setDoc)(docRef, sanitizeForFirestore({
        ...serverDb,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }), { merge: true });
    }
  } catch (err) {
    console.warn("[Firestore Sync] Startup sync notice:", err);
  }
}
reconcileWithFirestoreOnStart();
function persistDatabase() {
  try {
    serverDb.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(serverDb, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Error persisting database to disk:", err);
  }
}
var connectedPeers = /* @__PURE__ */ new Map();
process.on("uncaughtException", (err) => {
  console.error("[Process] Uncaught exception prevented server crash:", err);
});
process.on("unhandledRejection", (reason) => {
  console.warn("[Process] Unhandled rejection prevented server crash:", reason);
});
var wss = new import_ws.WebSocketServer({ server, path: "/ws" });
wss.on("error", (err) => {
  console.warn("[WebSocket] Warning on WebSocketServer:", err?.message || err);
});
function broadcastPresence() {
  const peersList = Array.from(connectedPeers.values());
  const message = JSON.stringify({
    type: "PRESENCE_STATE",
    payload: {
      onlineCount: peersList.length,
      peers: peersList
    },
    senderId: "server",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  wss.clients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) {
      client.send(message);
    }
  });
}
function broadcastToClients(data, excludeClient) {
  const message = typeof data === "string" ? data : JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === import_ws.WebSocket.OPEN) {
      client.send(message);
    }
  });
}
wss.on("connection", (ws, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const peerInfo = {
    id: clientId,
    name: "Anonymous Device",
    role: "guest",
    connectedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastPing: Date.now()
  };
  connectedPeers.set(ws, peerInfo);
  broadcastPresence();
  ws.send(
    JSON.stringify({
      type: "INIT_ACK",
      payload: {
        clientId,
        serverTime: (/* @__PURE__ */ new Date()).toISOString(),
        onlineNodes: connectedPeers.size
      },
      senderId: "server",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    })
  );
  ws.on("message", (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage.toString());
      const { type, payload, senderId, senderName, senderRole, senderBranchId } = parsed;
      if (type === "PRESENCE_PING") {
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
      if (type === "REQUEST_CANONICAL_STATE") {
        ws.send(
          JSON.stringify({
            type: "CANONICAL_STATE_RESPONSE",
            payload: { state: serverDb },
            senderId: "server",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
        return;
      }
      if ((type === "SUBMIT_LEAVE" || type === "SUBMIT_LEAVE_REQUEST") && payload && payload.id) {
        serverDb.leaveRequests = [payload, ...(serverDb.leaveRequests || []).filter((l) => l.id !== payload.id)];
        persistDatabase();
        syncToFirestore({ leaveRequests: serverDb.leaveRequests });
        broadcastToClients({
          type: "SUBMIT_LEAVE",
          payload,
          senderId: senderId || "client",
          senderName,
          serverTimestamp: (/* @__PURE__ */ new Date()).toISOString()
        }, ws);
        broadcastToClients({
          type: "SUBMIT_LEAVE_REQUEST",
          payload,
          senderId: senderId || "client",
          senderName,
          serverTimestamp: (/* @__PURE__ */ new Date()).toISOString()
        }, ws);
        return;
      }
      if (type === "UPDATE_LEAVE_STATUS" && payload && payload.requestId) {
        const { requestId, status, approvedBy, comment } = payload;
        if (Array.isArray(serverDb.leaveRequests)) {
          serverDb.leaveRequests = serverDb.leaveRequests.map(
            (l) => l.id === requestId ? {
              ...l,
              status,
              approvedBy: approvedBy || l.approvedBy,
              adminComment: comment || l.adminComment
            } : l
          );
          persistDatabase();
          syncToFirestore({ leaveRequests: serverDb.leaveRequests });
        }
      }
      if (type === "PUNCH_ATTENDANCE" && payload) {
        const record = payload.record || payload;
        if (record && record.id) {
          serverDb.attendanceRecords = [record, ...(serverDb.attendanceRecords || []).filter((r) => r.id !== record.id).slice(0, 499)];
          const empName = record.employeeNameKh || record.employeeNameEn || "Staff";
          const actionType = record.type === "check_in" ? "Check-In" : "Check-Out";
          const punchAlert = {
            id: `alert_att_${record.id}`,
            type: "punch",
            titleKh: record.isWithinGeofence ? "\u179C\u178F\u17D2\u178F\u1798\u17B6\u1793\u179F\u17D2\u1780\u17C1\u1793 GPS \u1790\u17D2\u1798\u17B8" : "\u26A0\uFE0F \u179C\u178F\u17D2\u178F\u1798\u17B6\u1793\u179F\u17D2\u1780\u17C1\u1793\u1781\u17BB\u179F\u1791\u17B8\u178F\u17B6\u17C6\u1784 Geofence",
            titleEn: record.isWithinGeofence ? "Real-time GPS Scan Punch" : "\u26A0\uFE0F Geofence Distance Warning",
            detailKh: `${empName} ${record.type === "check_in" ? "\u1794\u17B6\u1793\u1785\u17BC\u179B\u1792\u17D2\u179C\u17BE\u1780\u17B6\u179A (Check-In)" : "\u1794\u17B6\u1793\u1785\u17C1\u1789\u1796\u17B8\u1780\u17B6\u179A\u1784\u17B6\u179A (Check-Out)"} - ${record.branchNameKh || record.branchNameEn || ""} (${record.isWithinGeofence ? "\u1780\u17D2\u1793\u17BB\u1784\u179A\u1784\u17D2\u179C\u1784\u17CB GPS" : `\u1785\u1798\u17D2\u1784\u17B6\u1799 ${Math.round(record.distanceToBranch || 0)}m`})`,
            detailEn: `${empName} ${actionType} - ${record.branchNameEn || ""} (${record.isWithinGeofence ? "Within GPS Geofence" : `${Math.round(record.distanceToBranch || 0)}m Out of Range`})`,
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            rawTimestamp: record.timestamp ? new Date(record.timestamp).getTime() : Date.now(),
            actorName: empName,
            actorAvatar: record.employeeAvatar,
            branchId: record.branchId,
            branchName: record.branchNameKh || record.branchNameEn,
            isUnread: true
          };
          if (!Array.isArray(serverDb.staffAlerts)) serverDb.staffAlerts = [];
          serverDb.staffAlerts = [punchAlert, ...serverDb.staffAlerts.filter((a) => a.id !== punchAlert.id).slice(0, 99)];
          persistDatabase();
          syncToFirestore({ attendanceRecords: serverDb.attendanceRecords, staffAlerts: serverDb.staffAlerts });
        }
      }
      if (type === "STAFF_LOGIN" && payload) {
        const { user, employee, branch, alert, auditLog } = payload;
        const empName = user?.nameKh || employee?.nameKh || user?.nameEn || user?.username || "Staff";
        const empCode = user?.employeeCode || employee?.code || user?.username || "";
        const branchName = branch ? branch.nameKh || branch.nameEn : "";
        const loginAlert = alert || {
          id: `alert_login_${user?.id || Date.now()}_${Date.now()}`,
          type: "login",
          titleKh: "\u1794\u17BB\u1782\u17D2\u1782\u179B\u17B7\u1780\u1794\u17B6\u1793\u1785\u17BC\u179B\u1794\u17D2\u179A\u17BE\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792",
          titleEn: "Staff Logged In",
          detailKh: `${empName} (${empCode}) \u1794\u17B6\u1793\u1785\u17BC\u179B\u1794\u17D2\u179A\u17BE\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792\u1787\u17C4\u1782\u1787\u17D0\u1799${branchName ? ` - ${branchName}` : ""}`,
          detailEn: `${empName} (${empCode}) logged in successfully${branchName ? ` - ${branchName}` : ""}`,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          rawTimestamp: Date.now(),
          actorName: empName,
          actorAvatar: user?.avatar || employee?.avatar,
          branchId: branch?.id,
          branchName,
          isUnread: true
        };
        if (!Array.isArray(serverDb.staffAlerts)) serverDb.staffAlerts = [];
        serverDb.staffAlerts = [loginAlert, ...serverDb.staffAlerts.filter((a) => a.id !== loginAlert.id).slice(0, 99)];
        if (auditLog && auditLog.id) {
          serverDb.auditLogs = [auditLog, ...(serverDb.auditLogs || []).slice(0, 199)];
        }
        persistDatabase();
      }
      const broadcastMsg = {
        ...parsed,
        serverTimestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      broadcastToClients(broadcastMsg, ws);
    } catch (err) {
      console.error("Error handling WebSocket message:", err);
    }
  });
  ws.on("close", () => {
    connectedPeers.delete(ws);
    broadcastPresence();
  });
  ws.on("error", (err) => {
    console.error("WebSocket connection error:", err);
    connectedPeers.delete(ws);
    broadcastPresence();
  });
});
setInterval(() => {
  const now = Date.now();
  connectedPeers.forEach((info, ws) => {
    if (now - info.lastPing > 9e4) {
      try {
        ws.terminate();
      } catch (_) {
      }
      connectedPeers.delete(ws);
    }
  });
}, 3e4);
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    connectedClients: connectedPeers.size,
    branchesCount: serverDb.branches?.length || 0,
    employeesCount: serverDb.employees?.length || 0
  });
});
app.get("/api/system/state", (req, res) => {
  res.json({
    success: true,
    state: serverDb,
    onlineClients: connectedPeers.size,
    lastUpdated: serverDb.lastUpdated
  });
});
app.post("/api/system/state", (req, res) => {
  const { state, senderId, senderName } = req.body;
  if (!state) {
    return res.status(400).json({ error: "Missing state payload" });
  }
  const isReset = Boolean(state.isReset);
  const safeEmployees = !isReset && Array.isArray(state.employees) && state.employees.length === 0 && (serverDb.employees?.length || 0) > 0 ? serverDb.employees : state.employees !== void 0 ? state.employees : serverDb.employees;
  const safeBranches = !isReset && Array.isArray(state.branches) && state.branches.length === 0 && (serverDb.branches?.length || 0) > 0 ? serverDb.branches : state.branches !== void 0 ? state.branches : serverDb.branches;
  const safeRecords = !isReset && Array.isArray(state.attendanceRecords) && state.attendanceRecords.length === 0 && (serverDb.attendanceRecords?.length || 0) > 0 ? serverDb.attendanceRecords : state.attendanceRecords !== void 0 ? state.attendanceRecords : serverDb.attendanceRecords;
  serverDb = {
    ...serverDb,
    ...state,
    employees: safeEmployees,
    branches: safeBranches,
    attendanceRecords: safeRecords,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  persistDatabase();
  syncToFirestore(serverDb);
  const eventPayload = {
    type: "SYSTEM_STATE_SYNC",
    payload: { state: serverDb },
    senderId: senderId || "api_client",
    senderName: senderName || "Admin",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, state: serverDb });
});
app.post("/api/system/reset", (req, res) => {
  const { resetType, resetBy, senderId } = req.body;
  const isDemo = resetType === "demo_seed";
  serverDb = getCleanBlankState();
  persistDatabase();
  const eventPayload = {
    type: "SYSTEM_RESET",
    payload: {
      resetType: isDemo ? "demo_seed" : "clean_fresh",
      state: serverDb,
      resetBy: resetBy || "Admin"
    },
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  console.log(`[DB] System reset executed: Clean Real State (Records wiped)`);
  res.json({ success: true, state: serverDb, resetType });
});
app.post("/api/system/restore", (req, res) => {
  const { backupData, restoreMode, restoredBy, senderId } = req.body;
  if (!backupData || !backupData.branches) {
    return res.status(400).json({ error: "Invalid backup package provided" });
  }
  if (restoreMode === "overwrite") {
    serverDb = {
      branches: backupData.branches || [],
      employees: backupData.employees || [],
      attendanceRecords: backupData.attendanceRecords || [],
      leaveRequests: backupData.leaveRequests || [],
      transferRecords: backupData.transferRecords || [],
      branding: backupData.branding || serverDb?.branding || DEFAULT_BRANDING,
      rolePermissions: backupData.rolePermissions || serverDb?.rolePermissions || [],
      systemSettings: backupData.systemSettings || serverDb?.systemSettings || {},
      adminProfile: backupData.adminProfile || backupData.profile || serverDb.adminProfile || DEFAULT_ADMIN_PROFILE,
      auditLogs: backupData.auditLogs || [],
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      isReset: false
    };
  } else {
    const mergeArrays = (original = [], incoming = []) => {
      const map = /* @__PURE__ */ new Map();
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
      adminProfile: backupData.adminProfile || backupData.profile ? { ...serverDb.adminProfile || {}, ...backupData.adminProfile || backupData.profile } : serverDb.adminProfile,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  persistDatabase();
  const eventPayload = {
    type: "SYSTEM_RESTORE",
    payload: {
      backupData,
      restoreMode: restoreMode || "overwrite",
      restoredBy: restoredBy || "Admin",
      state: serverDb
    },
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  console.log(`[DB] Backup restore executed via ${restoreMode.toUpperCase()} mode.`);
  res.json({ success: true, state: serverDb });
});
app.post("/api/attendance/punch", (req, res) => {
  const { record, employee, branch, senderId } = req.body;
  if (!record || !record.id) {
    return res.status(400).json({ error: "Missing attendance record" });
  }
  serverDb.attendanceRecords = [record, ...(serverDb.attendanceRecords || []).filter((r) => r.id !== record.id)];
  const empName = record.employeeNameKh || record.employeeNameEn || employee?.nameKh || employee?.nameEn || "Staff";
  const actionType = record.type === "check_in" ? "Check-In" : "Check-Out";
  const actionTypeKh = record.type === "check_in" ? "\u1794\u17B6\u1793\u1785\u17BC\u179B\u1792\u17D2\u179C\u17BE\u1780\u17B6\u179A (Check-In)" : "\u1794\u17B6\u1793\u1785\u17C1\u1789\u1796\u17B8\u1780\u17B6\u179A\u1784\u17B6\u179A (Check-Out)";
  const branchName = record.branchNameKh || record.branchNameEn || branch?.nameKh || branch?.nameEn || "";
  const punchAlert = {
    id: `alert_att_${record.id}`,
    type: "punch",
    titleKh: record.isWithinGeofence ? "\u179C\u178F\u17D2\u178F\u1798\u17B6\u1793\u179F\u17D2\u1780\u17C1\u1793 GPS \u1790\u17D2\u1798\u17B8" : "\u26A0\uFE0F \u179C\u178F\u17D2\u178F\u1798\u17B6\u1793\u179F\u17D2\u1780\u17C1\u1793\u1781\u17BB\u179F\u1791\u17B8\u178F\u17B6\u17C6\u1784 Geofence",
    titleEn: record.isWithinGeofence ? "Real-time GPS Scan Punch" : "\u26A0\uFE0F Geofence Distance Warning",
    detailKh: `${empName} ${actionTypeKh} - ${branchName} (${record.isWithinGeofence ? "\u1780\u17D2\u1793\u17BB\u1784\u179A\u1784\u17D2\u179C\u1784\u17CB GPS" : `\u1785\u1798\u17D2\u1784\u17B6\u1799 ${Math.round(record.distanceToBranch || 0)}m`})`,
    detailEn: `${empName} ${actionType} - ${record.branchNameEn || branch?.nameEn || ""} (${record.isWithinGeofence ? "Within GPS Geofence" : `${Math.round(record.distanceToBranch || 0)}m Out of Range`})`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    rawTimestamp: record.timestamp ? new Date(record.timestamp).getTime() : Date.now(),
    actorName: empName,
    actorAvatar: record.employeeAvatar || employee?.avatar,
    branchId: record.branchId,
    branchName,
    isUnread: true
  };
  if (!Array.isArray(serverDb.staffAlerts)) serverDb.staffAlerts = [];
  serverDb.staffAlerts = [punchAlert, ...serverDb.staffAlerts.filter((a) => a.id !== punchAlert.id).slice(0, 99)];
  persistDatabase();
  syncToFirestore({ attendanceRecords: serverDb.attendanceRecords, staffAlerts: serverDb.staffAlerts });
  const eventPayload = {
    type: "PUNCH_ATTENDANCE",
    payload: {
      record,
      employee,
      branch,
      alert: punchAlert
    },
    senderId: senderId || "api_client",
    senderName: record.employeeNameKh || record.employeeNameEn || "Staff",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, record, alert: punchAlert, totalRecords: serverDb.attendanceRecords.length });
});
app.post("/api/staff/login", (req, res) => {
  const { user, employee, branch, alert, auditLog, senderId } = req.body;
  if (!user) {
    return res.status(400).json({ error: "Missing user payload" });
  }
  const empName = user.nameKh || employee?.nameKh || user.nameEn || user.username || "Staff";
  const empCode = user.employeeCode || employee?.code || user.username || "";
  const branchName = branch ? branch.nameKh || branch.nameEn : "";
  const loginAlert = alert || {
    id: `alert_login_${user.id || Date.now()}_${Date.now()}`,
    type: "login",
    titleKh: "\u1794\u17BB\u1782\u17D2\u1782\u179B\u17B7\u1780\u1794\u17B6\u1793\u1785\u17BC\u179B\u1794\u17D2\u179A\u17BE\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792",
    titleEn: "Staff Logged In",
    detailKh: `${empName} (${empCode}) \u1794\u17B6\u1793\u1785\u17BC\u179B\u1794\u17D2\u179A\u17BE\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792\u1787\u17C4\u1782\u1787\u17D0\u1799${branchName ? ` - ${branchName}` : ""}`,
    detailEn: `${empName} (${empCode}) logged in successfully${branchName ? ` - ${branchName}` : ""}`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    rawTimestamp: Date.now(),
    actorName: empName,
    actorAvatar: user.avatar || employee?.avatar,
    branchId: branch?.id,
    branchName,
    isUnread: true
  };
  if (!Array.isArray(serverDb.staffAlerts)) serverDb.staffAlerts = [];
  serverDb.staffAlerts = [loginAlert, ...serverDb.staffAlerts.filter((a) => a.id !== loginAlert.id).slice(0, 99)];
  if (auditLog && auditLog.id) {
    serverDb.auditLogs = [auditLog, ...(serverDb.auditLogs || []).slice(0, 199)];
  }
  persistDatabase();
  syncToFirestore({ staffAlerts: serverDb.staffAlerts, auditLogs: serverDb.auditLogs });
  const eventPayload = {
    type: "STAFF_LOGIN",
    payload: { user, employee, branch, alert: loginAlert },
    senderId: senderId || "api_client",
    senderName: empName,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, alert: loginAlert });
});
app.get("/api/staff/alerts", (req, res) => {
  res.json({
    success: true,
    alerts: Array.isArray(serverDb.staffAlerts) ? serverDb.staffAlerts : []
  });
});
app.delete("/api/staff/alerts", (req, res) => {
  serverDb.staffAlerts = [];
  persistDatabase();
  syncToFirestore({ staffAlerts: [] });
  broadcastToClients({
    type: "ACTION_ALERT",
    payload: { action: "CLEAR_ALL" },
    senderId: req.body?.senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  res.json({ success: true });
});
app.post("/api/employees/transfer", (req, res) => {
  const { record, senderId } = req.body;
  if (!record || !record.id) {
    return res.status(400).json({ error: "Missing transfer record" });
  }
  serverDb.transferRecords = [record, ...(serverDb.transferRecords || []).filter((t) => t.id !== record.id)];
  if (record.employeeId && record.toBranchId && Array.isArray(serverDb.employees)) {
    serverDb.employees = serverDb.employees.map(
      (e) => e.id === record.employeeId ? { ...e, branchId: record.toBranchId } : e
    );
  }
  persistDatabase();
  syncToFirestore({ employees: serverDb.employees, transferRecords: serverDb.transferRecords });
  const eventPayload = {
    type: "TRANSFER_EMPLOYEE",
    payload: record,
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, record });
});
app.post("/api/leaves/status", (req, res) => {
  const { requestId, status, approvedBy, comment, senderId } = req.body;
  if (!requestId || !status) {
    return res.status(400).json({ error: "Missing requestId or status" });
  }
  if (Array.isArray(serverDb.leaveRequests)) {
    serverDb.leaveRequests = serverDb.leaveRequests.map(
      (l) => l.id === requestId ? {
        ...l,
        status,
        approvedBy: approvedBy || l.approvedBy,
        managerComment: comment || l.managerComment
      } : l
    );
    persistDatabase();
    syncToFirestore({ leaveRequests: serverDb.leaveRequests });
  }
  const eventPayload = {
    type: "UPDATE_LEAVE_STATUS",
    payload: { requestId, status, approvedBy, comment },
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true });
});
app.post("/api/leaves/submit", (req, res) => {
  const { request, senderId } = req.body;
  if (!request || !request.id) {
    return res.status(400).json({ error: "Missing leave request" });
  }
  const cleanRequest = sanitizeForFirestore(request);
  serverDb.leaveRequests = [cleanRequest, ...(serverDb.leaveRequests || []).filter((l) => l.id !== cleanRequest.id)];
  persistDatabase();
  syncToFirestore({ leaveRequests: serverDb.leaveRequests });
  const eventPayload1 = {
    type: "SUBMIT_LEAVE",
    payload: cleanRequest,
    senderId: senderId || "employee_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const eventPayload2 = {
    type: "SUBMIT_LEAVE_REQUEST",
    payload: cleanRequest,
    senderId: senderId || "employee_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload1);
  broadcastToClients(eventPayload2);
  res.json({ success: true, request });
});
app.post("/api/employees/save", (req, res) => {
  const { employee, isNew, senderId } = req.body;
  if (!employee || !employee.id) {
    return res.status(400).json({ error: "Missing employee data" });
  }
  if (isNew) {
    serverDb.employees = [employee, ...(serverDb.employees || []).filter((e) => e.id !== employee.id)];
  } else {
    serverDb.employees = (serverDb.employees || []).map((e) => e.id === employee.id ? employee : e);
  }
  persistDatabase();
  syncToFirestore({ employees: serverDb.employees });
  const eventPayload = {
    type: isNew ? "ADD_EMPLOYEE" : "UPDATE_EMPLOYEE",
    payload: employee,
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, employee });
});
app.post("/api/employees/delete", (req, res) => {
  const { employeeId, senderId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ error: "Missing employeeId" });
  }
  if (!Array.isArray(serverDb.deletedEmployeeIds)) serverDb.deletedEmployeeIds = [];
  if (!serverDb.deletedEmployeeIds.includes(employeeId)) {
    serverDb.deletedEmployeeIds.push(employeeId);
  }
  serverDb.employees = (serverDb.employees || []).filter((e) => e.id !== employeeId);
  persistDatabase();
  syncToFirestore({ employees: serverDb.employees, deletedEmployeeIds: serverDb.deletedEmployeeIds });
  const eventPayload = {
    type: "DELETE_EMPLOYEE",
    payload: { employeeId },
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true });
});
app.post("/api/branches/save", (req, res) => {
  const { branch, senderId } = req.body;
  if (!branch || !branch.id) {
    return res.status(400).json({ error: "Missing branch data" });
  }
  const existingIndex = (serverDb.branches || []).findIndex((b) => b.id === branch.id);
  if (existingIndex >= 0) {
    serverDb.branches[existingIndex] = branch;
  } else {
    serverDb.branches = [branch, ...serverDb.branches || []];
  }
  persistDatabase();
  syncToFirestore({ branches: serverDb.branches });
  const eventPayload = {
    type: "UPDATE_BRANCH",
    payload: branch,
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, branch });
});
app.post("/api/branches/delete", (req, res) => {
  const { branchId, senderId } = req.body;
  if (!branchId) {
    return res.status(400).json({ error: "Missing branchId" });
  }
  if (!Array.isArray(serverDb.deletedBranchIds)) serverDb.deletedBranchIds = [];
  if (!serverDb.deletedBranchIds.includes(branchId)) {
    serverDb.deletedBranchIds.push(branchId);
  }
  serverDb.branches = (serverDb.branches || []).filter((b) => b.id !== branchId);
  persistDatabase();
  syncToFirestore({ branches: serverDb.branches, deletedBranchIds: serverDb.deletedBranchIds });
  const eventPayload = {
    type: "DELETE_BRANCH",
    payload: { id: branchId, branchId },
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true });
});
app.post("/api/leaves/delete", (req, res) => {
  const { requestId, senderId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: "Missing requestId" });
  }
  if (!Array.isArray(serverDb.deletedLeaveIds)) serverDb.deletedLeaveIds = [];
  if (!serverDb.deletedLeaveIds.includes(requestId)) {
    serverDb.deletedLeaveIds.push(requestId);
  }
  serverDb.leaveRequests = (serverDb.leaveRequests || []).filter((l) => l.id !== requestId);
  persistDatabase();
  syncToFirestore({ leaveRequests: serverDb.leaveRequests, deletedLeaveIds: serverDb.deletedLeaveIds });
  const eventPayload = {
    type: "DELETE_LEAVE",
    payload: { id: requestId, requestId },
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true });
});
app.post("/api/leaves/clear", (req, res) => {
  const { scope, senderId } = req.body;
  const currentLeaves = serverDb.leaveRequests || [];
  const leavesToDelete = scope === "all" ? currentLeaves : currentLeaves.filter((l) => l.status === "approved" || l.status === "rejected");
  const idsToDelete = leavesToDelete.map((l) => l.id);
  if (!Array.isArray(serverDb.deletedLeaveIds)) serverDb.deletedLeaveIds = [];
  serverDb.deletedLeaveIds = Array.from(/* @__PURE__ */ new Set([...serverDb.deletedLeaveIds, ...idsToDelete]));
  serverDb.leaveRequests = currentLeaves.filter((l) => !idsToDelete.includes(l.id));
  persistDatabase();
  syncToFirestore({ leaveRequests: serverDb.leaveRequests, deletedLeaveIds: serverDb.deletedLeaveIds });
  const eventPayload = {
    type: "CLEAR_LEAVES",
    payload: { scope, deletedIds: idsToDelete },
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, deletedCount: idsToDelete.length });
});
app.post("/api/system/branding", (req, res) => {
  const { branding, senderId } = req.body;
  if (!branding) {
    return res.status(400).json({ error: "Missing branding" });
  }
  serverDb.branding = branding;
  persistDatabase();
  syncToFirestore({ branding: serverDb.branding });
  const eventPayload = {
    type: "UPDATE_BRANDING",
    payload: branding,
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, branding });
});
app.post("/api/system/settings", (req, res) => {
  const { settings, senderId } = req.body;
  if (!settings) {
    return res.status(400).json({ error: "Missing settings" });
  }
  serverDb.systemSettings = settings;
  persistDatabase();
  syncToFirestore({ systemSettings: serverDb.systemSettings });
  const eventPayload = {
    type: "UPDATE_SYSTEM_SETTINGS",
    payload: settings,
    senderId: senderId || "admin_client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, settings });
});
app.post("/api/user/profile", (req, res) => {
  const { user, employee, senderId } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: "Missing user profile data" });
  }
  if (user.role === "admin" || user.id === "user_admin" || user.username === "admin") {
    serverDb.adminProfile = {
      ...serverDb.adminProfile || {},
      ...user
    };
  }
  if (employee && employee.id) {
    serverDb.employees = (serverDb.employees || []).map(
      (e) => e.id === employee.id ? { ...e, ...employee } : e
    );
  } else if (user.avatar && Array.isArray(serverDb.employees)) {
    serverDb.employees = serverDb.employees.map(
      (e) => e.id === user.employeeId || e.code === user.employeeCode || e.id === user.id || `user_${e.id}` === user.id ? { ...e, avatar: user.avatar } : e
    );
  }
  persistDatabase();
  syncToFirestore({ employees: serverDb.employees, adminProfile: serverDb.adminProfile });
  const eventPayload = {
    type: "UPDATE_USER_PROFILE",
    payload: { user, employee },
    senderId: senderId || "client",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(eventPayload);
  res.json({ success: true, user, employee, adminProfile: serverDb.adminProfile });
});
app.post("/api/audit/log", (req, res) => {
  const { log } = req.body;
  if (log && log.id) {
    serverDb.auditLogs = [log, ...(serverDb.auditLogs || []).slice(0, 199)];
    persistDatabase();
  }
  res.json({ success: true });
});
app.post("/api/sync/broadcast", (req, res) => {
  const syncEvent = req.body;
  if (!syncEvent || !syncEvent.type) {
    return res.status(400).json({ error: "Invalid sync event payload" });
  }
  if (syncEvent.type === "PUNCH_ATTENDANCE" && syncEvent.payload) {
    const record = syncEvent.payload.record || syncEvent.payload;
    if (record && record.id) {
      serverDb.attendanceRecords = [record, ...(serverDb.attendanceRecords || []).filter((r) => r.id !== record.id).slice(0, 499)];
      persistDatabase();
      syncToFirestore({ attendanceRecords: serverDb.attendanceRecords });
    }
  } else if ((syncEvent.type === "SUBMIT_LEAVE" || syncEvent.type === "SUBMIT_LEAVE_REQUEST") && syncEvent.payload && syncEvent.payload.id) {
    serverDb.leaveRequests = [syncEvent.payload, ...(serverDb.leaveRequests || []).filter((l) => l.id !== syncEvent.payload.id)];
    persistDatabase();
    syncToFirestore({ leaveRequests: serverDb.leaveRequests });
  }
  const broadcastMsg = {
    ...syncEvent,
    serverTimestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  broadcastToClients(broadcastMsg);
  res.json({ success: true, broadcastCount: wss.clients.size });
});
app.get("/api/presence", (req, res) => {
  const peersList = Array.from(connectedPeers.values());
  res.json({
    onlineCount: peersList.length,
    peers: peersList
  });
});
app.get(["/manifest.webmanifest", "/manifest.json"], (req, res) => {
  const b = serverDb?.branding || DEFAULT_BRANDING;
  const iconUrl = b.logoUrl || b.appIcon || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=512&auto=format&fit=crop&q=80";
  const appTitle = b.companyNameKh || "\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u179C\u178F\u17D2\u178F\u1798\u17B6\u1793";
  const appTitleEn = b.companyNameEn || "Smart Attendance";
  const shortTitle = (b.companyNameKh || b.companyNameEn || "Attendance").slice(0, 18);
  const manifest = {
    name: `${appTitle} | ${appTitleEn}`,
    short_name: shortTitle,
    description: b.sloganKh || b.sloganEn || "\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u179C\u178F\u17D2\u178F\u1798\u17B6\u1793\u1794\u17BB\u1782\u17D2\u1782\u179B\u17B7\u1780\u1782\u17D2\u179A\u1794\u17CB\u179F\u17B6\u1781\u17B6 \u1793\u17B7\u1784\u1782\u1798\u17D2\u179A\u17C4\u1784\u1791\u17B6\u17C6\u1784\u17A2\u179F\u17CB\u178F\u17B6\u1798\u17A2\u1793\u17A1\u17B6\u1789\u178A\u17C4\u1799\u1794\u17D2\u179A\u17BE QR Code \u1793\u17B7\u1784 GPS Geofencing",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: b.primaryColor || "#4f46e5",
    lang: "km-KH",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: iconUrl,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: iconUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: iconUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "no-cache");
  res.json(manifest);
});
app.get(["/healthz", "/_health", "/api/health"], (req, res) => {
  res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
async function startServer() {
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION || process.env.PORT && process.env.PORT !== "3000");
  const distPath = import_path.default.join(process.cwd(), "dist");
  const distIndexExists = import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || isCloudRun || distIndexExists;
  if (isProduction || distIndexExists) {
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = import_path.default.join(distPath, "index.html");
      if (import_fs.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send(`<!DOCTYPE html><html><head><title>Smart Attendance</title><meta http-equiv="refresh" content="2"></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h3>Starting application...</h3></body></html>`);
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false
          // HMR disabled per environment guidelines
        },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite dev middleware not available, falling back to static:", err);
      app.use(import_express.default.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = import_path.default.join(distPath, "index.html");
        if (import_fs.default.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(200).send("Application loading, please refresh...");
        }
      });
    }
  }
  server.on("error", (err) => {
    console.error("[Server] HTTP server error:", err);
  });
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server and WebSocket live on http://0.0.0.0:${PORT} (ws://0.0.0.0:${PORT}/ws)`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
