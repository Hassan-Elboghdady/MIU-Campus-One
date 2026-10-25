/* ==========================================================================
   maintenance-data.js – Shared mock data & helpers for all maintenance pages.

   MOCK DATA ONLY – replace with real backend calls before production.
   Data is seeded into localStorage on first load so all pages share state.
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   Keys
   -------------------------------------------------------------------------- */
var MAINT_TASKS_KEY    = 'campusone_maint_tasks';
var MAINT_TECHS_KEY    = 'campusone_maint_techs';
var MAINT_LOG_KEY      = 'campusone_maint_log';

/* --------------------------------------------------------------------------
   Seed technicians
   -------------------------------------------------------------------------- */
var SEED_TECHNICIANS = [
  { id: 'tech-1', name: 'Ahmed Hassan',    role: 'Plumber',          availability: 'available', activeTasks: 2, phone: '+20 10-1234-5678', email: 'a.hassan@miu.edu.eg',  joined: '2023-03-15' },
  { id: 'tech-2', name: 'Mohamed Salah',   role: 'Electrician',      availability: 'on_duty',   activeTasks: 4, phone: '+20 10-2345-6789', email: 'm.salah@miu.edu.eg',   joined: '2022-08-01' },
  { id: 'tech-3', name: 'Khaled Ibrahim',  role: 'HVAC Technician',  availability: 'busy',      activeTasks: 5, phone: '+20 10-3456-7890', email: 'k.ibrahim@miu.edu.eg', joined: '2021-01-20' },
  { id: 'tech-4', name: 'Sara Adel',       role: 'General Maint.',   availability: 'available', activeTasks: 1, phone: '+20 10-4567-8901', email: 's.adel@miu.edu.eg',    joined: '2023-11-05' },
  { id: 'tech-5', name: 'Omar Farouk',     role: 'Carpenter',        availability: 'off_shift', activeTasks: 0, phone: '+20 10-5678-9012', email: 'o.farouk@miu.edu.eg',  joined: '2024-02-10' },
  { id: 'tech-6', name: 'Nour El-Sheikh',  role: 'Electrician',      availability: 'on_duty',   activeTasks: 3, phone: '+20 10-6789-0123', email: 'n.elsheikh@miu.edu.eg',joined: '2022-06-14' },
  { id: 'tech-7', name: 'Rania Mostafa',   role: 'Painter',          availability: 'available', activeTasks: 0, phone: '+20 10-7890-1234', email: 'r.mostafa@miu.edu.eg', joined: '2024-09-01' },
  { id: 'tech-8', name: 'Tarek Samir',     role: 'Plumber',          availability: 'busy',      activeTasks: 5, phone: '+20 10-8901-2345', email: 't.samir@miu.edu.eg',   joined: '2020-05-22' }
];

/* --------------------------------------------------------------------------
   Seed tasks
   -------------------------------------------------------------------------- */
