/**
 * landing.js - Script for index.html
 * Calls renderFooter() and initialises the public header mobile menu.
 * Kept minimal as specified.
 */

import { renderFooter, initPublicMenuToggle } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  renderFooter();
  initPublicMenuToggle();
});
