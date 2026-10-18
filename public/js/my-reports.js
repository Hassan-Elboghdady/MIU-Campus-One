/**
 * my-reports.js - My reports list and details view
 */
import { requireLogin, ROLE_HOME, renderFooter } from './common.js';
import { renderNav, renderStatusBadge } from './student-nav.js';
import { getMyReports, getReportById } from './reports-service.js';

const user = requireLogin();
if (user && user.role !== 'student') {
  window.location.replace(ROLE_HOME[user.role] || 'login.html');
}

let allReports = [];
let activeFilter = 'all';
let lastThumbFocus = null;

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function formatDate(iso) {
  try { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)); }
  catch { return iso || ''; }
}

function formatDateTime(iso) {
  try { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
  catch { return iso || ''; }
}

const ICONS = {
  id: `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><rect x="1" y="2" width="11" height="9" rx="1"/><line x1="4" y1="5" x2="9" y2="5"/><line x1="4" y1="7.5" x2="7" y2="7.5"/></svg>`,
  loc: `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="6.5" cy="5.5" r="2"/><path d="M6.5 1C4.01 1 2 3.01 2 5.5c0 3.75 4.5 6.5 4.5 6.5s4.5-2.75 4.5-6.5C11 3.01 8.99 1 6.5 1z"/></svg>`,
  cal: `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><rect x="1" y="2" width="11" height="10" rx="1"/><line x1="1" y1="5" x2="12" y2="5"/><line x1="4" y1="1" x2="4" y2="3"/><line x1="9" y1="1" x2="9" y2="3"/></svg>`,
  empty: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="6" width="32" height="36" rx="2"/><line x1="16" y1="18" x2="32" y2="18"/><line x1="16" y1="24" x2="32" y2="24"/><line x1="16" y1="30" x2="24" y2="30"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>`
};

// ── LIST VIEW ─────────────────────────────────────────────────────────────
function renderListItem(r) {
  const div = document.createElement('div');
  div.innerHTML = `
    <a href="my-reports.html?id=${encodeURIComponent(r.id)}" class="report-card" data-status="${esc(r.status)}" id="report-card-${esc(r.id)}">
      <div class="report-card__header">
        <span class="report-card__title">${esc(r.title)}</span>
        ${renderStatusBadge(r.status)}
      </div>
      <div class="report-card__meta">
        <span class="report-card__meta-item"><span>${ICONS.id}</span><span>${esc(r.id)}</span></span>
        <span class="report-card__meta-item"><span>${ICONS.loc}</span><span>${esc(r.building)} - ${esc(r.room)}</span></span>
        <span class="report-card__meta-item"><span>${ICONS.cal}</span><span>${formatDate(r.createdAt)}</span></span>
      </div>
    </a>`;
  return div.firstElementChild;
}

function applyFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const active = btn.dataset.filter === filter;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const container = document.getElementById('reports-list-container');
  if (!container) return;

  const filtered = filter === 'all'
    ? allReports
    : allReports.filter(r => (r.status || 'submitted').toLowerCase().replace(/\s+/g, '_') === filter);

  if (filtered.length === 0) {
    const isAll = filter === 'all';
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">${ICONS.empty}</div>
        <p class="empty-state__title">${isAll ? 'No reports yet' : `No ${filter.replace('_', ' ')} reports`}</p>
        <p class="empty-state__text">${isAll ? 'You have not submitted any maintenance reports.' : 'You have no reports with this status.'}</p>
        ${isAll ? '<a href="report.html" class="btn btn-primary" id="list-report-btn">Report an issue</a>' : ''}
      </div>`;
    return;
  }

  container.innerHTML = `
    <p class="list-count">${filtered.length} report${filtered.length === 1 ? '' : 's'}${filter !== 'all' ? ` (${filter.replace('_', ' ')})` : ''}</p>
    <div class="reports-list"></div>`;
  const listEl = container.querySelector('.reports-list');
  filtered.forEach(r => listEl.appendChild(renderListItem(r)));
}

async function loadList() {
  const container = document.getElementById('reports-list-container');
  if (!container) return;
  container.innerHTML = `
    <div class="reports-list" aria-hidden="true">
      ${[0, 1, 2].map(() => '<div class="skeleton-card"><span class="skeleton-line skeleton-line--full"></span><span class="skeleton-line skeleton-line--short"></span></div>').join('')}
    </div>`;

  try { allReports = await getMyReports(); }
  catch {
    container.innerHTML = `
      <div class="error-state">
        <p class="error-state__title">Could not load reports</p>
        <p class="error-state__text">There was a problem loading your reports.</p>
        <button type="button" class="btn btn-secondary" id="retry-btn">Retry</button>
      </div>`;
    container.querySelector('#retry-btn')?.addEventListener('click', loadList);
    return;
  }
  applyFilter(activeFilter);
}

function initListView() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.filter === 'all' ? 'true' : 'false');
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });
  loadList();
}