var SEED_TASKS = [
  {
    id: 'MNT-001', title: 'Broken AC Unit in Lab A204',
    description: 'The air conditioning unit in Computer Lab A204 has stopped working entirely. Students cannot use the lab in the current heat. Please fix as soon as possible.',
    category: 'HVAC', building: 'Building A', room: 'Lab A204',
    priority: 'emergency', status: 'in_progress',
    reportedBy: 'Ahmed Nasser', reportedAt: '2026-10-15T09:00:00Z',
    assignedTo: 'tech-3', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-15T09:00:00Z' },
      { actor: 'Sara Mahmoud (Supervisor)', action: 'Status → In Progress', note: 'Assigned to Khaled Ibrahim.', ts: '2026-10-15T10:30:00Z' }
    ]
  },
  {
    id: 'MNT-002', title: 'Leaking Pipe in Men\'s Restroom – B Floor 2',
    description: 'There is a slow drip from the pipe under the sink in the men\'s restroom on the second floor of Building B. The floor is wet and could be a slip hazard.',
    category: 'Plumbing', building: 'Building B', room: 'Restroom 2M',
    priority: 'high', status: 'pending',
    reportedBy: 'Omar Khaled', reportedAt: '2026-10-16T11:15:00Z',
    assignedTo: 'tech-1', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-16T11:15:00Z' }
    ]
  },
  {
    id: 'MNT-003', title: 'Flickering Lights in Lecture Hall C101',
    description: 'The fluorescent lights in C101 flicker throughout lectures making it difficult to focus. Two bulbs appear completely burnt out.',
    category: 'Electrical', building: 'Building C', room: 'Hall C101',
    priority: 'medium', status: 'pending',
    reportedBy: 'Sara Mahmoud', reportedAt: '2026-10-16T13:45:00Z',
    assignedTo: 'tech-2', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-16T13:45:00Z' }
    ]
  },
  {
    id: 'MNT-004', title: 'Broken Door Handle – Library Entrance',
    description: 'The main entrance door handle of the library is loose and almost falling off. Students are struggling to open the door.',
    category: 'Carpentry', building: 'Library', room: 'Main Entrance',
    priority: 'medium', status: 'in_progress',
    reportedBy: 'Nour El-Din Fawzy', reportedAt: '2026-10-14T08:30:00Z',
    assignedTo: 'tech-4', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-14T08:30:00Z' },
      { actor: 'Sara Mahmoud (Supervisor)', action: 'Status → In Progress', note: 'Sara Adel dispatched.', ts: '2026-10-14T09:00:00Z' }
    ]
  },
  {
    id: 'MNT-005', title: 'Elevator Out of Service – Tower D',
    description: 'Elevator #2 in Tower D has been out of service since yesterday morning. Students with mobility needs are severely impacted.',
    category: 'Elevator', building: 'Tower D', room: 'All Floors',
    priority: 'emergency', status: 'pending',
    reportedBy: 'Admin User', reportedAt: '2026-10-17T07:00:00Z',
    assignedTo: '', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-17T07:00:00Z' }
    ]
  },
  {
    id: 'MNT-006', title: 'Water Dispenser Not Working – Canteen',
    description: 'The cold water dispenser near the canteen entrance is not dispensing any water. The machine is plugged in and shows power.',
    category: 'Plumbing', building: 'Canteen', room: 'Entrance Area',
    priority: 'low', status: 'resolved',
    reportedBy: 'Ahmed Nasser', reportedAt: '2026-10-10T10:00:00Z',
    assignedTo: 'tech-1', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-10T10:00:00Z' },
      { actor: 'Sara Mahmoud (Supervisor)', action: 'Status → In Progress', note: 'Ahmed Hassan assigned.', ts: '2026-10-10T11:00:00Z' },
      { actor: 'Ahmed Hassan (Tech)', action: 'Status → Resolved', note: 'Replaced internal filter and tested dispenser. Working normally.', ts: '2026-10-11T09:30:00Z' }
    ]
  },
  {
    id: 'MNT-007', title: 'Cracked Wall Paint – Corridor E3',
    description: 'Large section of wall paint is cracking and peeling in the E-wing corridor on the 3rd floor. Aesthetic issue and potential dust hazard.',
    category: 'Painting', building: 'Building E', room: 'Corridor 3rd Floor',
    priority: 'low', status: 'on_hold',
    reportedBy: 'Omar Khaled', reportedAt: '2026-10-12T14:00:00Z',
    assignedTo: 'tech-7', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-12T14:00:00Z' },
      { actor: 'Sara Mahmoud (Supervisor)', action: 'Status → On Hold', note: 'Painting materials on order. Will resume next week.', ts: '2026-10-13T09:00:00Z' }
    ]
  },
  {
    id: 'MNT-008', title: 'Blown Fuse – Faculty Office F202',
    description: 'No electrical power in Faculty Office F202. Appears to be a blown fuse or tripped breaker. Urgent as exams are being coordinated from this office.',
    category: 'Electrical', building: 'Building F', room: 'Office F202',
    priority: 'high', status: 'in_progress',
    reportedBy: 'Admin User', reportedAt: '2026-10-17T11:00:00Z',
    assignedTo: 'tech-6', photoUrl: '',
    log: [
      { actor: 'System', action: 'Task created', note: 'Reported via campus portal.', ts: '2026-10-17T11:00:00Z' },
      { actor: 'Sara Mahmoud (Supervisor)', action: 'Status → In Progress', note: 'Nour El-Sheikh dispatched immediately.', ts: '2026-10-17T11:20:00Z' }
    ]
  }
];

