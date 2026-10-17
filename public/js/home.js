/**
 * home.js
 * Student home page: login guard, greeting, search bar,
 * four essentials cards, recent reports list (3 newest).
 */

import { requireLogin, ROLE_HOME, renderFooter, clearSession } from './common.js';
import { renderStatusBadge }           from './student-nav.js';
import { getMyReports }                           from './reports-service.js';

// --------------------------------------------------------------------------
// Role guard
// --------------------------------------------------------------------------
const user = requireLogin();
if (user && user.role !== 'student') {
  window.location.replace(ROLE_HOME[user.role] || 'login.html');
}

// --------------------------------------------------------------------------
// Four Essentials (matches design image)
// --------------------------------------------------------------------------
const ESSENTIALS = [
  {
    id:    'essential-map',
    href:  'map.html',
    title: 'Campus Map',
    desc:  'Find buildings, classrooms, and the best way to your next stop.',
    icon:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>`,
  },
  {
    id:    'essential-emergency',
    href:  'emergency.html',
    title: 'Emergency Map',
    desc:  'Locate emergency exits, first-aid points, and safe assembly areas.',
    icon:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="1.5" fill="currentColor"/></svg>`,
  },
  {
    id:    'essential-maintenance',
    href:  'my-reports.html',
    title: 'Maintenance',
    desc:  'Report a campus issue and keep track of your request.',
    icon:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  },
  {
    id:    'essential-lost-found',
    href:  'lost-found.html',
    title: 'AI Lost & Found',
    desc:  'Find what’s missing with smart matches for lost and found items.',
    icon:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="9" x2="12" y2="15"/></svg>`,
  },
];

const ARROW_ICON = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 7h9M7 3l4 4-4 4"/></svg>`;

// --------------------------------------------------------------------------
// Date formatter
// --------------------------------------------------------------------------
function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// --------------------------------------------------------------------------
// Render greeting badge in hero
// --------------------------------------------------------------------------
function renderGreeting(container, name) {
  const hour = new Date().getHours();
  let timeGreet = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreet = 'Good afternoon';
  else if (hour >= 17)         timeGreet = 'Good evening';

  container.textContent = `${timeGreet}, ${name} 👋`;
}

// --------------------------------------------------------------------------
// Render Four Essentials Cards
// --------------------------------------------------------------------------
function renderQuickActions(container) {
  container.innerHTML = '';
  ESSENTIALS.forEach((action) => {
    const a = document.createElement('a');
    a.href      = action.href;
    a.className = 'essential-card';
    a.id        = action.id;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'essential-card__icon';
    iconWrap.innerHTML = action.icon; // safe: controlled constant

    const title = document.createElement('span');
    title.className   = 'essential-card__title';
    title.textContent = action.title;

    const desc = document.createElement('span');
    desc.className   = 'essential-card__desc';
    desc.textContent = action.desc;

    const link = document.createElement('span');
    link.className = 'essential-card__link';
    link.innerHTML = `Explore ${ARROW_ICON}`; // safe: controlled constant

    a.append(iconWrap, title, desc, link);
    container.appendChild(a);
  });
}

// --------------------------------------------------------------------------
// Build a single report card element
// --------------------------------------------------------------------------
function buildReportCard(report) {
  const a = document.createElement('a');
  a.href           = `my-reports.html?id=${encodeURIComponent(report.id)}`;
  a.className      = 'report-card';
  a.dataset.status = report.status;
  a.id             = `recent-report-${report.id}`;

  const header = document.createElement('div');
  header.className = 'report-card__header';

  const titleEl = document.createElement('span');
  titleEl.className   = 'report-card__title';
  titleEl.textContent = report.title;

  const badgeWrap = document.createElement('span');
  badgeWrap.innerHTML = renderStatusBadge(report.status); // safe: controlled values

  header.append(titleEl, badgeWrap);

  const meta = document.createElement('div');
  meta.className = 'report-card__meta';

  const mkItem = (svgHtml, text) => {
    const s = document.createElement('span');
    s.className = 'report-card__meta-item';
    const icon = document.createElement('span');
    icon.innerHTML = svgHtml; // safe: controlled constant
    const txt = document.createElement('span');
    txt.textContent = text;
    s.append(icon, txt);
    return s;
  };

  const idSvg  = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="1" y="2" width="11" height="9" rx="1"/><line x1="4" y1="5" x2="9" y2="5"/><line x1="4" y1="7.5" x2="7" y2="7.5"/></svg>`;
  const locSvg = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="6.5" cy="5.5" r="2"/><path d="M6.5 1C4.01 1 2 3.01 2 5.5c0 3.75 4.5 6.5 4.5 6.5S11 9.25 11 5.5C11 3.01 8.99 1 6.5 1z"/></svg>`;
  const calSvg = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="1" y="2" width="11" height="10" rx="1"/><line x1="1" y1="5" x2="12" y2="5"/><line x1="4" y1="1" x2="4" y2="3"/><line x1="9" y1="1" x2="9" y2="3"/></svg>`;

  meta.append(
    mkItem(idSvg,  report.id),
    mkItem(locSvg, `${report.building} - ${report.room}`),
    mkItem(calSvg, formatDate(report.createdAt)),
  );

  a.append(header, meta);
  return a;
}

// --------------------------------------------------------------------------
// Render recent reports section
// --------------------------------------------------------------------------
async function renderRecentReports(container) {
  // Loading skeletons
  const skList = document.createElement('div');
  skList.className = 'recent-reports-list';
  for (let i = 0; i < 2; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton-card';
    sk.setAttribute('aria-hidden', 'true');
    const l1 = document.createElement('span');
    l1.className = 'skeleton-line skeleton-line--wide';
    const l2 = document.createElement('span');
    l2.className = 'skeleton-line skeleton-line--mid';
    sk.append(l1, l2);
    skList.appendChild(sk);
  }
  container.appendChild(skList);

  let reports;
  try {
    reports = await getMyReports();
  } catch {
    skList.remove();
    const err = document.createElement('p');
    err.className   = 'empty-state__text';
    err.textContent = 'Could not load your reports.';
    container.appendChild(err);
    return;
  }

  skList.remove();

  const recent = reports.slice(0, 3);

  if (recent.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'empty-state__icon';
    iconDiv.innerHTML = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="8" y="6" width="32" height="36" rx="2"/><line x1="16" y1="18" x2="32" y2="18"/><line x1="16" y1="24" x2="32" y2="24"/><line x1="16" y1="30" x2="24" y2="30"/></svg>`;

    const emptyTitle = document.createElement('p');
    emptyTitle.className   = 'empty-state__title';
    emptyTitle.textContent = 'No reports yet';

    const emptyText = document.createElement('p');
    emptyText.className   = 'empty-state__text';
    emptyText.textContent = 'You have not submitted any maintenance reports. Use the button below to report a problem.';

    const link = document.createElement('a');
    link.href      = 'report.html';
    link.className = 'btn btn-primary';
    link.id        = 'home-report-btn';
    link.textContent = 'Report an issue';

    emptyDiv.append(iconDiv, emptyTitle, emptyText, link);
    container.appendChild(emptyDiv);
    return;
  }

  const newList = document.createElement('div');
  newList.className = 'recent-reports-list';
  recent.forEach((report) => newList.appendChild(buildReportCard(report)));
  container.appendChild(newList);
}

// --------------------------------------------------------------------------
// Setup search form
// --------------------------------------------------------------------------
function setupSearch() {
  const form  = document.getElementById('portal-search-form');
  const input = document.getElementById('portal-search-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    const q = input.value.trim();
    if (!q) {
      e.preventDefault();
      input.focus();
    }
  });
}

