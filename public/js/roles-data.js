/* ==========================================================================
   roles-data.js – Role-based auth helpers and change-request data layer
   for Staff / Manager / Admin maintenance portals.
   ========================================================================== */
'use strict';

var CHANGE_REQUESTS_KEY = 'campusone_change_requests';

/* --------------------------------------------------------------------------
   Change Request helpers
   -------------------------------------------------------------------------- */
function getChangeRequests() {
  try { var v = localStorage.getItem(CHANGE_REQUESTS_KEY); return v ? JSON.parse(v) : []; } catch(e) { return []; }
}

function saveChangeRequest(request) {
  var requests = getChangeRequests();
  requests.push(request);
  try { localStorage.setItem(CHANGE_REQUESTS_KEY, JSON.stringify(requests)); } catch(e) {}
}

function updateChangeRequest(id, updates) {
  var requests = getChangeRequests();
  var idx = requests.findIndex(function(r){ return r.id === id; });
  if (idx === -1) return false;
  Object.keys(updates).forEach(function(k){ requests[idx][k] = updates[k]; });
  try { localStorage.setItem(CHANGE_REQUESTS_KEY, JSON.stringify(requests)); return true; } catch(e) { return false; }
}

/* --------------------------------------------------------------------------
   Role-based nav guard
   Allowed roles per page type:
     'staff'   → role: staff | technician
     'manager' → role: supervisor | manager
     'admin'   → role: admin
   -------------------------------------------------------------------------- */
function initRoleNav(pageRole) {
  var s = null;
  try { s = JSON.parse(localStorage.getItem('campusone_session')); } catch(e) {}
  if (!s) { window.location.replace('login.html'); return null; }

  /* Role groups */
  var STAFF_ROLES   = ['staff', 'technician'];
  var MANAGER_ROLES = ['supervisor', 'manager'];
  var ADMIN_ROLES   = ['admin'];
  var ALL_MAINT     = STAFF_ROLES.concat(MANAGER_ROLES).concat(ADMIN_ROLES);

  if (ALL_MAINT.indexOf(s.role) === -1) {
    window.location.replace('home.html');
    return null;
  }

  /* Page-level guard */
  if (pageRole === 'staff'   && STAFF_ROLES.indexOf(s.role)   === -1 &&
                                MANAGER_ROLES.indexOf(s.role) === -1 &&
                                ADMIN_ROLES.indexOf(s.role)   === -1) {
    window.location.replace('login.html'); return null;
  }
  if (pageRole === 'manager' && MANAGER_ROLES.indexOf(s.role) === -1 &&
                                ADMIN_ROLES.indexOf(s.role)   === -1) {
    window.location.replace('staff-dashboard.html'); return null;
  }
  if (pageRole === 'admin'   && ADMIN_ROLES.indexOf(s.role)   === -1) {
    window.location.replace(MANAGER_ROLES.indexOf(s.role) !== -1 ? 'manager-dashboard.html' : 'staff-dashboard.html');
    return null;
  }

  /* Populate header */
  var el = function(id){ return document.getElementById(id); };
  var ini = (s.name || '?').trim().split(/\s+/).map(function(w){ return w[0]; }).slice(0, 2).join('').toUpperCase();
  if (el('nav-initials'))   el('nav-initials').textContent   = ini;
  if (el('nav-user-name'))  el('nav-user-name').textContent  = s.name  || '';
  if (el('nav-user-email')) el('nav-user-email').textContent = s.email || '';

  /* Role badge label */
  var badge = el('nav-role-badge');
  if (badge) {
    var roleLabels = { staff:'Staff', technician:'Staff', supervisor:'Manager', manager:'Manager', admin:'Admin' };
    badge.textContent = roleLabels[s.role] || s.role;
  }

  /* Dropdowns */
  function initDrop(tid, pid) {
    var t = el(tid), p = el(pid); if (!t || !p) return;
    t.addEventListener('click', function(e){
      e.stopPropagation();
      var o = p.classList.toggle('is-open');
      t.setAttribute('aria-expanded', String(o));
      ['notif-panel','profile-panel'].forEach(function(x){ if(x!==pid&&el(x)) el(x).classList.remove('is-open'); });
    });
  }
  initDrop('notif-trigger', 'notif-panel');
  initDrop('profile-trigger', 'profile-panel');

  document.addEventListener('click', function(){
    ['notif-panel','profile-panel'].forEach(function(pid){ if(el(pid)) el(pid).classList.remove('is-open'); });
    ['notif-trigger','profile-trigger'].forEach(function(tid){ if(el(tid)) el(tid).setAttribute('aria-expanded','false'); });
  });

  var lb = el('logout-btn');
  if (lb) lb.addEventListener('click', function(){
    localStorage.removeItem('campusone_session');
    window.location.replace('login.html');
  });

  var tog = el('app-menu-toggle'), nav = el('app-nav');
  if (tog && nav) tog.addEventListener('click', function(){ tog.setAttribute('aria-expanded', String(nav.classList.toggle('is-open'))); });

  return s;
}