/* --------------------------------------------------------------------------
   Storage helpers
   -------------------------------------------------------------------------- */
function storeGet(key) {
  try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function storeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

/* --------------------------------------------------------------------------
   Seed  – writes defaults only once
   -------------------------------------------------------------------------- */
function seedMaintData() {
  if (!storeGet(MAINT_TECHS_KEY)) storeSet(MAINT_TECHS_KEY, SEED_TECHNICIANS);
  if (!storeGet(MAINT_TASKS_KEY)) storeSet(MAINT_TASKS_KEY, SEED_TASKS);
}

/* --------------------------------------------------------------------------
   Public data accessors
   -------------------------------------------------------------------------- */
function getTasks()  { seedMaintData(); return storeGet(MAINT_TASKS_KEY) || []; }
function getTechs()  { seedMaintData(); return storeGet(MAINT_TECHS_KEY) || []; }

function getTaskById(id) {
  return getTasks().find(function (t) { return t.id === id; }) || null;
}
function getTechById(id) {
  return getTechs().find(function (t) { return t.id === id; }) || null;
}

function saveTasks(tasks)  { storeSet(MAINT_TASKS_KEY, tasks); }
function saveTechs(techs)  { storeSet(MAINT_TECHS_KEY, techs); }

/** Update a single task and persist */
function updateTask(updatedTask) {
  var tasks = getTasks();
  var idx   = tasks.findIndex(function (t) { return t.id === updatedTask.id; });
  if (idx === -1) return false;
  tasks[idx] = updatedTask;
  saveTasks(tasks);
  return true;
}

/* --------------------------------------------------------------------------
   Computed stats (for supervisor dashboard counters)
   -------------------------------------------------------------------------- */
function getStats() {
  var tasks = getTasks();
  return {
    total:     tasks.length,
    pending:   tasks.filter(function (t) { return t.status === 'pending'; }).length,
    inProgress:tasks.filter(function (t) { return t.status === 'in_progress'; }).length,
    resolved:  tasks.filter(function (t) { return t.status === 'resolved'; }).length,
    emergency: tasks.filter(function (t) { return t.priority === 'emergency'; }).length
  };
}

/* --------------------------------------------------------------------------
   Chip / badge HTML helpers
   -------------------------------------------------------------------------- */
function priorityChip(priority) {
  var labels = { low: 'Low', medium: 'Medium', high: 'High', emergency: 'Emergency' };
  var icons  = {
    low:       '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><circle cx="5" cy="5" r="5"/></svg>',
    medium:    '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><circle cx="5" cy="5" r="5"/></svg>',
    high:      '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><polygon points="5,1 9,9 1,9"/></svg>',
    emergency: '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><polygon points="5,1 9,9 1,9"/></svg>'
  };
  var p = priority || 'low';
  return '<span class="priority-chip priority-chip--' + p + '">' + (icons[p] || '') + (labels[p] || p) + '</span>';
}

function statusChip(status) {
  var labels = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved', on_hold: 'On Hold' };
  var s = status || 'pending';
  var label = labels[s] || s.replace('_', ' ');
  return '<span class="maint-status-chip maint-status-chip--' + s + '">' + label + '</span>';
}

function availChip(avail) {
  var labels  = { available: 'Available', on_duty: 'On Duty', busy: 'Busy', off_shift: 'Off Shift' };
  var a = avail || 'available';
  var label = labels[a] || a.replace('_', ' ');
  return '<span class="avail-chip avail-chip--' + a + '">' + label + '</span>';
}

/* --------------------------------------------------------------------------
   Toast notification helper  (shared across pages)
   -------------------------------------------------------------------------- */
function showToast(message, type) {
  /* type: '' | 'success' | 'error' */
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'maint-toast';
    document.body.appendChild(container);
  }
  var item = document.createElement('div');
  item.className = 'maint-toast__item' + (type ? ' maint-toast__item--' + type : '');
  item.textContent = message;
  container.appendChild(item);
  setTimeout(function () {
    item.classList.add('is-hiding');
    setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, 280);
  }, 3000);
}

