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
// Building list
// --------------------------------------------------------------------------
export const BUILDINGS = [
  'Building R',
  'Building N',
  'MAIN',
  'Building P',
  'Building S',
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
      building:     BUILDINGS[2], // MAIN
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
  const all  = storageGet();

  if (user && user.email) {
    const currentEmail = (user.email || '').trim().toLowerCase();
    const userReports = all.filter((r) => {
      const rEmail = (r.studentEmail || '').trim().toLowerCase();
      return !rEmail || rEmail === currentEmail;
    });

    if (userReports.length > 0) {
      return userReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (CONFIG.DEV_MODE) {
      return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return [];
  }

  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Returns a single report by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getReportById(id) {
  if (CONFIG.DEV_MODE) seedMockData();
  const all = storageGet();
  const report = all.find((r) => r.id === id);
  return report || null;
}

/**
 * Creates a new report and saves it to localStorage so it appears in My Reports.
 * Returns the saved report object, or throws if quota exceeded.
 * @param {{ title: string, description: string, building: string, room: string, images: string[] }} data
 * @returns {Promise<object>}
 */
export async function createReport(data) {
  let user = getUser();
  if (!user) {
    user = { email: 'student@miu.edu.eg', name: 'Student', role: 'student' };
  }

  const all       = storageGet();
  const now       = new Date().toISOString();
  const safeEmail = (user.email || 'student@miu.edu.eg').trim().toLowerCase();
  const safeName  = (user.name || 'Student').trim();

  const newReport = {
    id:           generateId(all),
    studentEmail: safeEmail,
    studentName:  safeName,
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

  const updated = [newReport, ...all];
  const result  = storageSet(updated);

  if (result === 'quota') {
    // Retry without heavy base64 images so report text and location are never lost
    const strippedReport = { ...newReport, images: [] };
    const retryUpdated   = [strippedReport, ...all];
    const retryResult    = storageSet(retryUpdated);
    if (retryResult === true) {
      return strippedReport;
    }
    throw new DOMException('Storage quota exceeded. Free up space and try again.', 'QuotaExceededError');
  }
  if (result === false) {
    throw new Error('Could not save the report. Please try again.');
  }

  return newReport;
}
