/**
 * common.js - Shared utilities for CampusOne
 *
 * WARNING: This auth is NOT real security.
 * It stores data only in the browser (localStorage) so the UX can be
 * developed and tested before a real backend exists.
 * All session logic MUST be replaced by server-side auth before any
 * public or production launch. Never place real passwords in code.
 */

// --------------------------------------------------------------------------
// CONFIG
// --------------------------------------------------------------------------
export const CONFIG = Object.freeze({
  siteName:   'CampusOne',
  university: 'Misr International University',
  contactEmail: '[TEAM TO CONFIRM]',
  emergencyNumbers: {
    police:         '122',
    ambulance:      '123',
    fire:           '180',
    campusSecurity: '[TEAM TO CONFIRM]',
  },
  /** Set to true during development to show test-account hints on the login page. */
  DEV_MODE: true,
});

// --------------------------------------------------------------------------
// MOCK USERS - local dev only. Never use real passwords.
// --------------------------------------------------------------------------
/** @type {MockUser[]} */
export const MOCK_USERS = [
  /* MOCK DATA - replace with real server auth before launch */
  { id: 'u1', name: 'Ahmed Nasser',      email: 'student@miuegypt.edu.eg',      password: 'student123',  role: 'student',          studentId: '2022-00001', faculty: 'Engineering' },
  { id: 'u2', name: 'Sara Mahmoud',      email: 'supervisor@miuegypt.edu.eg',   password: 'super123',    role: 'supervisor',       studentId: null,           faculty: null },
  { id: 'u3', name: 'Omar Khaled',       email: 'tech@miuegypt.edu.eg',         password: 'tech123',     role: 'technician',       studentId: null,           faculty: null },
  { id: 'u4', name: 'Nour El-Din Fawzy', email: 'lostandfound@miuegypt.edu.eg', password: 'lf123',       role: 'lost-found-staff', studentId: null,           faculty: null },
  { id: 'u5', name: 'Admin User',        email: 'admin@miuegypt.edu.eg',        password: 'admin123',    role: 'admin',            studentId: null,           faculty: null },
  { id: 'u6', name: 'Ahmed Hassan',      email: 'a.hassan@miu.edu.eg',          password: 'staff123',    role: 'staff',            studentId: null,           faculty: null },
  { id: 'u7', name: 'Mohamed Salah',     email: 'm.salah@miu.edu.eg',           password: 'staff123',    role: 'staff',            studentId: null,           faculty: null },
  { id: 'u8', name: 'Khaled Ibrahim',    email: 'k.ibrahim@miu.edu.eg',         password: 'staff123',    role: 'staff',            studentId: null,           faculty: null },
  { id: 'u9', name: 'Manager One',       email: 'manager@miuegypt.edu.eg',      password: 'manager123',  role: 'manager',          studentId: null,           faculty: null },
  { id: 'u13', name: 'Lost & Found Manager', email: 'manager.lostfound@miuegypt.edu.eg', password: 'lostfound2026', role: 'lost-found-manager', studentId: null, faculty: null },
];

// --------------------------------------------------------------------------
// Role-to-page redirect map
// --------------------------------------------------------------------------
export const ROLE_HOME = Object.freeze({
  'student':          'home.html',
  'supervisor':       'manager-dashboard.html',
  'manager':          'manager-dashboard.html',
  'technician':       'staff-dashboard.html',
  'staff':            'staff-dashboard.html',
  'lost-found-staff': 'staff-lost-found.html',
  'admin':            'admin-panel.html',
  'lost-found-manager': 'maneger-lost-found.html',
});

