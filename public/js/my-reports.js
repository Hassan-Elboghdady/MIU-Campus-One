/**
 * my-reports.js
 * My reports page logic:
 * - Login and role guard
 * - Detect list vs. details view from URL ?id=
 * - List view: status filter (live, no reload), loading/empty/error states
 * - Details view: report info, timeline, image grid, image viewer dialog
 * - All user text inserted via textContent (never innerHTML with user data)
 */

import { requireLogin, ROLE_HOME, renderFooter } from './common.js';
import { renderNav, renderStatusBadge }           from './student-nav.js';
import { getMyReports, getReportById, STATUSES }  from './reports-service.js';

// --------------------------------------------------------------------------
// Role guard
// --------------------------------------------------------------------------
const user = requireLogin();
if (user && user.role !== 'student') {
  window.location.replace(ROLE_HOME[user.role] || 'login.html');
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateTime(iso) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// Build badge span safely (uses renderStatusBadge which contains only controlled values)
function makeBadge(status) {
  const span = document.createElement('span');
  span.innerHTML = renderStatusBadge(status); // safe: no user data
  return span.firstElementChild;
}

// --------------------------------------------------------------------------
// Location string
// --------------------------------------------------------------------------
function locationString(report) {
  return `${report.building} - ${report.room}`;
}

// ============================================================================
// LIST VIEW
// ============================================================================

let allReports   = [];
let activeFilter = 'all';

function renderListItem(report) {
  const a = document.createElement('a');
  a.href           = `my-reports.html?id=${encodeURIComponent(report.id)}`;
  a.className      = 'report-card';
  a.dataset.status = report.status;
  a.id             = `report-card-${report.id}`;

  // Header row
  const header = document.createElement('div');
  header.className = 'report-card__header';

  const titleEl = document.createElement('span');
  titleEl.className   = 'report-card__title';
  titleEl.textContent = report.title;

  header.append(titleEl, makeBadge(report.status));

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'report-card__meta';

  const mkMeta = (iconHtml, text) => {
    const s = document.createElement('span');
    s.className = 'report-card__meta-item';
    // icon is controlled constant
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = iconHtml;
    const txt = document.createElement('span');
    txt.textContent = text;
    s.append(iconSpan, txt);
    return s;
  };

  const idIcon = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="1" y="2" width="11" height="9" rx="1"/><line x1="4" y1="5" x2="9" y2="5"/><line x1="4" y1="7.5" x2="7" y2="7.5"/></svg>`;
  const locIcon = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="6.5" cy="5.5" r="2"/><path d="M6.5 1C4.01 1 2 3.01 2 5.5c0 3.75 4.5 6.5 4.5 6.5s4.5-2.75 4.5-6.5C11 3.01 8.99 1 6.5 1z"/></svg>`;
  const calIcon = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="1" y="2" width="11" height="10" rx="1"/><line x1="1" y1="5" x2="12" y2="5"/><line x1="4" y1="1" x2="4" y2="3"/><line x1="9" y1="1" x2="9" y2="3"/></svg>`;

  meta.append(
    mkMeta(idIcon, report.id),
    mkMeta(locIcon, locationString(report)),
    mkMeta(calIcon, formatDate(report.createdAt)),
  );

  a.append(header, meta);
  return a;
}

function applyFilter(filter) {
  activeFilter = filter;

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  const container = document.getElementById('reports-list-container');
  if (!container) return;
  container.innerHTML = '';

  const filtered = filter === 'all'
    ? allReports
    : allReports.filter((r) => r.status === filter);

  // Count line
  if (allReports.length > 0) {
    const count = document.createElement('p');
    count.className   = 'list-count';
    count.textContent = filtered.length === 1
      ? '1 report'
      : `${filtered.length} report${filtered.length === 0 ? 's' : 's'}`;
    if (filter !== 'all') {
      count.textContent += ` (${filter.replace('_', ' ')})`;
    }
    container.appendChild(count);
  }

  if (filtered.length === 0) {
    renderEmptyState(container, filter);
    return;
  }

  const list = document.createElement('div');
  list.className = 'reports-list';
  filtered.forEach((r) => list.appendChild(renderListItem(r)));
  container.appendChild(list);
}

function renderEmptyState(container, filter) {
  const div = document.createElement('div');
  div.className = 'empty-state';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'empty-state__icon';
  iconDiv.innerHTML = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="8" y="6" width="32" height="36" rx="2"/><line x1="16" y1="18" x2="32" y2="18"/><line x1="16" y1="24" x2="32" y2="24"/><line x1="16" y1="30" x2="24" y2="30"/></svg>`;

  const title = document.createElement('p');
  title.className = 'empty-state__title';

  const text = document.createElement('p');
  text.className = 'empty-state__text';

  if (filter === 'all') {
    title.textContent = 'No reports yet';
    text.textContent  = 'You have not submitted any maintenance reports.';
    const link = document.createElement('a');
    link.href       = 'report.html';
    link.className  = 'btn btn-primary';
    link.id         = 'list-report-btn';
    link.textContent = 'Report an issue';
    div.append(iconDiv, title, text, link);
  } else {
    title.textContent = `No ${filter.replace('_', ' ')} reports`;
    text.textContent  = `You have no reports with this status.`;
    div.append(iconDiv, title, text);
  }

  container.appendChild(div);
}

function renderListError(container) {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'error-state';

  const title = document.createElement('p');
  title.className   = 'error-state__title';
  title.textContent = 'Could not load reports';

  const text = document.createElement('p');
  text.className   = 'error-state__text';
  text.textContent = 'There was a problem loading your reports.';

  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'btn btn-secondary';
  btn.id        = 'retry-btn';
  btn.textContent = 'Retry';
  btn.addEventListener('click', loadList);

  div.append(title, text, btn);
  container.appendChild(div);
}

function renderListSkeletons(container) {
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'reports-list';
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton-card';
    const l1 = document.createElement('span');
    l1.className = 'skeleton-line skeleton-line--full';
    const l2 = document.createElement('span');
    l2.className = 'skeleton-line skeleton-line--short';
    sk.append(l1, l2);
    list.appendChild(sk);
  }
  container.appendChild(list);
}

