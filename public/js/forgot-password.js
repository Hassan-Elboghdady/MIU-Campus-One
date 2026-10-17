/**
 * forgot-password.js - Forgot password logic for forgot-password.html
 *
 * Step 1: Email field - shows a generic confirmation that does not
 *         reveal whether the email exists in the system.
 *
 * Step 2: Shown when URL contains ?step=reset (UI placeholder only).
 *         NOTE: In production the real reset link with a signed token
 *         will come from the backend. Replace this entire flow.
 */

import {
  renderFooter,
  initPublicMenuToggle,
  validateRequired,
  validateEmail,
  validatePasswordLength,
  validateMatch,
  showError,
  clearError,
} from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  renderFooter();
  initPublicMenuToggle();

  const params      = new URLSearchParams(window.location.search);
  const isResetStep = params.get('step') === 'reset';

  const step1 = document.getElementById('step-request');
  const step2 = document.getElementById('step-reset');
  if (!step1 || !step2) return;

  // Step 1 is is-active by default in HTML.
  // Only swap if the URL says ?step=reset.
  if (isResetStep) {
    step1.classList.remove('is-active');
    step2.classList.add('is-active');
    initResetStep();
  } else {
    // Step 1 already visible, just wire up the form
    initRequestStep();
  }

  // --------------------------------------------------------------------------
  // Step 1
  // --------------------------------------------------------------------------
  function initRequestStep() {
    const form       = document.getElementById('forgot-form');
    const emailInput = document.getElementById('forgot-email');
    const emailError = document.getElementById('forgot-email-error');
    const confirmEl  = document.getElementById('forgot-confirm');
    const submitBtn  = document.getElementById('forgot-submit');
    if (!form) return;

    emailInput.addEventListener('blur', () => {
      const r = validateRequired(emailInput.value, 'Email');
      if (r) { showError(emailInput, emailError, r); return; }
      const f = validateEmail(emailInput.value);
      if (f)  { showError(emailInput, emailError, f); }
      else    { clearError(emailInput, emailError); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearError(emailInput, emailError);
      const r = validateRequired(emailInput.value, 'Email');
      if (r) { showError(emailInput, emailError, r); return; }
      const f = validateEmail(emailInput.value);
      if (f) { showError(emailInput, emailError, f); return; }

      submitBtn.classList.add('is-loading');
      submitBtn.setAttribute('aria-disabled', 'true');

      // Do NOT reveal whether the email exists in the system.
      setTimeout(() => {
        submitBtn.classList.remove('is-loading');
        submitBtn.removeAttribute('aria-disabled');
        form.classList.add('visually-hidden');
        if (confirmEl) confirmEl.classList.add('is-active');
      }, 450);
    });
  }

  // --------------------------------------------------------------------------
  // Step 2
  // NOTE: In production, POST the new password + signed token to the backend.
  // --------------------------------------------------------------------------
  function initResetStep() {
    const form         = document.getElementById('reset-form');
    const passInput    = document.getElementById('reset-password');
    const passError    = document.getElementById('reset-password-error');
    const confirmInput = document.getElementById('reset-confirm-password');
    const confirmError = document.getElementById('reset-confirm-error');
    const successEl    = document.getElementById('reset-success');
    const submitBtn    = document.getElementById('reset-submit');
    if (!form) return;

    setupPasswordToggle('reset-pass-toggle', passInput);
    setupPasswordToggle('reset-confirm-toggle', confirmInput);

    passInput.addEventListener('blur', () => {
      const r = validateRequired(passInput.value, 'New password');
      if (r) { showError(passInput, passError, r); return; }
      const l = validatePasswordLength(passInput.value);
      if (l)  { showError(passInput, passError, l); }
      else    { clearError(passInput, passError); }
    });

    confirmInput.addEventListener('blur', () => {
      const r = validateRequired(confirmInput.value, 'Confirm password');
      if (r) { showError(confirmInput, confirmError, r); return; }
      const m = validateMatch(passInput.value, confirmInput.value);
      if (m)  { showError(confirmInput, confirmError, m); }
      else    { clearError(confirmInput, confirmError); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearError(passInput, passError);
      clearError(confirmInput, confirmError);
      let hasError = false;

      const r1 = validateRequired(passInput.value, 'New password');
      if (r1) { showError(passInput, passError, r1); hasError = true; }
      else {
        const l = validatePasswordLength(passInput.value);
        if (l) { showError(passInput, passError, l); hasError = true; }
      }

      const r2 = validateRequired(confirmInput.value, 'Confirm password');
      if (r2) { showError(confirmInput, confirmError, r2); hasError = true; }
      else if (!hasError) {
        const m = validateMatch(passInput.value, confirmInput.value);
        if (m) { showError(confirmInput, confirmError, m); hasError = true; }
      }

      if (hasError) return;

      submitBtn.classList.add('is-loading');
      submitBtn.setAttribute('aria-disabled', 'true');

      setTimeout(() => {
        submitBtn.classList.remove('is-loading');
        submitBtn.removeAttribute('aria-disabled');
        form.classList.add('visually-hidden');
        if (successEl) successEl.classList.add('is-active');
      }, 450);
    });
  }

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
});
