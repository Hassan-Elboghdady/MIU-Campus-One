/**
 * register.js - Student account creation
 *
 * WARNING: This stores accounts in localStorage only.
 * Replace with real server-side auth before production.
 */

import {
  CONFIG,
  findUserByEmail,
  saveRegisteredUser,
  setSession,
  ROLE_HOME,
  validateRequired,
  validateEmail,
  validatePasswordLength,
  validateMatch,
  showError,
  clearError,
} from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  const form          = document.getElementById('register-form');
  const nameInput     = document.getElementById('reg-name');
  const nameError     = document.getElementById('reg-name-error');
  const emailInput    = document.getElementById('reg-email');
  const emailError    = document.getElementById('reg-email-error');
  const idInput       = document.getElementById('reg-student-id');
  const idError       = document.getElementById('reg-student-id-error');
  const facultySelect = document.getElementById('reg-faculty');
  const facultyError  = document.getElementById('reg-faculty-error');
  const passInput     = document.getElementById('reg-password');
  const passError     = document.getElementById('reg-password-error');
  const confirmInput  = document.getElementById('reg-confirm-password');
  const confirmError  = document.getElementById('reg-confirm-error');
  const summaryAlert  = document.getElementById('reg-summary-error');
  const submitBtn     = document.getElementById('reg-submit');

  if (!form) return;

  // ---- Real-time blur validation -------------------------------------------
  nameInput.addEventListener('blur', () => {
    const e = validateRequired(nameInput.value, 'Full name');
    e ? showError(nameInput, nameError, e) : clearError(nameInput, nameError);
  });

  emailInput.addEventListener('blur', () => {
    const r = validateRequired(emailInput.value, 'Email');
    if (r) { showError(emailInput, emailError, r); return; }
    const f = validateEmail(emailInput.value);
    if (f) { showError(emailInput, emailError, f); return; }
    clearError(emailInput, emailError);
  });

  idInput.addEventListener('blur', () => {
    const e = validateRequired(idInput.value, 'Student ID');
    e ? showError(idInput, idError, e) : clearError(idInput, idError);
  });

  facultySelect.addEventListener('change', () => {
    const e = validateRequired(facultySelect.value, 'Faculty');
    e ? showError(facultySelect, facultyError, e) : clearError(facultySelect, facultyError);
  });

  passInput.addEventListener('blur', () => {
    const r = validateRequired(passInput.value, 'Password');
    if (r) { showError(passInput, passError, r); return; }
    const l = validatePasswordLength(passInput.value);
    l ? showError(passInput, passError, l) : clearError(passInput, passError);
  });

  confirmInput.addEventListener('blur', () => {
    const r = validateRequired(confirmInput.value, 'Confirm password');
    if (r) { showError(confirmInput, confirmError, r); return; }
    const m = validateMatch(passInput.value, confirmInput.value);
    m ? showError(confirmInput, confirmError, m) : clearError(confirmInput, confirmError);
  });

  // Password show/hide
  setupToggle('reg-pass-toggle', passInput);
  setupToggle('reg-confirm-toggle', confirmInput);

  // Clear summary on any input
  [nameInput, emailInput, idInput, passInput, confirmInput].forEach((el) => {
    el.addEventListener('input', () => {
      summaryAlert.textContent = '';
      summaryAlert.classList.remove('is-visible');
    });
  });

  // ---- Submit ---------------------------------------------------------------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    summaryAlert.textContent = '';
    summaryAlert.classList.remove('is-visible');

    // Clear all
    [nameInput, emailInput, idInput, passInput, confirmInput].forEach((el) => {
      const errEl = document.getElementById(el.id + '-error') ||
                    document.getElementById(el.id.replace('reg-', 'reg-') + '-error');
      if (errEl) clearError(el, errEl);
    });
    clearError(facultySelect, facultyError);

    let hasError = false;

    const r1 = validateRequired(nameInput.value, 'Full name');
    if (r1) { showError(nameInput, nameError, r1); hasError = true; }

    const r2 = validateRequired(emailInput.value, 'Email');
    if (r2) { showError(emailInput, emailError, r2); hasError = true; }
    else {
      const f = validateEmail(emailInput.value);
      if (f) { showError(emailInput, emailError, f); hasError = true; }
    }

    const r3 = validateRequired(idInput.value, 'Student ID');
    if (r3) { showError(idInput, idError, r3); hasError = true; }

    const r4 = validateRequired(facultySelect.value, 'Faculty');
    if (r4) { showError(facultySelect, facultyError, r4); hasError = true; }

    const r5 = validateRequired(passInput.value, 'Password');
    if (r5) { showError(passInput, passError, r5); hasError = true; }
    else {
      const l = validatePasswordLength(passInput.value);
      if (l) { showError(passInput, passError, l); hasError = true; }
    }

    const r6 = validateRequired(confirmInput.value, 'Confirm password');
    if (r6) { showError(confirmInput, confirmError, r6); hasError = true; }
    else if (!hasError) {
      const m = validateMatch(passInput.value, confirmInput.value);
      if (m) { showError(confirmInput, confirmError, m); hasError = true; }
    }

    if (hasError) return;

    // Duplicate email check
    if (findUserByEmail(emailInput.value)) {
      showError(emailInput, emailError, 'An account with this email already exists.');
      emailInput.focus();
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.setAttribute('aria-disabled', 'true');

    setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.removeAttribute('aria-disabled');

      const newUser = {
        id:        'r_' + Date.now(),
        name:      nameInput.value.trim(),
        email:     emailInput.value.trim().toLowerCase(),
        password:  passInput.value,
        role:      'student',
        studentId: idInput.value.trim().toUpperCase(),
        faculty:   facultySelect.value,
      };

      saveRegisteredUser(newUser);
      setSession(newUser);
      window.location.replace(ROLE_HOME['student']);
    }, 400);
  });

  function setupToggle(btnId, input) {
    const btn = document.getElementById(btnId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      btn.querySelector('.icon-eye')?.classList.toggle('visually-hidden', show);
      btn.querySelector('.icon-eye-off')?.classList.toggle('visually-hidden', !show);
    });
  }
});