/* --------------------------------------------------------------------------
   Centralised role → home page map (used by all guards below)
   -------------------------------------------------------------------------- */
var ROLE_HOME_MAP = {
  student:           'home.html',
  supervisor:        'manager-dashboard.html',
  manager:           'manager-dashboard.html',
  technician:        'staff-dashboard.html',
  staff:             'staff-dashboard.html',
  admin:             'admin-panel.html',
  'lost-found-staff':'staff-lost-found.html',
  'lost-found-manager':'maneger-lost-found.html'
};

/* --------------------------------------------------------------------------
   roleRedirect(allowedRoles)
   Call from ANY page. Reads the session and redirects if the user's role
   is not in allowedRoles. Returns the session if the user is allowed, else
   null (and navigation has already been triggered).
   -------------------------------------------------------------------------- */
function roleRedirect(allowedRoles) {
  var s = null;
  try { s = JSON.parse(localStorage.getItem('campusone_session')); } catch (e) {}
  if (!s) { window.location.replace('login.html'); return null; }
  if (allowedRoles && allowedRoles.indexOf(s.role) === -1) {
    window.location.replace(ROLE_HOME_MAP[s.role] || 'home.html');
    return null;
  }
  return s;
}

/* --------------------------------------------------------------------------
   Session guard helper for maintenance pages.
   allowedRoles (optional): restrict page to a subset of staff.
   e.g. initMaintNav(['supervisor','manager','admin']) for supervisor-dashboard.
   -------------------------------------------------------------------------- */
function initMaintNav(allowedRoles) {
  /* 1 – Must be logged in */
  var s = null;
  try { s = JSON.parse(localStorage.getItem('campusone_session')); } catch (e) {}
  if (!s) { window.location.replace('login.html'); return null; }

  /* 2 – Must be any kind of staff (not a plain student) */
  var ALL_STAFF = ['supervisor', 'manager', 'admin', 'staff', 'technician'];
  if (ALL_STAFF.indexOf(s.role) === -1) {
    window.location.replace('home.html');
    return null;
  }

  /* 3 – Page-level restriction (e.g. supervisor-only pages). Admin bypasses all. */
  if (allowedRoles && s.role !== 'admin' && allowedRoles.indexOf(s.role) === -1) {
    window.location.replace(ROLE_HOME_MAP[s.role] || 'home.html');
    return null;
  }

  var el = function (id) { return document.getElementById(id); };
  var ini = (s.name || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  if (el('nav-initials'))   el('nav-initials').textContent   = ini;
  if (el('nav-user-name'))  el('nav-user-name').textContent  = s.name  || '';
  if (el('nav-user-email')) el('nav-user-email').textContent = s.email || '';

  function initDrop(tid, pid) {
    var t = el(tid), p = el(pid); if (!t || !p) return;
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      var o = p.classList.toggle('is-open');
      t.setAttribute('aria-expanded', String(o));
      ['notif-panel', 'profile-panel'].forEach(function (x) { if (x !== pid && el(x)) el(x).classList.remove('is-open'); });
    });
  }
  initDrop('notif-trigger', 'notif-panel');
  initDrop('profile-trigger', 'profile-panel');

  document.addEventListener('click', function () {
    ['notif-panel', 'profile-panel'].forEach(function (pid) { if (el(pid)) el(pid).classList.remove('is-open'); });
    ['notif-trigger', 'profile-trigger'].forEach(function (tid) { if (el(tid)) el(tid).setAttribute('aria-expanded', 'false'); });
  });

  var lb = el('logout-btn');
  if (lb) lb.addEventListener('click', function () { localStorage.removeItem('campusone_session'); window.location.replace('login.html'); });

  var tog = el('app-menu-toggle'), nav = el('app-nav');
  if (tog && nav) tog.addEventListener('click', function () { tog.setAttribute('aria-expanded', String(nav.classList.toggle('is-open'))); });

  return s;
}

/* Format ISO date string nicely */
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return iso; }
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

/* Animated counter */
function animateCounter(el, target, duration) {
  duration = duration || 800;
  var start    = 0;
  var startTs  = null;
  function step(ts) {
    if (!startTs) startTs = ts;
    var progress = Math.min((ts - startTs) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}
