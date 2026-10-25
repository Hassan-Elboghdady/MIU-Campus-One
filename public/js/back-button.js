/* back-button.js
   Shows a floating "← Back to Dashboard" button for roles that visit a page
   outside their home. Student and Manager are excluded — they navigate freely
   and don't need the back button. Admin, Staff, Technician, and L&F Staff get it.
   Works on file:// (no ES modules, pure IIFE). */
(function () {
  'use strict';

  var s = null;
  try { s = JSON.parse(localStorage.getItem('campusone_session')); } catch (e) {}
  if (!s || !s.role) return;

  /* Roles that do NOT get the back button */
  var SKIP_ROLES = { student: true, manager: true, supervisor: true };
  if (SKIP_ROLES[s.role]) return;

  var ROLE_HOME = {
    staff:              'staff-dashboard.html',
    technician:         'staff-dashboard.html',
    'lost-found-staff': 'staff-lost-found.html',
    admin:              'admin-panel.html'
  };

  var ROLE_LABEL = {
    staff:              'Staff Dashboard',
    technician:         'Staff Dashboard',
    'lost-found-staff': 'L&F Dashboard',
    admin:              'Admin Panel'
  };

  var home = ROLE_HOME[s.role];
  if (!home) return;

  var page = (window.location.pathname.split('/').pop()) || 'index.html';
  if (page === home) return;

  var btn = document.createElement('a');
  btn.href = home;
  btn.id   = 'role-back-btn';
  btn.setAttribute('aria-label', 'Back to ' + ROLE_LABEL[s.role]);
  btn.style.cssText = [
    'position:fixed',
    'top:70px',
    'left:16px',
    'z-index:850',
    'display:inline-flex',
    'align-items:center',
    'gap:8px',
    'background:rgba(20,20,20,0.90)',
    'color:#fff',
    'font-size:13px',
    'font-weight:600',
    'padding:9px 16px',
    'border-radius:8px',
    'text-decoration:none',
    'box-shadow:0 4px 20px rgba(0,0,0,0.30)',
    'backdrop-filter:blur(10px)',
    '-webkit-backdrop-filter:blur(10px)',
    'transition:transform .15s ease,box-shadow .15s ease',
    'letter-spacing:.01em',
    'border:1px solid rgba(255,255,255,0.12)',
    'white-space:nowrap'
  ].join(';') + ';';

  btn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10 4L6 8l4 4"/></svg>' +
    'Back to ' + (ROLE_LABEL[s.role] || 'Dashboard');

  btn.addEventListener('mouseenter', function () {
    btn.style.transform = 'translateY(-3px)';
    btn.style.boxShadow = '0 8px 28px rgba(0,0,0,0.40)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.transform = '';
    btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.30)';
  });

  if (document.body) {
    document.body.appendChild(btn);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(btn);
    });
  }
})();
