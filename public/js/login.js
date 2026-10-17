/**
 * login.js - Login page logic for login.html
 */

import {
  CONFIG,
  MOCK_USERS,
  ROLE_HOME,
  renderFooter,
  initPublicMenuToggle,
  findUserByEmail,
  setSession,
  validateRequired,
  validateEmail,
  showError,
  clearError,
} from '../public/js/common.js';

document.addEventListener('DOMContentLoaded', () => {
  renderFooter();
  initPublicMenuToggle();

  // -- DEV_MODE hint ---------------------------------------------------------
  const devHint = document.getElementById('dev-hint');
  if (CONFIG.DEV_MODE && devHint) {
    let html = '<strong>Test accounts (dev only)</strong>';
    MOCK_USERS.forEach((u) => {
      html += `<p class="dev-hint-account">${u.email} / ${u.password} (${u.role})</p>`;
    });
    devHint.innerHTML = html;
    devHint.classList.add('is-visible');
  }

  const form         = document.getElementById('login-form');
  const emailInput   = document.getElementById('login-email');
  const emailError   = document.getElementById('login-email-error');
  const passInput    = document.getElementById('login-password');
  const passError    = document.getElementById('login-password-error');
  const rememberChk  = document.getElementById('login-remember');
  const summaryAlert = document.getElementById('login-summary-error');
  const submitBtn    = document.getElementById('login-submit');

  if (!form) return;

  emailInput.addEventListener('blur', () => {
    const r = validateRequired(emailInput.value, 'Email');
    if (r) { showError(emailInput, emailError, r); return; }
    const f = validateEmail(emailInput.value);
    if (f)  { showError(emailInput, emailError, f); return; }
    clearError(emailInput, emailError);
  });

  passInput.addEventListener('blur', () => {
    const err = validateRequired(passInput.value, 'Password');
    if (err) showError(passInput, passError, err);
    else     clearError(passInput, passError);
  });

  [emailInput, passInput].forEach((el) => {
    el.addEventListener('input', () => {
      summaryAlert.classList.remove('is-visible');
      summaryAlert.textContent = '';
    });
  });

  // Password show/hide
  const passToggle = document.getElementById('login-pass-toggle');
  if (passToggle) {
    passToggle.addEventListener('click', () => {
      const isHidden = passInput.type === 'password';
      passInput.type = isHidden ? 'text' : 'password';
      passToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      passToggle.querySelector('.icon-eye').classList.toggle('visually-hidden', isHidden);
      passToggle.querySelector('.icon-eye-off').classList.toggle('visually-hidden', !isHidden);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError(emailInput, emailError);
    clearError(passInput, passError);
    summaryAlert.classList.remove('is-visible');
    summaryAlert.textContent = '';

    let hasError = false;
    const r1 = validateRequired(emailInput.value, 'Email');
    if (r1) { showError(emailInput, emailError, r1); hasError = true; }
    else {
      const f = validateEmail(emailInput.value);
      if (f) { showError(emailInput, emailError, f); hasError = true; }
    }
    const r2 = validateRequired(passInput.value, 'Password');
    if (r2) { showError(passInput, passError, r2); hasError = true; }
    if (hasError) return;

    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('aria-disabled', 'true');

    setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.removeAttribute('aria-disabled');

      const user = findUserByEmail(emailInput.value);
      if (!user || user.password !== passInput.value) {
        summaryAlert.textContent = 'Incorrect email or password. Please try again.';
        summaryAlert.classList.add('is-visible');
        passInput.value = '';
        passInput.focus();
        return;
      }

      setSession(user);
      if (rememberChk?.checked) {
        try { localStorage.setItem('campusone_remembered_email', user.email); } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem('campusone_remembered_email'); } catch { /* ignore */ }
      }

      window.location.replace(ROLE_HOME[user.role] || 'home.html');
    }, 300);
  });

  // Pre-fill remembered email
  try {
    const rem = localStorage.getItem('campusone_remembered_email');
    if (rem && emailInput) { emailInput.value = rem; if (rememberChk) rememberChk.checked = true; }
  } catch { /* ignore */ }
});
