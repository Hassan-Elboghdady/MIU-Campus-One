/**
 * map-data.js
 * CampusOne – Campus Map location dataset
 *
 * Positions are normalized image coordinates relative to the MIU campus aerial image:
 *   x: 0.0 (left edge)  → 1.0 (right edge)
 *   y: 0.0 (top edge)   → 1.0 (bottom edge)
 *
 * Locations with placed: false have x: null, y: null and are positioned
 * manually by the user via Edit Locations mode.
 */

// --------------------------------------------------------------------------
// Storage key (v4: complete 22-location dataset)
// --------------------------------------------------------------------------
const STORAGE_KEY = 'campusone_map_locations_v4';

// --------------------------------------------------------------------------
// Category definitions
// --------------------------------------------------------------------------
const CATEGORIES = {
  building:    { id: 'building',    label: 'Buildings',          icon: 'building'    },
  restaurant:  { id: 'restaurant',  label: 'Food & Restaurants', icon: 'restaurant'  },
  supermarket: { id: 'supermarket', label: 'Supermarkets',       icon: 'supermarket' },
  facility:    { id: 'facility',    label: 'Facilities',         icon: 'facility'    },
  entrance:    { id: 'entrance',    label: 'Entrances',          icon: 'entrance'    },
};

// --------------------------------------------------------------------------
// Complete Seed Locations
// Verified buildings and structures keep their aerial coordinates.
// New food, supermarket, and pharmacy locations start unplaced (placed: false).
// --------------------------------------------------------------------------
const SEED_LOCATIONS = [
  // ==================== BUILDINGS ====================
  {
    id: 'loc-main-building',
    name: 'Main Building',
    category: 'building',
    description: 'Central administrative and faculty complex of Misr International University.',
    placed: true,
    x: 0.46,
    y: 0.81,
  },
  {
    id: 'loc-k-building',
    name: 'K Building',
    category: 'building',
    description: 'Faculty and academic building connected to the main campus wing.',
    placed: true,
    x: 0.66,
    y: 0.76,
  },
  {
    id: 'loc-n-building',
    name: 'N Building',
    category: 'building',
    description: 'Faculty of Computer Science and Engineering lecture halls.',
    placed: true,
    x: 0.33,
    y: 0.41,
  },
  {
    id: 'loc-n-labs-building',
    name: 'N Labs Building',
    category: 'building',
    description: 'Specialized computing, electronics, and engineering research laboratories.',
    placed: true,
    x: 0.43,
    y: 0.38,
  },
  {
    id: 'loc-s-building',
    name: 'S Building',
    category: 'building',
    description: 'Faculty of Business Administration and specialized auditoriums.',
    placed: true,
    x: 0.56,
    y: 0.40,
  },
  {
    id: 'loc-r-building',
    name: 'R Building',
    category: 'building',
    description: 'Academic classrooms and faculty offices located in the north-east campus.',
    placed: true,
    x: 0.59,
    y: 0.18,
  },

  // ==================== FOOD AND RESTAURANTS ====================
  {
    id: 'loc-my-corner',
    name: 'My Corner',
    category: 'restaurant',
    description: 'Campus cafeteria serving hot meals, snacks, and daily specials.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-manousheh',
    name: 'Manousheh',
    category: 'restaurant',
    description: 'Fresh Lebanese flatbreads, zaatar, and baked savoury wraps.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-farghali',
    name: 'Farghali',
    category: 'restaurant',
    description: 'Famous fresh Egyptian juices, smoothies, and fruit cocktails.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-tbs',
    name: 'TBS',
    category: 'restaurant',
    description: 'The Bakery Shop: artisan croissants, sandwiches, and coffee.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-cinnabon',
    name: 'Cinnabon',
    category: 'restaurant',
    description: 'Freshly baked cinnamon rolls, baked treats, and cold beverages.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-r2-go',
    name: 'R2 Go',
    category: 'restaurant',
    description: 'Quick-service grab-and-go kiosk for busy students and faculty.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-conita',
    name: 'Conita',
    category: 'restaurant',
    description: 'Ice cream cones, frozen desserts, and sweet snacks.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-sparrow',
    name: 'Sparrow',
    category: 'restaurant',
    description: 'Specialty coffee, espresso drinks, and student lounge.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-gyro',
    name: 'Gyro',
    category: 'restaurant',
    description: 'Mediterranean gyros, wraps, fries, and casual lunch bowls.',
    placed: false,
    x: null,
    y: null,
  },

  // ==================== SUPERMARKETS ====================
  {
    id: 'loc-metro',
    name: 'Metro',
    category: 'supermarket',
    description: 'On-campus supermarket offering groceries, snacks, and student supplies.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-la-fraise',
    name: 'La Fraise',
    category: 'supermarket',
    description: 'Convenience store stocking fresh dairy, snacks, drinks, and essentials.',
    placed: false,
    x: null,
    y: null,
  },
  {
    id: 'loc-express-smart',
    name: 'Express Smart',
    category: 'supermarket',
    description: 'Smart self-checkout convenience store for daily necessities.',
    placed: false,
    x: null,
    y: null,
  },

  // ==================== OTHER LOCATIONS ====================
  {
    id: 'loc-main-entrance',
    name: 'Main Entrance',
    category: 'entrance',
    description: 'Primary security gate, drop-off area, and main vehicle access roundabout.',
    placed: true,
    x: 0.50,
    y: 0.98,
  },
  {
    id: 'loc-sports-area',
    name: 'Sports Area',
    category: 'facility',
    description: 'Outdoor athletic courts, football pitch, running track, and basketball courts.',
    placed: true,
    x: 0.31,
    y: 0.17,
  },
  {
    id: 'loc-pharmacy',
    name: 'Pharmacy',
    category: 'facility',
    description: 'Campus pharmacy and student health prescription dispensary.',
    placed: false,
    x: null,
    y: null,
  },
];