async function loadList() {
  const container = document.getElementById('reports-list-container');
  if (!container) return;

  renderListSkeletons(container);

  try {
    allReports = await getMyReports();
  } catch {
    renderListError(container);
    return;
  }

  applyFilter(activeFilter);
}

function initListView() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.filter === 'all' ? 'true' : 'false');
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });
  loadList();
}

// ============================================================================
// DETAILS VIEW
// ============================================================================

// Image viewer state
let lastThumbFocus = null;

function openImageViewer(src, alt) {
  const dialog  = document.getElementById('image-viewer-dialog');
  const img     = document.getElementById('image-viewer-img');
  if (!dialog || !img) return;
  img.src = src;
  img.alt = alt;
  dialog.showModal();
  document.getElementById('image-viewer-close').focus();
}

function closeImageViewer() {
  const dialog = document.getElementById('image-viewer-dialog');
  if (!dialog) return;
  dialog.close();
  if (lastThumbFocus) lastThumbFocus.focus();
}

function initImageViewer() {
  const dialog  = document.getElementById('image-viewer-dialog');
  const closeBtn = document.getElementById('image-viewer-close');
  if (!dialog || !closeBtn) return;

  closeBtn.addEventListener('click', closeImageViewer);

  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeImageViewer();
  });

  // Esc is handled natively by <dialog>; we just need to restore focus
  dialog.addEventListener('close', () => {
    if (lastThumbFocus) lastThumbFocus.focus();
  });
}

// --------------------------------------------------------------------------
// Build a details row
// --------------------------------------------------------------------------
function makeDetailRow(label, valueText) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const lbl = document.createElement('span');
  lbl.className   = 'detail-row__label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className   = 'detail-row__value';
  val.textContent = valueText;

  row.append(lbl, val);
  return row;
}

