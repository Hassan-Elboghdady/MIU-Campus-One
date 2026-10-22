/**
 * profile.js - Profile page logic for profile.html
 */

import {
  ROLE_HOME,
  CONFIG,
  renderFooter,
  requireLogin,
  clearSession,
  validateRequired,
  validatePasswordLength,
  validateMatch,
  showError,
  clearError,
} from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  const user = requireLogin();
  if (!user) return;

  renderFooter();
  renderNav(user);
  renderProfileData(user);
  initDropdowns();
  initMobileMenu();
  initAvatarPreview();
  initChangePassword();
  initNotificationToggles();
  initLogout();
});

// --------------------------------------------------------------------------
// Role nav menus
// --------------------------------------------------------------------------
const ROLE_MENU = {
  'student':          [
    { label: 'Home',         href: 'home.html' },
    { label: 'Map',          href: 'map.html' },
    { label: 'Reports',      href: 'reports.html' },
    { label: 'Lost & Found', href: 'lost-found.html' },
  ],
  'supervisor':       [{ label: 'Dashboard', href: 'staff.html' }, { label: 'Team', href: 'team.html' }],
  'technician':       [{ label: 'My tasks', href: 'maintenance.html' }],
  'lost-found-staff': [{ label: 'Lost & Found manager', href: 'staff-lost-found.html' }],
  'admin':            [{ label: 'Dashboard', href: 'supervisor-dashboard.html' }, { label: 'Campus Map', href: 'map.html' }, { label: 'Team', href: 'maintenance-team.html' }, { label: 'My Tasks', href: 'my-tasks.html' }],
};

function renderNav(user) {
  const navEl = document.getElementById('app-nav');
  if (!navEl) return;

  const items = ROLE_MENU[user.role] || [];
  navEl.innerHTML = items.map((item) => {
    const isCurrent = window.location.pathname.endsWith(item.href);
    return `<a href="${item.href}" class="app-nav__link"${isCurrent ? ' aria-current="page"' : ''}>${item.label}</a>`;
  }).join('');

  const triggerName = document.getElementById('profile-trigger-name');
  if (triggerName) triggerName.textContent = user.name;
}

function renderProfileData(user) {
  setText('profile-name',    user.name);
  setText('profile-email',   user.email);
  setText('profile-id',      user.studentId || 'N/A');
  setText('profile-role',    formatRole(user.role));
  setText('profile-faculty', user.faculty || 'N/A');
  setText('avatar-name',     user.name);
  setText('avatar-email',    user.email);
  setText('avatar-role-badge', formatRole(user.role));
  setText('profile-trigger-name', user.name);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatRole(role) {
  const map = {
    'student': 'Student', 'supervisor': 'Maintenance Supervisor',
    'technician': 'Technician', 'lost-found-staff': 'Lost & Found Staff', 'admin': 'Admin',
  };
  return map[role] || role;
}

// --------------------------------------------------------------------------
// Dropdowns
// --------------------------------------------------------------------------
function initDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector('.dropdown__trigger');
    const panel   = dropdown.querySelector('.dropdown__panel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(isOpen));
      dropdowns.forEach((other) => {
        if (other !== dropdown) {
          other.querySelector('.dropdown__panel')?.classList.remove('is-open');
          other.querySelector('.dropdown__trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
    });
  });

  document.addEventListener('click', () => {
    dropdowns.forEach((d) => {
      d.querySelector('.dropdown__panel')?.classList.remove('is-open');
      d.querySelector('.dropdown__trigger')?.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdowns.forEach((d) => {
        d.querySelector('.dropdown__panel')?.classList.remove('is-open');
        d.querySelector('.dropdown__trigger')?.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

// --------------------------------------------------------------------------
// Mobile menu
// --------------------------------------------------------------------------
function initMobileMenu() {
  const toggle = document.getElementById('app-menu-toggle');
  const nav    = document.getElementById('app-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// --------------------------------------------------------------------------
// Avatar preview (client-side only, nothing is uploaded)
// --------------------------------------------------------------------------
function initAvatarPreview() {
  const fileInput = document.getElementById('avatar-file-input');
  const avatarImg = document.getElementById('avatar-img');
  const navAvatar = document.getElementById('nav-avatar-img');
  if (!fileInput || !avatarImg) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.addEventListener('load', (ev) => {
      avatarImg.src = ev.target.result;
      if (navAvatar) navAvatar.src = ev.target.result;
    });
    reader.readAsDataURL(file);
  });
}

// --------------------------------------------------------------------------
// Change password
// --------------------------------------------------------------------------
function initChangePassword() {
  const form         = document.getElementById('change-password-form');
  const currentInput = document.getElementById('cp-current');
  const currentError = document.getElementById('cp-current-error');
  const newInput     = document.getElementById('cp-new');
  const newError     = document.getElementById('cp-new-error');
  const confirmInput = document.getElementById('cp-confirm');
  const confirmError = document.getElementById('cp-confirm-error');
  const successAlert = document.getElementById('cp-success');
  const submitBtn    = document.getElementById('cp-submit');
  if (!form) return;

  setupPasswordToggle('cp-current-toggle', currentInput);
  setupPasswordToggle('cp-new-toggle',     newInput);
  setupPasswordToggle('cp-confirm-toggle', confirmInput);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    successAlert?.classList.remove('is-visible');
    clearError(currentInput, currentError);
    clearError(newInput, newError);
    clearError(confirmInput, confirmError);

    let hasError = false;
    const r1 = validateRequired(currentInput.value, 'Current password');
    if (r1) { showError(currentInput, currentError, r1); hasError = true; }

    const r2 = validateRequired(newInput.value, 'New password');
    if (r2) { showError(newInput, newError, r2); hasError = true; }
    else {
      const l = validatePasswordLength(newInput.value);
      if (l) { showError(newInput, newError, l); hasError = true; }
    }

    const r3 = validateRequired(confirmInput.value, 'Confirm password');
    if (r3) { showError(confirmInput, confirmError, r3); hasError = true; }
    else if (!hasError) {
      const m = validateMatch(newInput.value, confirmInput.value);
      if (m) { showError(confirmInput, confirmError, m); hasError = true; }
    }
    if (hasError) return;

    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('aria-disabled', 'true');
    setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.removeAttribute('aria-disabled');
      form.reset();
      successAlert?.classList.add('is-visible');
    }, 400);
  });
}

// --------------------------------------------------------------------------
// Notification toggles
// --------------------------------------------------------------------------
function initNotificationToggles() {
  const PREF_KEY = 'campusone_notif_prefs';
  let prefs;
  try { prefs = JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { prefs = {}; }

  document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach((chk) => {
    const id = chk.id;
    if (id in prefs) chk.checked = prefs[id];
    chk.addEventListener('change', () => {
      prefs[id] = chk.checked;
      try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    });
  });
}

// --------------------------------------------------------------------------
// Logout
// --------------------------------------------------------------------------
function initLogout() {
  document.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.replace('login.html');
    });
  });
}

// --------------------------------------------------------------------------
// Password show/hide helper
// --------------------------------------------------------------------------
function setupPasswordToggle(toggleId, input) {
  const btn = document.getElementById(toggleId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    btn.querySelector('.icon-eye')?.classList.toggle('visually-hidden', isHidden);
    btn.querySelector('.icon-eye-off')?.classList.toggle('visually-hidden', !isHidden);
  });
}
