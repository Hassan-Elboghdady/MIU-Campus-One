/**
 * my-reports.js - My reports list and details view
 */
import { requireLogin, ROLE_HOME, renderFooter } from './common.js';
import { renderNav, renderStatusBadge } from './student-nav.js';
import { getMyReports, getReportById, deleteReport } from './reports-service.js';

const user = requireLogin();
if (user && user.role !== 'student') {
  window.location.replace(ROLE_HOME[user.role] || 'login.html');
}

let allReports = [], activeFilter = 'all', lastThumbFocus = null;
let pendingDeleteId = null, onPendingDeleted = null;

const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function fmt(iso, opts) {
  try { return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso)); }
  catch { return iso || ''; }
}
const formatDate = (iso) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });
const formatDateTime = (iso) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'maint-toast';
    document.body.appendChild(container);
  }
  const item = document.createElement('div');
  item.className = 'maint-toast__item' + (type ? ' maint-toast__item--' + type : '');
  item.textContent = message;
  container.appendChild(item);
  setTimeout(() => {
    item.classList.add('is-hiding');
    setTimeout(() => { if (item.parentNode) item.parentNode.removeChild(item); }, 280);
  }, 3000);
}

function openDeleteModal(reportId, callback) {
  pendingDeleteId = reportId;
  onPendingDeleted = callback;
  const modal = document.getElementById('student-delete-modal');
  const repIdEl = document.getElementById('student-delete-report-id');
  if (repIdEl) repIdEl.textContent = 'Report ID: ' + reportId + ' will be permanently removed.';
  if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeDeleteModal() {
  pendingDeleteId = null;
  onPendingDeleted = null;
  const modal = document.getElementById('student-delete-modal');
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

function initDeleteModal() {
  const modal = document.getElementById('student-delete-modal');
  const closeBtn = document.getElementById('student-delete-close');
  const cancelBtn = document.getElementById('student-delete-cancel');
  const okBtn = document.getElementById('student-delete-ok');

  if (closeBtn) closeBtn.addEventListener('click', closeDeleteModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeDeleteModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeDeleteModal(); });

  if (okBtn) {
    okBtn.addEventListener('click', async () => {
      if (!pendingDeleteId) { closeDeleteModal(); return; }
      const rId = pendingDeleteId, cb = onPendingDeleted;
      closeDeleteModal();
      try {
        await deleteReport(rId);
      } catch {
        try {
          const list = JSON.parse(localStorage.getItem('campusone_reports') || '[]').filter(r => r.id !== rId && r.taskId !== rId);
          localStorage.setItem('campusone_reports', JSON.stringify(list));
        } catch {}
      }
      showToast('Report deleted successfully.', 'success');
      if (typeof cb === 'function') cb();
    });
  }
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
  const isResolved = (r.status === 'resolved' || r.finished);
  const deleteBtnHtml = isResolved
    ? `<button type="button" class="btn btn-sm btn-delete-report" data-delete-id="${esc(r.id)}" title="Delete this finished report" aria-label="Delete finished report ${esc(r.id)}">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3,5 13,5"/><path d="M6 5V3h4v2"/><rect x="3" y="5" width="10" height="9" rx="1"/><line x1="6" y1="8" x2="6" y2="11"/><line x1="10" y1="8" x2="10" y2="11"/></svg>Delete
      </button>`
    : '';

  div.innerHTML = `
    <a href="my-reports.html?id=${encodeURIComponent(r.id)}" class="report-card" data-status="${esc(r.status)}" id="report-card-${esc(r.id)}">
      <div class="report-card__header">
        <span class="report-card__title">${esc(r.title)}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          ${renderStatusBadge(r.status)}
          ${isResolved ? '<span class="finished-badge">Finished</span>' : ''}
        </div>
      </div>
      <div class="report-card__meta">
        <span class="report-card__meta-item"><span>${ICONS.id}</span><span>${esc(r.id)}</span></span>
        <span class="report-card__meta-item"><span>${ICONS.loc}</span><span>${esc(r.building)} - ${esc(r.room)}</span></span>
        <span class="report-card__meta-item"><span>${ICONS.cal}</span><span>${formatDate(r.createdAt)}</span></span>
        ${deleteBtnHtml}
      </div>
    </a>`;

  const cardEl = div.firstElementChild;
  const delBtn = cardEl.querySelector('.btn-delete-report');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      openDeleteModal(r.id, () => loadList());
    });
  }
  return cardEl;
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

  if (!filtered.length) {
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
  container.innerHTML = `<div class="reports-list" aria-hidden="true">${[0, 1, 2].map(() => '<div class="skeleton-card"><span class="skeleton-line skeleton-line--full"></span><span class="skeleton-line skeleton-line--short"></span></div>').join('')}</div>`;

  try {
    allReports = await getMyReports();
  } catch {
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
  const isResolved = (st === 'resolved' || report.finished);
  const finishedBanner = isResolved
    ? `<div class="finished-alert" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:38px;height:38px;border-radius:50%;background:#DCFCE7;display:flex;align-items:center;justify-content:center;color:#16A34A;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,8 6,11 13,4"/></svg>
          </div>
          <div>
            <div style="font-weight:700;color:#166534;font-size:1.05rem;">Task Finished &amp; Resolved</div>
            <div style="color:#15803D;font-size:0.875rem;margin-top:2px;">The maintenance team has resolved this issue. If you are satisfied with the fix, you can delete this report.</div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-delete-detail" id="detail-delete-btn" data-delete-id="${esc(report.id)}" style="background:#DC2626;color:#ffffff;border:none;padding:9px 16px;border-radius:8px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,5 13,5"/><path d="M6 5V3h4v2"/><rect x="3" y="5" width="10" height="9" rx="1"/><line x1="6" y1="8" x2="6" y2="11"/><line x1="10" y1="8" x2="10" y2="11"/></svg>
          Delete Report
        </button>
      </div>`
    : '';

  const imgHtml = (report.images && report.images.length > 0)
    ? `<div class="detail-row"><span class="detail-row__label">Images</span>
        <div class="details-image-grid">
          ${report.images.map((src, i) => `<button type="button" class="details-thumb" data-idx="${i}" aria-label="View image ${i + 1}"><img src="${esc(src)}" alt="Report image ${i + 1}" loading="lazy"></button>`).join('')}
        </div>
      </div>` : '';

  const assignedHtml = report.assignedTo
    ? `<div class="assigned-block"><span class="assigned-block__avatar" aria-hidden="true">${ICONS.user}</span><div class="assigned-block__info"><span class="assigned-block__name">${esc(report.assignedTo.name)}</span><span class="assigned-block__role">${esc(report.assignedTo.role)}</span></div></div>`
    : `<span class="not-assigned">Not assigned yet</span>`;

  const timelineHtml = (report.timeline && report.timeline.length > 0)
    ? `<ol class="timeline" aria-label="Report history">
        ${report.timeline.map((step) => `
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

  const rows = [
    ['Report ID', esc(report.id)],
    ['Status', `${renderStatusBadge(st)} ${isResolved ? '<span class="finished-badge" style="margin-inline-start:6px;">Finished</span>' : ''}`],
    ['Building', esc(report.building)],
    ['Room / area', esc(report.room)],
    ['Submitted', formatDateTime(report.createdAt)],
    ['Last updated', formatDateTime(report.updatedAt)],
    ['Description', `<p class="details-description">${esc(report.description)}</p>`]
  ];

  return `
    <div class="details-layout">
      ${finishedBanner}
      <div class="details-card">
        <div class="details-card__header">Report details</div>
        <div class="details-card__body">
          ${rows.map(([label, val]) => `<div class="detail-row"><span class="detail-row__label">${label}</span><span class="detail-row__value">${val}</span></div>`).join('')}
          ${imgHtml}
        </div>
      </div>
      <div class="details-sidebar">
        <div class="details-card"><div class="details-card__header">Assigned to</div><div class="details-card__body">${assignedHtml}</div></div>
        <div class="details-card"><div class="details-card__header">Status timeline</div><div class="details-card__body">${timelineHtml}</div></div>
      </div>
    </div>`;
}

async function loadDetails(id) {
  const container = document.getElementById('details-container');
  if (!container) return;
  container.innerHTML = `<div class="details-card skeleton-card skeleton-card--lg" aria-hidden="true"><span class="skeleton-line skeleton-line--mid"></span><span class="skeleton-line skeleton-line--full"></span><span class="skeleton-line skeleton-line--full"></span></div>`;

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

  const detailDelBtn = container.querySelector('#detail-delete-btn');
  if (detailDelBtn) {
    detailDelBtn.addEventListener('click', () => {
      openDeleteModal(report.id, () => window.location.replace('my-reports.html'));
    });
  }

  container.querySelectorAll('.details-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      lastThumbFocus = btn;
      openImageViewer(report.images[Number(btn.dataset.idx)], `Report image ${Number(btn.dataset.idx) + 1}`);
    });
  });

  initImageViewer();
}

// ── BOOT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  initDeleteModal();

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
