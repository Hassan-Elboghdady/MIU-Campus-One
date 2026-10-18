/**
 * student-nav.js
 * Renders the authenticated app navbar on all three student pages.
 * Uses class names from profile.css (app-header, app-nav, dropdown, etc.).
 * Also exports renderStatusBadge(status).
 */

import { getUser, clearSession, ROLE_HOME } from './common.js';
import { STATUSES } from './reports-service.js';

// --------------------------------------------------------------------------
// SVG icons (inline, 1.75px stroke, currentColor)
// --------------------------------------------------------------------------
const ICONS = {
  home:      `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 8L9 2l7 6v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8z"/><path d="M6 17V9h6v8"/></svg>`,
  map:       `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3"/><path d="M9 1C5.13 1 2 4.13 2 8c0 5.5 7 10 7 10s7-4.5 7-10c0-3.87-3.13-7-7-7z"/></svg>`,
  reports:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="2" width="12" height="14" rx="1"/><line x1="6" y1="6" x2="12" y2="6"/><line x1="6" y1="9" x2="12" y2="9"/><line x1="6" y1="12" x2="9" y2="12"/></svg>`,
  lostFound: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6"/><line x1="13" y1="13" x2="17" y2="17"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/></svg>`,
  bell:      `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 2a5 5 0 0 1 5 5v3l1.5 2.5H2.5L4 10V7a5 5 0 0 1 5-5z"/><path d="M7 15a2 2 0 0 0 4 0"/></svg>`,
  profile:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>`,
  logout:    `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 3H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4"/><path d="M11 12l4-3-4-3"/><line x1="7" y1="9" x2="15" y2="9"/></svg>`,
  emergency: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 1.5L1 14.5h14L8 1.5z"/><line x1="8" y1="7" x2="8" y2="10"/><circle cx="8" cy="12" r=".6" fill="currentColor" stroke="none"/></svg>`,
  menu:      `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" focusable="false"><line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  chevronDown: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 5l4 4 4-4"/></svg>`,
};

// --------------------------------------------------------------------------
// Get initials for avatar
// --------------------------------------------------------------------------
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// --------------------------------------------------------------------------
// Detect current page file name
// --------------------------------------------------------------------------
function getCurrentPage() {
  return window.location.pathname.split('/').pop() || '';
}

