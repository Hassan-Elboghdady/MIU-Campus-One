/**
 * landing.js - Script for index.html
 */

import { ROLE_HOME, getUser, renderFooter, initPublicMenuToggle } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  renderFooter();
  initPublicMenuToggle();

  const homeLinks = [
    document.getElementById('header-login-btn'),
    document.getElementById('hero-login-btn'),
    document.getElementById('cta-login-btn'),
  ];
  const registerLinks = [
    document.getElementById('header-register-btn'),
    document.getElementById('hero-register-btn'),
  ];

  function updateAuthLinks() {
    const user = getUser();
    const home = user ? (ROLE_HOME[user.role] || 'home.html') : null;

    homeLinks.forEach((link) => {
      if (!link) return;
      link.href = home || 'login.html';
      if (home) link.textContent = 'Go to Home';
    });
    registerLinks.forEach((link) => {
      if (link) link.hidden = Boolean(home);
    });
  }

  updateAuthLinks();
  window.addEventListener('storage', (event) => {
    if (event.key === 'campusone_session') updateAuthLinks();
  });
});
