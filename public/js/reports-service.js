/**
 * reports-service.js
 * Data service for campus maintenance reports.
 */
import { CONFIG, getUser } from './common.js';

const STORAGE_KEY = 'campusone_reports';

export const STATUSES = Object.freeze({
  SUBMITTED:   'submitted',
  ASSIGNED:    'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED:    'resolved',
});

export const BUILDINGS = ['Building R', 'Building N', 'MAIN', 'Building P', 'Building S'];

function storageGet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storageSet(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (err) {
    return (err instanceof DOMException && err.name === 'QuotaExceededError') ? 'quota' : false;
  }
}

function generateId(reports) {
  const prefix = `RPT-${new Date().getFullYear()}-`;
  const nums = reports.map((r) => {
    const m = r.id && r.id.startsWith(prefix) ? parseInt(r.id.slice(prefix.length), 10) : 0;
    return isNaN(m) ? 0 : m;
  });
  return `${prefix}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
}

function seedMockData() {
  if (storageGet().length > 0) return;
  const user = getUser();
  if (!user) return;
  const now = Date.now(), d = (ms) => new Date(now - ms).toISOString();

  storageSet([
    {
      id: 'RPT-2026-0001', studentEmail: user.email, studentName: user.name,
      title: 'Broken projector in lecture hall', description: 'The projector in room 201 does not display an image. The power light is on but the screen stays blank. It has been like this for three days.',
      building: BUILDINGS[0], room: 'Room 201', images: [], status: STATUSES.RESOLVED,
      createdAt: d(7 * 864e5), updatedAt: d(864e5), assignedTo: { name: 'Technician Staff', role: 'technician' },
      timeline: [
        { status: STATUSES.SUBMITTED, timestamp: d(7 * 864e5), note: 'Report submitted' },
        { status: STATUSES.ASSIGNED, timestamp: d(5 * 864e5), note: 'Assigned to maintenance team' },
        { status: STATUSES.IN_PROGRESS, timestamp: d(3 * 864e5), note: 'Technician on site' },
        { status: STATUSES.RESOLVED, timestamp: d(864e5), note: 'Projector lamp replaced' }
      ]
    },
    {
      id: 'RPT-2026-0002', studentEmail: user.email, studentName: user.name,
      title: 'Leaking tap in ground floor bathroom', description: "The cold water tap in the ground floor men's bathroom near the main entrance has been dripping constantly for about a week.",
      building: BUILDINGS[1], room: 'Ground floor bathroom', images: [], status: STATUSES.IN_PROGRESS,
      createdAt: d(4 * 864e5), updatedAt: d(2 * 864e5), assignedTo: { name: 'Plumbing Team', role: 'technician' },
      timeline: [
        { status: STATUSES.SUBMITTED, timestamp: d(4 * 864e5), note: 'Report submitted' },
        { status: STATUSES.ASSIGNED, timestamp: d(3 * 864e5), note: 'Assigned to plumbing team' },
        { status: STATUSES.IN_PROGRESS, timestamp: d(2 * 864e5), note: 'Parts ordered, repair scheduled' }
      ]
    },
    {
      id: 'RPT-2026-0003', studentEmail: user.email, studentName: user.name,
      title: 'Broken socket near window in library', description: 'The power socket on the right side of the third row, near the window, does not work. Students cannot charge laptops in that area.',
      building: BUILDINGS[2], room: 'Third row, window side', images: [], status: STATUSES.SUBMITTED,
      createdAt: d(864e5), updatedAt: d(864e5), assignedTo: null,
      timeline: [{ status: STATUSES.SUBMITTED, timestamp: d(864e5), note: 'Report submitted' }]
    }
  ]);
}

const STATUS_MAP = {
  pending: (t) => (t.assignedTo ? STATUSES.ASSIGNED : STATUSES.SUBMITTED),
  in_progress: () => STATUSES.IN_PROGRESS,
  resolved: () => STATUSES.RESOLVED,
  on_hold: () => STATUSES.IN_PROGRESS
};

function syncReportItem(report, tasks, techs) {
  const task = tasks.find((t) => t.id === report.taskId || t.reportId === report.id || t.id === report.id);
  if (!task) return false;
  let changed = false;
  const mapped = STATUS_MAP[task.status] ? STATUS_MAP[task.status](task) : report.status;
  if (mapped && mapped !== report.status) {
    report.status = mapped;
    changed = true;
  }
  if (task.status === 'resolved' && !report.finished) {
    report.finished = true;
    changed = true;
  }
  if (task.assignedTo) {
    const tech = techs.find((t) => t.id === task.assignedTo);
    if (tech && (!report.assignedTo || report.assignedTo.id !== tech.id)) {
      report.assignedTo = { name: tech.name, role: tech.role, id: tech.id };
      changed = true;
    }
  }
  return changed;
}

function syncAllReports(reports) {
  try {
    const tasks = JSON.parse(localStorage.getItem('campusone_maint_tasks') || '[]');
    const techs = JSON.parse(localStorage.getItem('campusone_techs') || '[]');
    if (!tasks.length) return;
    let dirty = false;
    reports.forEach((r) => { if (syncReportItem(r, tasks, techs)) dirty = true; });
    if (dirty) storageSet(reports);
  } catch {}
}

export async function getMyReports() {
  if (CONFIG.DEV_MODE) seedMockData();
  const user = getUser(), all = storageGet();
  syncAllReports(all);
  const email = (user?.email || '').trim().toLowerCase();
  const list = email ? all.filter((r) => !(r.studentEmail || '').trim() || (r.studentEmail || '').trim().toLowerCase() === email) : all;
  const res = (list.length || !CONFIG.DEV_MODE) ? list : all;
  return res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getReportById(id) {
  if (CONFIG.DEV_MODE) seedMockData();
  const all = storageGet();
  syncAllReports(all);
  return all.find((r) => r.id === id || r.taskId === id) || null;
}

export async function deleteReport(id) {
  const all = storageGet();
  const next = all.filter((r) => r.id !== id && r.taskId !== id);
  storageSet(next);
  return true;
}

const CAT_RULES = [
  [/\b(leak|water|pipe|tap|faucet|sink|drain|toilet|restroom|bathroom|dispenser|flush|plumb)\b/, 'Plumbing'],
  [/\b(light|bulb|electric|power|socket|wire|fuse|breaker|switch|flicker|outlet|cable)\b/, 'Electrical'],
  [/\b(ac|air condition|hvac|heat|cooling|thermostat|fan|vent|filter|cold)\b/, 'HVAC'],
  [/\b(door|lock|handle|window|table|chair|bench|desk|wood|hinge|cabinet|carpenter)\b/, 'Carpentry'],
  [/\b(elevator|lift)\b/, 'Elevator'],
  [/\b(paint|wall|crack|ceiling|plaster|peeling)\b/, 'Painting']
];

function detectCategory(text, fallback) {
  if (fallback && fallback !== 'auto') return fallback;
  const match = CAT_RULES.find(([re]) => re.test(text));
  return match ? match[1] : 'General Maint.';
}

function detectPriority(text, fallback) {
  if (fallback && fallback !== 'auto') return fallback;
  if (/\b(emergency|urgent|danger|hazard|flood|fire|spark|smoke|burst|shock)\b/.test(text)) return 'emergency';
  if (/\b(broken|stopped|blocked|fail|critical|exam|major|completely|safety)\b/.test(text)) return 'high';
  return 'medium';
}

export async function createReport(data) {
  let user = getUser() || { email: 'student@miuegypt.edu.eg', name: 'Student', role: 'student' };
  const all = storageGet(), now = new Date().toISOString();
  const safeEmail = (user.email || 'student@miuegypt.edu.eg').trim().toLowerCase();
  const safeName = (user.name || 'Student').trim();
  const reportId = generateId(all);
  const text = `${data.title || ''} ${data.description || ''}`.toLowerCase();
  const category = detectCategory(text, data.category);
  const priority = detectPriority(text, data.priority);

  let maxNum = 0, rawTasks = [];
  try {
    rawTasks = JSON.parse(localStorage.getItem('campusone_maint_tasks') || '[]');
    rawTasks.forEach((t) => {
      const m = t.id && t.id.match(/^MNT-(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
  } catch {}
  const taskId = 'MNT-' + String(maxNum + 1).padStart(3, '0');

  const newTask = {
    id: taskId, reportId, title: data.title, description: data.description, category,
    building: data.building, room: data.room, priority, status: 'pending', reportedBy: safeName,
    reportedAt: now, assignedTo: '', photoUrl: (data.images && data.images[0]) || '', images: data.images || [],
    log: [{ actor: `${safeName} (Student)`, action: 'Report Submitted', note: `Submitted via student portal. Location: ${data.building} - ${data.room}. Awaiting a maintenance staff member to claim this task.`, ts: now }]
  };
  try {
    rawTasks.unshift(newTask);
    localStorage.setItem('campusone_maint_tasks', JSON.stringify(rawTasks));
  } catch (e) {
    console.error('Error creating maintenance task for staff', e);
  }

  const newReport = {
    id: reportId, taskId, studentEmail: safeEmail, studentName: safeName,
    title: data.title, description: data.description, category, priority,
    building: data.building, room: data.room, images: data.images || [],
    status: STATUSES.SUBMITTED, createdAt: now, updatedAt: now, assignedTo: null,
    timeline: [{ status: STATUSES.SUBMITTED, timestamp: now, note: 'Report submitted. Awaiting maintenance staff to claim this task.' }]
  };

  const result = storageSet([newReport, ...all]);
  if (result === 'quota') {
    const stripped = { ...newReport, images: [] };
    if (storageSet([stripped, ...all]) === true) return stripped;
    throw new DOMException('Storage quota exceeded. Free up space and try again.', 'QuotaExceededError');
  }
  if (!result) throw new Error('Could not save the report. Please try again.');

  return newReport;
}
