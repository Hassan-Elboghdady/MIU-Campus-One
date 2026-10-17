/**
 * reports-service.js
 * Data service for campus maintenance reports.
 * All access to localStorage goes through the safe wrapper from common.js.
 * Replace this module with real API calls later; the function signatures
 * and the report object shape must not change.
 */

import { CONFIG, getUser } from './common.js';

// --------------------------------------------------------------------------
// Storage key (shared with future staff pages)
// --------------------------------------------------------------------------
const STORAGE_KEY = 'campusone_reports';

// --------------------------------------------------------------------------
// Status constants
// --------------------------------------------------------------------------
export const STATUSES = Object.freeze({
  SUBMITTED:   'submitted',
  ASSIGNED:    'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED:    'resolved',
});

// --------------------------------------------------------------------------
// Building list - values to be confirmed by the team
// --------------------------------------------------------------------------
export const BUILDINGS = [
  /* [TEAM TO CONFIRM] Replace placeholder values with real MIU building names */
  '[TEAM TO CONFIRM] Building A',
  '[TEAM TO CONFIRM] Building B',
  '[TEAM TO CONFIRM] Building C',
  '[TEAM TO CONFIRM] Building D',
  '[TEAM TO CONFIRM] Library',
  '[TEAM TO CONFIRM] Student Center',
  '[TEAM TO CONFIRM] Administration',
  '[TEAM TO CONFIRM] Sports Complex',
];

// --------------------------------------------------------------------------
// Safe localStorage helpers (mirrored from common.js style)
// --------------------------------------------------------------------------
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
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      return 'quota';
    }
    return false;
  }
}

// --------------------------------------------------------------------------
// ID generator - RPT-YEAR-SEQUENCE
// --------------------------------------------------------------------------
function generateId(reports) {
  const year  = new Date().getFullYear();
  const prefix = `RPT-${year}-`;
  const nums   = reports
    .map((r) => {
      const match = r.id && r.id.startsWith(prefix) ? parseInt(r.id.slice(prefix.length), 10) : 0;
      return isNaN(match) ? 0 : match;
    });
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// --------------------------------------------------------------------------
// MOCK seed data - only inserted when CONFIG.DEV_MODE is true
// --------------------------------------------------------------------------
/* MOCK DATA - remove or gate behind DEV_MODE before any production launch */
function seedMockData() {
  const existing = storageGet();
  if (existing.length > 0) return;

  const user = getUser();
  if (!user) return;

  const now     = new Date();
  const dayAgo  = new Date(now - 86400000).toISOString();
  const weekAgo = new Date(now - 7 * 86400000).toISOString();

  /* MOCK DATA start */
  const mockReports = [
    {
      id:           'RPT-2026-0001',
      studentEmail: user.email,
      studentName:  user.name,
      title:        'Broken projector in lecture hall',
      description:  'The projector in room 201 does not display an image. The power light is on but the screen stays blank. It has been like this for three days.',
      building:     BUILDINGS[0],
      room:         'Room 201',
      images:       [],
      status:       STATUSES.RESOLVED,
      createdAt:    weekAgo,
      updatedAt:    dayAgo,
      assignedTo:   { name: 'Technician Staff', role: 'technician' },
      timeline: [
        { status: STATUSES.SUBMITTED,   timestamp: weekAgo,                             note: 'Report submitted' },
        { status: STATUSES.ASSIGNED,    timestamp: new Date(now - 5 * 86400000).toISOString(), note: 'Assigned to maintenance team' },
        { status: STATUSES.IN_PROGRESS, timestamp: new Date(now - 3 * 86400000).toISOString(), note: 'Technician on site' },
        { status: STATUSES.RESOLVED,    timestamp: dayAgo,                              note: 'Projector lamp replaced' },
      ],
    },
    {
      id:           'RPT-2026-0002',
      studentEmail: user.email,
      studentName:  user.name,
      title:        'Leaking tap in ground floor bathroom',
      description:  'The cold water tap in the ground floor men\'s bathroom near the main entrance has been dripping constantly for about a week.',
      building:     BUILDINGS[1],
      room:         'Ground floor bathroom',
      images:       [],
      status:       STATUSES.IN_PROGRESS,
      createdAt:    new Date(now - 4 * 86400000).toISOString(),
      updatedAt:    new Date(now - 2 * 86400000).toISOString(),
      assignedTo:   { name: 'Plumbing Team', role: 'technician' },
      timeline: [
        { status: STATUSES.SUBMITTED,   timestamp: new Date(now - 4 * 86400000).toISOString(), note: 'Report submitted' },
        { status: STATUSES.ASSIGNED,    timestamp: new Date(now - 3 * 86400000).toISOString(), note: 'Assigned to plumbing team' },
        { status: STATUSES.IN_PROGRESS, timestamp: new Date(now - 2 * 86400000).toISOString(), note: 'Parts ordered, repair scheduled' },
      ],
    },
    {
      id:           'RPT-2026-0003',
      studentEmail: user.email,
      studentName:  user.name,
      title:        'Broken socket near window in library',
      description:  'The power socket on the right side of the third row, near the window, does not work. Students cannot charge laptops in that area.',
      building:     BUILDINGS[4],
      room:         'Third row, window side',
      images:       [],
      status:       STATUSES.SUBMITTED,
      createdAt:    new Date(now - 86400000).toISOString(),
      updatedAt:    new Date(now - 86400000).toISOString(),
      assignedTo:   null,
      timeline: [
        { status: STATUSES.SUBMITTED, timestamp: new Date(now - 86400000).toISOString(), note: 'Report submitted' },
      ],
    },
  ];
  /* MOCK DATA end */

  storageSet(mockReports);
}

// --------------------------------------------------------------------------
// Public API (async - returns Promises for easy API replacement)
// --------------------------------------------------------------------------

/**
 * Returns all reports owned by the logged-in student, newest first.
 * @returns {Promise<object[]>}
 */
export async function getMyReports() {
  if (CONFIG.DEV_MODE) seedMockData();
  const user = getUser();
  if (!user) return [];
  const all = storageGet();
  return all
    .filter((r) => r.studentEmail === user.email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Returns a single report by ID, only if it belongs to the logged-in student.
 * Returns null if not found or if it belongs to another student.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getReportById(id) {
  if (CONFIG.DEV_MODE) seedMockData();
  const user = getUser();
  if (!user) return null;
  const all = storageGet();
  const report = all.find((r) => r.id === id);
  if (!report || report.studentEmail !== user.email) return null;
  return report;
}

/**
 * Creates a new report. Returns the saved report object, or throws if quota exceeded.
 * @param {{ title: string, description: string, building: string, room: string, images: string[] }} data
 * @returns {Promise<object>}
 */
export async function createReport(data) {
  const user = getUser();
  if (!user) throw new Error('Not logged in');

  const all      = storageGet();
  const now      = new Date().toISOString();
  const newReport = {
    id:           generateId(all),
    studentEmail: user.email,
    studentName:  user.name,
    title:        data.title,
    description:  data.description,
    building:     data.building,
    room:         data.room,
    images:       data.images || [],
    status:       STATUSES.SUBMITTED,
    createdAt:    now,
    updatedAt:    now,
    assignedTo:   null,
    timeline: [
      { status: STATUSES.SUBMITTED, timestamp: now, note: 'Report submitted' },
    ],
  };

  const updated = [...all, newReport];
  const result  = storageSet(updated);

  if (result === 'quota') {
    throw new DOMException('Storage quota exceeded. Free up space and try again.', 'QuotaExceededError');
  }
  if (result === false) {
    throw new Error('Could not save the report. Please try again.');
  }

  return newReport;
}