// --------------------------------------------------------------------------
// Boot
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderFooter();

  // Fill user info into static nav elements
  if (user) {
    const initials = user.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const initialsEl = document.getElementById('nav-initials');
    const nameEl     = document.getElementById('nav-user-name');
    const emailEl    = document.getElementById('nav-user-email');
    if (initialsEl) initialsEl.textContent = initials;
    if (nameEl)     nameEl.textContent     = user.name;
    if (emailEl)    emailEl.textContent    = user.email;
  }

  // Wire dropdowns
  initDropdown('notif-trigger', 'notif-panel');
  initDropdown('profile-trigger', 'profile-panel');

  // Mobile hamburger
  const toggle = document.getElementById('app-menu-toggle');
  const nav    = document.getElementById('app-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.replace('login.html');
    });
  }

  // Close dropdowns on outside click
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

  const greetEl   = document.getElementById('portal-hero-greeting');
  const actionsEl = document.getElementById('quick-actions-grid');
  const recentEl  = document.getElementById('recent-reports-list');

  if (greetEl && user) renderGreeting(greetEl, user.name);
  if (actionsEl)       renderQuickActions(actionsEl);
  if (recentEl)        renderRecentReports(recentEl);

  setupSearch();
});

function initDropdown(triggerId, panelId) {
  const trigger = document.getElementById(triggerId);
  const panel   = document.getElementById(panelId);
  if (!trigger || !panel) return;
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });
}