// --------------------------------------------------------------------------
// renderNav
// --------------------------------------------------------------------------
export function renderNav() {
  const headerEl = document.querySelector('header');
  if (!headerEl) return;

  const user        = getUser();
  const currentPage = getCurrentPage();

  const navLinks = [
    { href: 'map.html',        label: 'Campus Map',     file: 'map.html'        },
    { href: 'emergency.html',  label: 'Emergency Map',  file: 'emergency.html'  },
    { href: 'my-reports.html', label: 'My Reports',     file: 'my-reports.html' },
    { href: 'lost-found.html', label: 'Lost & Found',   file: 'lost-found.html' },
  ];

  const initials = getInitials(user ? user.name : '');

  headerEl.className = 'app-header';
  headerEl.innerHTML = `
    <div class="container">
      <a href="home.html" class="app-header__logo" aria-label="CampusOne home">
        <img src="../public/images/logo.png" alt="Misr International University logo" width="36" height="36">
        <div class="app-header__logo-text">
          <span class="app-header__logo-abbr">MIU</span>
          <span class="app-header__logo-sub">Misr International University</span>
        </div>
        <span class="app-header__logo-divider" aria-hidden="true"></span>
        <span class="app-header__logo-brand">CampusOne</span>
      </a>

      <nav class="app-nav" id="app-nav" aria-label="Main navigation">
        ${navLinks.map((link) => `
          <a
            href="${link.href}"
            class="app-nav__link"
            ${currentPage === link.file ? 'aria-current="page"' : ''}
          >${link.label}</a>
        `).join('')}
        <a
          href="report.html"
          class="app-nav__link app-nav__link--mobile-only"
          ${currentPage === 'report.html' ? 'aria-current="page"' : ''}
        >Report an Issue</a>
      </nav>

      <div class="app-header__actions">
        <!-- Quick button: Report issue -->
        <a
          href="report.html"
          class="nav-report-btn"
          id="header-report-btn"
          aria-label="Report an issue"
          ${currentPage === 'report.html' ? 'aria-current="page"' : ''}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <line x1="8" y1="3" x2="8" y2="13"/>
            <line x1="3" y1="8" x2="13" y2="8"/>
          </svg>
          <span>Report issue</span>
        </a>

        <!-- Notifications -->
        <div class="dropdown" id="notif-dropdown">
          <button
            type="button"
            class="dropdown__trigger"
            id="notif-trigger"
            aria-haspopup="true"
            aria-expanded="false"
            aria-controls="notif-panel"
            aria-label="Notifications"
          >${ICONS.bell}</button>
          <div class="dropdown__panel" id="notif-panel" role="menu" aria-labelledby="notif-trigger">
            <div class="dropdown__header">Notifications</div>
            <div class="dropdown__empty">No new notifications</div>
          </div>
        </div>

        <!-- Profile -->
        <div class="dropdown" id="profile-dropdown">
          <button
            type="button"
            class="dropdown__trigger profile-trigger"
            id="profile-trigger"
            aria-haspopup="true"
            aria-expanded="false"
            aria-controls="profile-panel"
            aria-label="Account menu"
          >
            <span class="profile-trigger__avatar" aria-hidden="true">
              <span class="avatar-initials">${initials}</span>
            </span>
            <span class="profile-trigger__name">${user ? user.name : ''}</span>
            ${ICONS.chevronDown}
          </button>
          <div class="dropdown__panel" id="profile-panel" role="menu" aria-labelledby="profile-trigger">
            <div class="dropdown__header">${user ? user.email : ''}</div>
            <a href="profile.html" class="dropdown__item" role="menuitem">
              ${ICONS.profile}
              Profile
            </a>
            <a href="my-reports.html" class="dropdown__item" role="menuitem">
              ${ICONS.reports}
              My Reports
            </a>
            <div class="dropdown__divider" role="separator"></div>
            <button type="button" class="dropdown__item dropdown__item--danger" id="logout-btn" role="menuitem">
              ${ICONS.logout}
              Log out
            </button>
          </div>
        </div>

        <!-- Mobile toggle -->
        <button
          type="button"
          class="app-menu-toggle"
          id="app-menu-toggle"
          aria-label="Open navigation menu"
          aria-expanded="false"
          aria-controls="app-nav"
        >${ICONS.menu}</button>

      </div>
    </div>

    <a href="emergency.html" class="emergency-btn" id="emergency-btn" aria-label="Emergency map">
      ${ICONS.emergency}
      <span class="emergency-label">Emergency</span>
    </a>
  `;

  if (window.CampusOneAvatar) window.CampusOneAvatar.render(user);

  // Dropdowns
  initDropdown('notif-trigger', 'notif-panel');
  initDropdown('profile-trigger', 'profile-panel');

  // Mobile nav
  const toggle = document.getElementById('app-menu-toggle');
  const nav    = document.getElementById('app-nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('.app-nav__link')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.replace('login.html');
  });

  // Outside click closes dropdowns
  document.addEventListener('click', (e) => {
    ['notif-dropdown', 'profile-dropdown'].forEach((id) => {
      const wrap = document.getElementById(id);
      if (wrap && !wrap.contains(e.target)) {
        const panel   = wrap.querySelector('.dropdown__panel');
        const trigger = wrap.querySelector('.dropdown__trigger');
        if (panel)   panel.classList.remove('is-open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ['notif-dropdown', 'profile-dropdown'].forEach((id) => {
      const wrap = document.getElementById(id);
      if (!wrap) return;
      const panel   = wrap.querySelector('.dropdown__panel');
      const trigger = wrap.querySelector('.dropdown__trigger');
      if (panel && panel.classList.contains('is-open')) {
        panel.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });
    if (nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}

// --------------------------------------------------------------------------
// Dropdown toggle
// --------------------------------------------------------------------------
function initDropdown(triggerId, panelId) {
  const trigger = document.getElementById(triggerId);
  const panel   = document.getElementById(panelId);
  if (!trigger || !panel) return;
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    // Close other
    ['notif-dropdown', 'profile-dropdown'].forEach((id) => {
      const wrap = document.getElementById(id);
      if (!wrap || wrap.contains(trigger)) return;
      const p = wrap.querySelector('.dropdown__panel');
      const t = wrap.querySelector('.dropdown__trigger');
      if (p) p.classList.remove('is-open');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });
}

// --------------------------------------------------------------------------
// Status badge icons (controlled values only)
// --------------------------------------------------------------------------
const STATUS_ICONS = {
  [STATUSES.SUBMITTED]:   `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5"/><line x1="6" y1="4" x2="6" y2="6.5"/><circle cx="6" cy="8" r=".5" fill="currentColor" stroke="none"/></svg>`,
  [STATUSES.ASSIGNED]:    `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="4" r="2"/><path d="M2 11c0-2.21 1.79-4 4-4s4 1.79 4 4"/></svg>`,
  [STATUSES.IN_PROGRESS]: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1"/></svg>`,
  [STATUSES.RESOLVED]:    `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5"/><path d="M3.5 6l2 2 3-3"/></svg>`,
};

const STATUS_LABELS = {
  [STATUSES.SUBMITTED]:   'Submitted',
  [STATUSES.ASSIGNED]:    'Assigned',
  [STATUSES.IN_PROGRESS]: 'In progress',
  [STATUSES.RESOLVED]:    'Resolved',
};

/**
 * Returns a safe HTML string for a status badge.
 * Contains only controlled enum-based values, no user input.
 * @param {string} status
 * @returns {string}
 */
export function renderStatusBadge(status) {
  const icon  = STATUS_ICONS[status] || '';
  const label = STATUS_LABELS[status] || status;
  return `<span class="status-badge status-badge--${status}">${icon}${label}</span>`;
}