// --------------------------------------------------------------------------
// Persistence & Merge Logic
// --------------------------------------------------------------------------

/**
 * Load locations from localStorage, merging any previously saved user coordinates
 * with the full canonical seed list so that unplaced locations are never missed.
 * Gracefully handles missing, corrupted, or invalid localStorage entries.
 * @returns {Array<object>}
 */
function loadLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let saved = [];
    if (raw) {
      saved = JSON.parse(raw);
    } else {
      // Check if previous v3 exists to migrate any custom user placed positions
      const v3 = localStorage.getItem('campusone_map_locations_v3');
      if (v3) saved = JSON.parse(v3);
    }

    if (Array.isArray(saved) && saved.length > 0) {
      // Validate saved items
      const validSaved = saved
        .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
        // Retired: emergency locations now live only on the dedicated Emergency Map.
        // Drop any stale saved copies so they never resurface on the Campus Map.
        .filter((item) => item.category !== 'emergency' && item.id !== 'loc-emergency-point');
      const savedMap = new Map();
      validSaved.forEach((item) => savedMap.set(item.id, item));

      // Build unified list based on canonical seeds
      const merged = SEED_LOCATIONS.map((seed) => {
        const existing = savedMap.get(seed.id);
        if (existing) {
          const hasValidCoords = typeof existing.x === 'number' && typeof existing.y === 'number' &&
            !isNaN(existing.x) && !isNaN(existing.y);
          return {
            ...seed,
            name: typeof existing.name === 'string' && existing.name.trim() ? existing.name.trim() : seed.name,
            description: typeof existing.description === 'string' ? existing.description : seed.description,
            category: typeof existing.category === 'string' && CATEGORIES[existing.category] ? existing.category : seed.category,
            placed: existing.placed === true && hasValidCoords,
            x: hasValidCoords ? Math.max(0, Math.min(1, parseFloat(Number(existing.x).toFixed(4)))) : seed.x,
            y: hasValidCoords ? Math.max(0, Math.min(1, parseFloat(Number(existing.y).toFixed(4)))) : seed.y,
          };
        }
        return structuredClone(seed);
      });

      // Also append any custom user-created locations that aren't in SEED_LOCATIONS
      validSaved.forEach((item) => {
        if (!SEED_LOCATIONS.some((s) => s.id === item.id)) {
          const hasValidCoords = typeof item.x === 'number' && typeof item.y === 'number' &&
            !isNaN(item.x) && !isNaN(item.y);
          merged.push({
            id: item.id,
            name: (item.name || 'Untitled Location').trim(),
            category: CATEGORIES[item.category] ? item.category : 'building',
            description: item.description || '',
            placed: item.placed === true && hasValidCoords,
            x: hasValidCoords ? Math.max(0, Math.min(1, parseFloat(Number(item.x).toFixed(4)))) : null,
            y: hasValidCoords ? Math.max(0, Math.min(1, parseFloat(Number(item.y).toFixed(4)))) : null,
          });
        }
      });

      saveLocations(merged);
      return merged;
    }
  } catch (err) {
    console.warn('CampusOne: failed to read localStorage locations, using seeds.', err);
  }

  saveLocations(SEED_LOCATIONS);
  return structuredClone(SEED_LOCATIONS);
}