function makeDetailRowWithBadge(label, status) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const lbl = document.createElement('span');
  lbl.className   = 'detail-row__label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className = 'detail-row__value';
  val.appendChild(makeBadge(status));

  row.append(lbl, val);
  return row;
}

// --------------------------------------------------------------------------
// Render main details card
// --------------------------------------------------------------------------
function buildMainCard(report) {
  const card = document.createElement('div');
  card.className = 'details-card';

  const cardHeader = document.createElement('div');
  cardHeader.className   = 'details-card__header';
  cardHeader.textContent = 'Report details';

  const body = document.createElement('div');
  body.className = 'details-card__body';

  // ID
  body.appendChild(makeDetailRow('Report ID', report.id));
  // Status (with badge)
  body.appendChild(makeDetailRowWithBadge('Status', report.status));
  // Building
  body.appendChild(makeDetailRow('Building', report.building));
  // Room
  body.appendChild(makeDetailRow('Room / area', report.room));
  // Date submitted
  body.appendChild(makeDetailRow('Submitted', formatDateTime(report.createdAt)));
  // Last updated
  body.appendChild(makeDetailRow('Last updated', formatDateTime(report.updatedAt)));

  // Description
  const descRow = document.createElement('div');
  descRow.className = 'detail-row';
  const descLbl = document.createElement('span');
  descLbl.className   = 'detail-row__label';
  descLbl.textContent = 'Description';
  const descVal = document.createElement('p');
  descVal.className   = 'details-description';
  descVal.textContent = report.description;
  descRow.append(descLbl, descVal);
  body.appendChild(descRow);

  // Images
  if (report.images && report.images.length > 0) {
    const imgRow = document.createElement('div');
    imgRow.className = 'detail-row';
    const imgLbl = document.createElement('span');
    imgLbl.className   = 'detail-row__label';
    imgLbl.textContent = 'Images';
    const grid = document.createElement('div');
    grid.className = 'details-image-grid';

    report.images.forEach((src, idx) => {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'details-thumb';
      btn.id        = `thumb-${report.id}-${idx}`;
      btn.setAttribute('aria-label', `View image ${idx + 1}`);
      btn.addEventListener('click', () => {
        lastThumbFocus = btn;
        openImageViewer(src, `Report image ${idx + 1}`);
      });
      const img = document.createElement('img');
      img.src     = src;
      img.alt     = `Report image ${idx + 1}`;
      img.loading = 'lazy';
      btn.appendChild(img);
      grid.appendChild(btn);
    });

    imgRow.append(imgLbl, grid);
    body.appendChild(imgRow);
  }

  card.append(cardHeader, body);
  return card;
}