// ── DETAILS VIEW ──────────────────────────────────────────────────────────
function openImageViewer(src, alt) {
  const d = document.getElementById('image-viewer-dialog'), img = document.getElementById('image-viewer-img');
  if (!d || !img) return;
  img.src = src; img.alt = alt;
  d.showModal();
  document.getElementById('image-viewer-close')?.focus();
}

function initImageViewer() {
  const d = document.getElementById('image-viewer-dialog');
  const close = document.getElementById('image-viewer-close');
  if (!d || !close) return;
  const hide = () => { d.close(); if (lastThumbFocus) lastThumbFocus.focus(); };
  close.addEventListener('click', hide);
  d.addEventListener('click', e => { if (e.target === d) hide(); });
}

function buildDetailsHtml(report) {
  const st = report.status || 'submitted';
  const imgHtml = (report.images && report.images.length > 0)
    ? `<div class="detail-row"><span class="detail-row__label">Images</span>
        <div class="details-image-grid">
          ${report.images.map((src, i) => `
            <button type="button" class="details-thumb" data-idx="${i}" aria-label="View image ${i + 1}">
              <img src="${esc(src)}" alt="Report image ${i + 1}" loading="lazy">
            </button>`).join('')}
        </div>
      </div>` : '';

  const assignedHtml = report.assignedTo
    ? `<div class="assigned-block">
        <span class="assigned-block__avatar" aria-hidden="true">${ICONS.user}</span>
        <div class="assigned-block__info">
          <span class="assigned-block__name">${esc(report.assignedTo.name)}</span>
          <span class="assigned-block__role">${esc(report.assignedTo.role)}</span>
        </div>
      </div>`
    : `<span class="not-assigned">Not assigned yet</span>`;

  const timelineHtml = (report.timeline && report.timeline.length > 0)
    ? `<ol class="timeline" aria-label="Report history">
        ${report.timeline.map((step, i) => `
          <li class="timeline-step">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-status">${esc((step.status || '').replace('_', ' '))}</span>
                <time class="timeline-time" datetime="${esc(step.timestamp)}">${formatDateTime(step.timestamp)}</time>
              </div>
              ${step.note ? `<p class="timeline-note">${esc(step.note)}</p>` : ''}
            </div>
          </li>`).join('')}
      </ol>`
    : '<p class="empty-state__text">No timeline events recorded.</p>';

  return `
    <div class="details-layout">
      <div class="details-card">
        <div class="details-card__header">Report details</div>
        <div class="details-card__body">
          <div class="detail-row"><span class="detail-row__label">Report ID</span><span class="detail-row__value">${esc(report.id)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Status</span><span class="detail-row__value">${renderStatusBadge(st)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Building</span><span class="detail-row__value">${esc(report.building)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Room / area</span><span class="detail-row__value">${esc(report.room)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Submitted</span><span class="detail-row__value">${formatDateTime(report.createdAt)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Last updated</span><span class="detail-row__value">${formatDateTime(report.updatedAt)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Description</span><p class="details-description">${esc(report.description)}</p></div>
          ${imgHtml}
        </div>
      </div>
      <div class="details-sidebar">
        <div class="details-card">
          <div class="details-card__header">Assigned to</div>
          <div class="details-card__body">${assignedHtml}</div>
        </div>
        <div class="details-card">
          <div class="details-card__header">Status timeline</div>
          <div class="details-card__body">${timelineHtml}</div>
        </div>
      </div>
    </div>`;
}

async function loadDetails(id) {
  const container = document.getElementById('details-container');
  if (!container) return;
  container.innerHTML = `
    <div class="details-card skeleton-card skeleton-card--lg" aria-hidden="true">
      <span class="skeleton-line skeleton-line--mid"></span>
      <span class="skeleton-line skeleton-line--full"></span>
      <span class="skeleton-line skeleton-line--full"></span>
    </div>`;

  let report = null;
  try { report = await getReportById(id); } catch {}
  if (!report) {
    container.innerHTML = `
      <div class="error-state">
        <p class="error-state__title">Report not found</p>
        <p class="error-state__text">The report with ID "${esc(id)}" does not exist.</p>
        <a href="my-reports.html" class="btn btn-primary">Back to my reports</a>
      </div>`;
    return;
  }

  const titleEl = document.getElementById('details-title');
  if (titleEl) titleEl.textContent = report.title;

  container.innerHTML = buildDetailsHtml(report);

  // Wire thumbnail dialog triggers
  container.querySelectorAll('.details-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      lastThumbFocus = btn;
      const idx = Number(btn.dataset.idx);
      openImageViewer(report.images[idx], `Report image ${idx + 1}`);
    });
  });

  initImageViewer();
}

// ── BOOT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();

  const id = new URLSearchParams(window.location.search).get('id');
  const listView = document.getElementById('list-view');
  const detailsView = document.getElementById('details-view');

  if (id) {
    if (listView) listView.hidden = true;
    if (detailsView) detailsView.hidden = false;
    loadDetails(id);
  } else {
    if (listView) listView.hidden = false;
    if (detailsView) detailsView.hidden = true;
    initListView();
  }
});