/**
 * Save locations array to localStorage.
 * @param {Array<object>} locations
 * @returns {boolean}
 */
function saveLocations(locations) {
  try {
    if (!Array.isArray(locations)) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    return true;
  } catch (err) {
    console.warn('CampusOne: failed to save locations to localStorage.', err);
    return false;
  }
}

/**
 * Reset locations back to the initial seed dataset.
 * @returns {Array<object>}
 */
function resetLocations() {
  saveLocations(SEED_LOCATIONS);
  return structuredClone(SEED_LOCATIONS);
}

// --------------------------------------------------------------------------
// Query helpers
// --------------------------------------------------------------------------

/**
 * Filter locations by category.
 * @param {Array} locations
 * @param {string} category
 * @returns {Array}
 */
function filterByCategory(locations, category) {
  if (!category || category === 'all') return locations;
  return locations.filter((l) => l.category === category);
}

/**
 * Case-insensitive name and category search.
 * @param {Array} locations
 * @param {string} query
 * @returns {Array}
 */
function searchLocations(locations, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return locations;
  return locations.filter((l) =>
    (l.name && l.name.toLowerCase().includes(q)) ||
    (l.description && l.description.toLowerCase().includes(q)) ||
    (l.category && l.category.toLowerCase().includes(q))
  );
}

/**
 * Sort locations by field.
 * @param {Array} locations
 * @param {'name'|'category'} field
 * @returns {Array} new sorted array
 */
function sortLocations(locations, field = 'name') {
  return [...locations].sort((a, b) => {
    const av = (a[field] || '').toLowerCase();
    const bv = (b[field] || '').toLowerCase();
    return av.localeCompare(bv);
  });
}

/**
 * Generate a unique id for a new location.
 * @returns {string}
 */
function generateId() {
  return 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/**
 * Return placed-only locations (x and y are not null).
 * @param {Array} locations
 * @returns {Array}
 */
function getPlacedLocations(locations) {
  return locations.filter((l) => l.placed && l.x !== null && l.y !== null);
}

/**
 * Find a single location by id.
 * @param {Array} locations
 * @param {string} id
 * @returns {object|undefined}
 */
function findById(locations, id) {
  return locations.find((l) => l.id === id);
}

// --------------------------------------------------------------------------
// Role-based Editing Authorization
// --------------------------------------------------------------------------

/**
 * Roles permitted to modify map locations.
 * In CampusOne, editing is restricted to administrators and authorized staff (supervisors).
 * Students and other staff are strictly view-only.
 */
const AUTHORIZED_MAP_ROLES = ['admin', 'supervisor'];

/**
 * Check if the given user is authorized to edit the campus map.
 * @param {object|null} user
 * @returns {boolean}
 */
function isAuthorizedMapEditor(user) {
  if (!user || !user.role) return false;
  const role = String(user.role).toLowerCase();
  return AUTHORIZED_MAP_ROLES.includes(role);
}
