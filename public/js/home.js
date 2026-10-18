/**
 * home.js - Student home page logic
 */
import { requireLogin, ROLE_HOME, renderFooter, clearSession } from './common.js';
import { renderStatusBadge } from './student-nav.js';
import { getMyReports } from './reports-service.js';

const user = requireLogin();
if (user && user.role !== 'student') {
  window.location.replace(ROLE_HOME[user.role] || 'login.html');
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

function renderGreeting(el, name) {
  const h = new Date().getHours();
  const timeGreet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  el.textContent = `${timeGreet}, ${name} 👋`;
}

function initDropdown(tid, pid) {
  const t = document.getElementById(tid), p = document.getElementById(pid);
  if (!t || !p) return;
  t.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = p.classList.toggle('is-open');
    t.setAttribute('aria-expanded', String(open));
    ['notif-panel', 'profile-panel'].forEach(id => {
      if (id !== pid) { const o = document.getElementById(id); if (o) o.classList.remove('is-open'); }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderFooter();

  if (user) {
    const initials = user.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const el = id => document.getElementById(id);
    if (el('nav-initials'))   el('nav-initials').textContent = initials;
    if (el('nav-user-name'))  el('nav-user-name').textContent = user.name;
    if (el('nav-user-email')) el('nav-user-email').textContent = user.email;
    const greetEl = el('portal-hero-greeting');
    if (greetEl) renderGreeting(greetEl, user.name);
  }

  initDropdown('notif-trigger', 'notif-panel');
  initDropdown('profile-trigger', 'profile-panel');

  document.addEventListener('click', () => {
    ['notif-panel', 'profile-panel'].forEach(id => {
      const p = document.getElementById(id);
      if (p) p.classList.remove('is-open');
    });
    ['notif-trigger', 'profile-trigger'].forEach(id => {
      const t = document.getElementById(id);
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.replace('login.html');
    });
  }

  const toggle = document.getElementById('app-menu-toggle');
  const nav = document.getElementById('app-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const searchForm  = document.getElementById('portal-search-form');
  const searchInput = document.getElementById('portal-search-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      if (!searchInput.value.trim()) { e.preventDefault(); searchInput.focus(); }
    });
  }
});