// --------------------------------------------------------------------------
// Render sidebar: assigned staff + timeline
// --------------------------------------------------------------------------
function buildSideCards(report) {
  const wrap = document.createElement('div');
  wrap.className = 'details-sidebar';

  // Assigned staff card
  const assignCard = document.createElement('div');
  assignCard.className = 'details-card';

  const assignHeader = document.createElement('div');
  assignHeader.className   = 'details-card__header';
  assignHeader.textContent = 'Assigned to';

  const assignBody = document.createElement('div');
  assignBody.className = 'details-card__body';

  if (report.assignedTo) {
    const block = document.createElement('div');
    block.className = 'assigned-block';

    const avatar = document.createElement('span');
    avatar.className = 'assigned-block__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>`;

    const info = document.createElement('div');
    info.className = 'assigned-block__info';

    const name = document.createElement('span');
    name.className   = 'assigned-block__name';
    name.textContent = report.assignedTo.name;

    const role = document.createElement('span');
    role.className   = 'assigned-block__role';
    role.textContent = report.assignedTo.role;

    info.append(name, role);
    block.append(avatar, info);
    assignBody.appendChild(block);
  } else {
    const na = document.createElement('span');
    na.className   = 'not-assigned';
    na.textContent = 'Not assigned yet';
    assignBody.appendChild(na);
  }

  assignCard.append(assignHeader, assignBody);

  // Timeline card
  const timelineCard = document.createElement('div');
  timelineCard.className = 'details-card';

  const tlHeader = document.createElement('div');
  tlHeader.className   = 'details-card__header';
  tlHeader.textContent = 'Status timeline';

  const tlBody = document.createElement('div');
  tlBody.className = 'details-card__body';

  const tl = document.createElement('div');
  tl.className = 'timeline';

  const statusLabels = {
    [STATUSES.SUBMITTED]:   'Submitted',
    [STATUSES.ASSIGNED]:    'Assigned',
    [STATUSES.IN_PROGRESS]: 'In progress',
    [STATUSES.RESOLVED]:    'Resolved',
  };

  const entries = report.timeline || [];
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const dot = document.createElement('div');
    dot.className = 'timeline-dot';
    dot.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'timeline-content';

    const statusEl = document.createElement('span');
    statusEl.className   = 'timeline-status';
    statusEl.textContent = statusLabels[entry.status] || entry.status;

    const noteEl = document.createElement('span');
    noteEl.className   = 'timeline-note';
    noteEl.textContent = entry.note;

    const dateEl = document.createElement('span');
    dateEl.className   = 'timeline-date';
    dateEl.textContent = formatDateTime(entry.timestamp);

    content.append(statusEl, noteEl, dateEl);
    item.append(dot, content);
    tl.appendChild(item);
  });

  tlBody.appendChild(tl);
  timelineCard.append(tlHeader, tlBody);

  wrap.append(assignCard, timelineCard);
  return wrap;
}

// --------------------------------------------------------------------------
// Render report not found
// --------------------------------------------------------------------------
function renderNotFound(container) {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'not-found-state';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'not-found-state__icon';
  iconDiv.innerHTML = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="20"/><line x1="24" y1="16" x2="24" y2="26"/><circle cx="24" cy="32" r="1.5" fill="currentColor" stroke="none"/></svg>`;

  const title = document.createElement('p');
  title.className   = 'not-found-state__title';
  title.textContent = 'Report not found';

  const text = document.createElement('p');
  text.className   = 'not-found-state__text';
  text.textContent = 'This report does not exist or you do not have permission to view it.';

  const link = document.createElement('a');
  link.href       = 'my-reports.html';
  link.className  = 'btn btn-secondary';
  link.id         = 'not-found-back-btn';
  link.textContent = 'Back to my reports';

  div.append(iconDiv, title, text, link);
  container.appendChild(div);
}

// --------------------------------------------------------------------------
// Load and render details
// --------------------------------------------------------------------------
async function loadDetails(id) {
  const container = document.getElementById('details-container');
  const titleEl   = document.getElementById('details-title');
  if (!container) return;

  // Skeleton placeholder
  const sk = document.createElement('div');
  sk.className = 'skeleton-card';
  sk.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) {
    const l = document.createElement('span');
    l.className = i % 2 === 0 ? 'skeleton-line skeleton-line--wide' : 'skeleton-line skeleton-line--mid';
    sk.appendChild(l);
  }
  container.appendChild(sk);

  let report;
  try {
    report = await getReportById(id);
  } catch {
    sk.remove();
    renderNotFound(container);
    return;
  }

  sk.remove();

  if (!report) {
    renderNotFound(container);
    return;
  }

  // Set page title
  if (titleEl) titleEl.textContent = report.title;

  // Build grid
  const grid = document.createElement('div');
  grid.className = 'details-grid';
  grid.appendChild(buildMainCard(report));
  grid.appendChild(buildSideCards(report));
  container.appendChild(grid);
}

// ============================================================================
// Boot
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  initImageViewer();

  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  const listView    = document.getElementById('list-view');
  const detailsView = document.getElementById('details-view');

  if (id) {
    // Details mode
    if (listView)    listView.hidden    = true;
    if (detailsView) detailsView.hidden = false;
    loadDetails(id);
  } else {
    // List mode
    if (listView)    listView.hidden    = false;
    if (detailsView) detailsView.hidden = true;
    initListView();
  }
});
