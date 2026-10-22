/**
 * emergency-map-data.js
 * CampusOne - Emergency Evacuation & Emergency Map dataset
 *
 * Dedicated dataset and localStorage persistence for Emergency Exits.
 * Completely isolated from ordinary campus locations.
 *
 * Positions are normalized image coordinates relative to the aerial map:
 *   x: 0.0 (left edge)  -> 1.0 (right edge)
 *   y: 0.0 (top edge)   -> 1.0 (bottom edge)
 *
 * NOTE: The initial seed positions are provisional references based on
 * the campus visual model and can be fine-tuned manually by authorized editors.
 */

// --------------------------------------------------------------------------
// Storage Key (Dedicated to Emergency Map data)
// --------------------------------------------------------------------------
const EMERGENCY_STORAGE_KEY = 'campusone_emergency_exits_v1';

// --------------------------------------------------------------------------
// Provisional Seed Emergency Exits (Matching the visual reference map)
// --------------------------------------------------------------------------
const SEED_EMERGENCY_EXITS = [
  {
    id: 'exit-north-gate',
    name: 'North Emergency Exit',
    label: 'Emergency Exit',
    zone: 'North Academic Wing',
    description: 'Provisional emergency exit located near the north-east academic wing and faculty building.',
    status: 'operational',
    placed: true,
    x: 0.601,
    y: 0.103,
  },
  {
    id: 'exit-west-courtyard',
    name: 'West Courtyard Exit',
    label: 'Emergency Exit',
    zone: 'Central West Courtyard',
    description: 'Provisional emergency exit adjacent to the central plaza and lecture hall pathway.',
    status: 'operational',
    placed: true,
    x: 0.372,
    y: 0.369,
  },
  {
    id: 'exit-south-complex',
    name: 'South Sports Complex Exit',
    label: 'Emergency Exit',
    zone: 'South Athletic Area',
    description: 'Provisional emergency exit serving the south athletics area, track, and multipurpose courts.',
    status: 'operational',
    placed: true,
    x: 0.635,
    y: 0.884,
  },
];

// --------------------------------------------------------------------------
// Persistence & Merge Logic
// --------------------------------------------------------------------------

/**
 * Load emergency exits from localStorage.
 * Gracefully handles missing, corrupted, or invalid localStorage entries,
 * falling back to the canonical seed list when needed.
 * @returns {Array<object>}
 */
function loadEmergencyExits() {
  try {
    const raw = localStorage.getItem(EMERGENCY_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved) && saved.length > 0) {
        // Validate each exit object
        const validExits = saved
          .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
          .map((item) => {
            const hasCoords = typeof item.x === 'number' && typeof item.y === 'number' &&
              !isNaN(item.x) && !isNaN(item.y);
            return {
              id: item.id,
              name: (item.name || 'Emergency Exit').trim(),
              label: (item.label || 'Emergency Exit').trim(),
              zone: (item.zone || 'Campus Perimeter').trim(),
              description: item.description || '',
              status: item.status || 'operational',
              placed: item.placed === true && hasCoords,
              x: hasCoords ? Math.max(0, Math.min(1, parseFloat(Number(item.x).toFixed(4)))) : null,
              y: hasCoords ? Math.max(0, Math.min(1, parseFloat(Number(item.y).toFixed(4)))) : null,
            };
          });

        if (validExits.length > 0) {
          return validExits;
        }
      }
    }
  } catch (err) {
    console.warn('CampusOne: failed to read emergency exits from localStorage, using defaults.', err);
  }

  saveEmergencyExits(SEED_EMERGENCY_EXITS);
  return structuredClone(SEED_EMERGENCY_EXITS);
}

/**
 * Save emergency exits array to localStorage.
 * @param {Array<object>} exits
 * @returns {boolean}
 */
function saveEmergencyExits(exits) {
  try {
    if (!Array.isArray(exits)) return false;
    localStorage.setItem(EMERGENCY_STORAGE_KEY, JSON.stringify(exits));
    return true;
  } catch (err) {
    console.warn('CampusOne: failed to save emergency exits to localStorage.', err);
    return false;
  }
}

/**
 * Reset emergency exits back to initial seed dataset.
 * @returns {Array<object>}
 */
function resetEmergencyExits() {
  saveEmergencyExits(SEED_EMERGENCY_EXITS);
  return structuredClone(SEED_EMERGENCY_EXITS);
}

// --------------------------------------------------------------------------
// Query Helpers
// --------------------------------------------------------------------------

/**
 * Filter exits by operational status.
 * @param {Array} exits
 * @param {string} status
 * @returns {Array}
 */
function filterEmergencyExits(exits, status) {
  if (!status || status === 'all') return exits;
  return exits.filter((e) => e.status === status);
}

/**
 * Case-insensitive search on emergency exit name, zone, and description.
 * @param {Array} exits
 * @param {string} query
 * @returns {Array}
 */
function searchEmergencyExits(exits, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return exits;
  return exits.filter((e) =>
    (e.name && e.name.toLowerCase().includes(q)) ||
    (e.label && e.label.toLowerCase().includes(q)) ||
    (e.zone && e.zone.toLowerCase().includes(q)) ||
    (e.description && e.description.toLowerCase().includes(q))
  );
}

/**
 * Generate unique id for a new emergency exit.
 * @returns {string}
 */
function generateEmergencyExitId() {
  return 'exit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

/**
 * Sort emergency exits by name or zone.
 * @param {Array} exits
 * @param {string} field
 * @returns {Array}
 */
function sortEmergencyExits(exits, field) {
  const arr = [...exits];
  if (field === 'zone') {
    return arr.sort((a, b) => (a.zone || '').localeCompare(b.zone || ''));
  }
  if (field === 'status') {
    return arr.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
  }
  return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Find exit by unique id.
 * @param {Array} exits
 * @param {string} id
 * @returns {object|undefined}
 */
function findEmergencyExitById(exits, id) {
  return exits.find((e) => e.id === id);
}

/**
 * Roles permitted to edit emergency exits.
 * In CampusOne, editing is strictly restricted to admins and supervisors.
 * Students and standard staff are read-only.
 */
const AUTHORIZED_EMERGENCY_ROLES = ['admin', 'supervisor'];

function isAuthorizedEmergencyMapEditor(user) {
  if (!user || !user.role) return false;
  const role = String(user.role).toLowerCase();
  return AUTHORIZED_EMERGENCY_ROLES.includes(role);
}

if (typeof isAuthorizedMapEditor === 'undefined') {
  window.isAuthorizedMapEditor = isAuthorizedEmergencyMapEditor;
}