// --------------------------------------------------------------------------
// Safe localStorage wrapper
// --------------------------------------------------------------------------
const storage = {
  get(key)  { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

// --------------------------------------------------------------------------
// Session management
// --------------------------------------------------------------------------
const SESSION_KEY = 'campusone_session';

export function getUser()        { return storage.get(SESSION_KEY); }
export function setSession(user) { const { password: _pw, ...safe } = user; storage.set(SESSION_KEY, safe); }
export function clearSession()   { storage.remove(SESSION_KEY); }

export function requireLogin() {
  const user = getUser();
  if (!user) window.location.replace('login.html');
  return user;
}

// --------------------------------------------------------------------------
// findUserByEmail - checks mock accounts + localStorage-registered accounts
// --------------------------------------------------------------------------
const REGISTERED_KEY = 'campusone_registered_users';

export function getRegisteredUsers() {
  return storage.get(REGISTERED_KEY) || [];
}

export function saveRegisteredUser(user) {
  const list = getRegisteredUsers();
  list.push(user);
  storage.set(REGISTERED_KEY, list);
}

export function findUserByEmail(email) {
  const lower = email.toLowerCase().trim();
  const mock = MOCK_USERS.find((u) => u.email.toLowerCase() === lower);
  if (mock) return mock;
  return getRegisteredUsers().find((u) => u.email.toLowerCase() === lower) || null;
}

// --------------------------------------------------------------------------
// Validation helpers
// --------------------------------------------------------------------------
export function validateRequired(value, label)          { return value.trim() === '' ? `${label} is required.` : ''; }
export function validateEmail(value)                    { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : 'Enter a valid email address.'; }
export function validatePasswordLength(value, min = 8) { return value.length >= min ? '' : `Password must be at least ${min} characters.`; }
export function validateMatch(a, b, label = 'Passwords'){ return a === b ? '' : `${label} do not match.`; }

// --------------------------------------------------------------------------
// Field error helpers
// --------------------------------------------------------------------------
export function showError(field, errorEl, message) {
  field.classList.add('is-error'); field.setAttribute('aria-invalid', 'true');
  errorEl.textContent = message; errorEl.classList.add('is-visible');
}
export function clearError(field, errorEl) {
  field.classList.remove('is-error'); field.removeAttribute('aria-invalid');
  errorEl.textContent = ''; errorEl.classList.remove('is-visible');
}

// --------------------------------------------------------------------------
// renderFooter
// --------------------------------------------------------------------------
export function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const year = new Date().getFullYear();
  const em   = CONFIG.contactEmail;
  const nums = CONFIG.emergencyNumbers;
  el.innerHTML = `
    <div class="container">
      <div class="footer-inner">
        <div>
          <div class="footer-brand">
            <img src="../public/images/logo.png" alt="${CONFIG.university} logo" loading="lazy">
            <span class="footer-brand-name">${CONFIG.siteName}</span>
          </div>
          <p class="footer-tagline">The campus web app for MIU students and staff. Find rooms, report problems, recover lost items.</p>
        </div>
        <div>
          <p class="footer-section-title">Navigate</p>
          <nav class="footer-links" aria-label="Footer navigation">
            <a href="index.html">Home</a>
            <a href="login.html">Login</a>
          </nav>
        </div>
        <div>
          <p class="footer-section-title">Legal</p>
          <nav class="footer-links" aria-label="Legal links">
            <a href="privacy.html">Privacy Policy</a>
            <a href="terms.html">Terms of Use</a>
          </nav>
        </div>
        <div>
          <p class="footer-section-title">Emergency</p>
          <div class="footer-links">
            <div class="footer-contact-item"><strong>Police:</strong> ${nums.police}</div>
            <div class="footer-contact-item"><strong>Ambulance:</strong> ${nums.ambulance}</div>
            <div class="footer-contact-item"><strong>Fire:</strong> ${nums.fire}</div>
            <div class="footer-contact-item"><strong>Security:</strong> ${nums.campusSecurity}</div>
            <div class="footer-contact-item"><strong>Email:</strong> ${em}</div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${year} ${CONFIG.university}. All rights reserved.</p>
      </div>
    </div>`;
}

// --------------------------------------------------------------------------
// Public header mobile menu toggle
// --------------------------------------------------------------------------
export function initPublicMenuToggle() {
  const toggle = document.getElementById('menu-toggle');
  const nav    = document.getElementById('header-nav');
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
