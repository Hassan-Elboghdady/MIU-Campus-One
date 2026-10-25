/**
 * report.js - Report an issue page logic
 */
import { requireLogin, ROLE_HOME, renderFooter, validateRequired, showError, clearError } from './common.js';
import { renderNav } from './student-nav.js';
import { BUILDINGS, createReport } from './reports-service.js';

const user = requireLogin();
if (user && user.role !== 'student') window.location.replace(ROLE_HOME[user.role] || 'login.html');

const MAX_IMAGES = 3, MAX_FILE_BYTES = 5 * 1024 * 1024, MAX_DIM = 800;
let selectedImages = [], formDirty = false, submitted = false;
const el = id => document.getElementById(id);

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM; }
        else { width = Math.round((width / height) * MAX_DIM); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image.')); };
    img.src = url;
  });
}

function renderThumbs() {
  const thumbs = el('image-thumbnails');
  if (!thumbs) return;
  thumbs.innerHTML = '';
  selectedImages.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'thumb-item';
    li.setAttribute('role', 'listitem');
    li.innerHTML = `
      <img src="${entry.dataUrl}" alt="Selected image ${i + 1}">
      <button type="button" class="thumb-remove" aria-label="Remove image ${i + 1}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>
      </button>`;
    li.querySelector('.thumb-remove').addEventListener('click', e => {
      e.stopPropagation();
      selectedImages.splice(i, 1);
      renderThumbs();
      clearError(el('field-images'), el('error-images'));
      formDirty = true;
    });
    thumbs.appendChild(li);
  });
}

async function processFiles(files) {
  const fi = el('field-images'), err = el('error-images');
  clearError(fi, err);
  const images = Array.from(files).filter(f => f && (f.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(f.name.split('.').pop().toLowerCase())));
  if (!images.length && files.length) return showError(fi, err, 'Please select valid image files (JPG, PNG or WebP).');

  const remaining = MAX_IMAGES - selectedImages.length;
  if (images.length > remaining) return showError(fi, err, `You can only add ${remaining} more image${remaining === 1 ? '' : 's'} (max 3 total).`);

  for (const file of images) {
    if (file.size > MAX_FILE_BYTES) return showError(fi, err, `"${file.name}" exceeds the 5 MB limit.`);
    try {
      selectedImages.push({ file, dataUrl: await resizeImage(file) });
    } catch {
      try {
        const fr = new FileReader();
        const dataUrl = await new Promise((res, rej) => { fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
        selectedImages.push({ file, dataUrl });
      } catch {
        return showError(fi, err, `Could not process "${file.name}". Please try a different file.`);
      }
    }
  }
  renderThumbs();
  formDirty = true;
}

function initDragDrop() {
  const upload = el('image-upload-area');
  if (!upload) return;
  const toggle = (on, e) => { e.preventDefault(); e.stopPropagation(); upload.classList.toggle('is-dragover', on); };
  ['dragenter', 'dragover'].forEach(ev => upload.addEventListener(ev, e => { toggle(true, e); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }));
  ['dragleave', 'dragend'].forEach(ev => upload.addEventListener(ev, e => { if (!upload.contains(e.relatedTarget)) toggle(false, e); }));
  upload.addEventListener('drop', e => { toggle(false, e); if (e.dataTransfer?.files?.length) processFiles(e.dataTransfer.files); });
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => e.preventDefault()));
}

function validateField(field, errorEl, label) {
  const msg = validateRequired(field.value, label);
  if (msg) { showError(field, errorEl, msg); return false; }
  clearError(field, errorEl);
  return true;
}

function validateAll() {
  const req = [
    [el('field-title'), el('error-title'), 'Issue title'],
    [el('field-description'), el('error-description'), 'Description'],
    [el('field-building'), el('error-building'), 'Building'],
    [el('field-room'), el('error-room'), 'Room or area']
  ];
  let firstErr = null, ok = true;
  req.forEach(([f, err, label]) => {
    if (!validateField(f, err, label)) { ok = false; if (!firstErr) firstErr = f; }
  });
  if (!ok) {
    const alert = el('report-form-alert');
    if (alert) { alert.textContent = 'Please complete all required fields highlighted in red below.'; alert.classList.add('is-visible'); }
    if (firstErr) { firstErr.focus(); firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  return ok;
}

function updateDispatchPreview() {
  const preview = el('dispatch-preview-text');
  if (!preview) return;
  const staff = el('field-target-staff'), catSelect = el('field-category');
  if (staff && staff.value !== 'auto') {
    preview.textContent = `Will be dispatched directly to: ${staff.options[staff.selectedIndex]?.text || 'Maintenance Staff'}`;
    return;
  }
  let cat = catSelect?.value;
  if (!cat || cat === 'auto') {
    const text = `${el('field-title')?.value || ''} ${el('field-description')?.value || ''}`.toLowerCase();
    const rules = [
      [/\b(leak|water|pipe|tap|faucet|sink|drain|toilet|restroom|bathroom|dispenser|flush)\b/, 'Plumbing (Ahmed Hassan)'],
      [/\b(light|bulb|electric|power|socket|wire|fuse|switch|flicker)\b/, 'Electrical (Mohamed Salah)'],
      [/\b(ac|air condition|hvac|heat|cooling|thermostat|fan)\b/, 'HVAC (Khaled Ibrahim)'],
      [/\b(door|lock|handle|window|table|chair|bench|desk|wood)\b/, 'Carpentry (Omar Farouk)'],
      [/\b(elevator|lift)\b/, 'Elevators & Machinery'],
      [/\b(paint|wall|crack|ceiling)\b/, 'Painting (Rania Mostafa)']
    ];
    const match = rules.find(([re]) => re.test(text));
    cat = match ? match[1] : 'Maintenance Staff (Omar Khaled / On-duty Team)';
  }
  preview.textContent = `Auto-routing to: ${cat} maintenance team.`;
}

function showSuccess(report) {
  submitted = true; formDirty = false;
  const rId = typeof report === 'object' ? report.id : report;
  const idEl = el('success-report-id'), vb = el('success-view-btn'), sa = el('success-staff-assigned');
  if (idEl) idEl.textContent = rId;
  if (vb) vb.href = `my-reports.html?id=${encodeURIComponent(rId)}`;
  if (sa) sa.textContent = (typeof report === 'object' && report.assignedTo) ? `Dispatched to: ${report.assignedTo.name} (${report.assignedTo.role})` : 'Dispatched to Campus Maintenance Staff';
  const wrap = el('report-form-wrapper'), sc = el('report-success');
  if (wrap) { wrap.hidden = true; wrap.style.display = 'none'; }
  if (sc) { sc.hidden = false; sc.style.display = 'flex'; sc.focus(); }
}

function resetForm() {
  el('report-form')?.reset();
  selectedImages = [];
  formDirty = false; submitted = false;
  renderThumbs();
  const counter = el('desc-counter'), alert = el('report-form-alert'), wrap = el('report-form-wrapper'), sc = el('report-success');
  if (counter) counter.textContent = '0 / 500';
  if (alert) { alert.textContent = ''; alert.classList.remove('is-visible'); }
  if (wrap) { wrap.hidden = false; wrap.style.display = ''; }
  if (sc) { sc.hidden = true; sc.style.display = 'none'; }
  ['field-title', 'field-description', 'field-building', 'field-room'].forEach(id => {
    const f = el(id); f?.classList.remove('is-error'); f?.removeAttribute('aria-invalid');
  });
  ['error-title', 'error-description', 'error-building', 'error-room', 'error-images'].forEach(id => {
    const e = el(id); if (e) { e.textContent = ''; e.classList.remove('is-visible'); }
  });
  updateDispatchPreview();
  el('field-title')?.focus();
}

async function handleSubmit(e) {
  e.preventDefault();
  const alert = el('report-form-alert'), btn = el('submit-report-btn');
  if (alert) { alert.textContent = ''; alert.classList.remove('is-visible'); }
  if (!validateAll()) return;
  btn.classList.add('is-loading'); btn.disabled = true;
  try {
    const report = await createReport({
      title: el('field-title').value.trim(),
      description: el('field-description').value.trim(),
      building: el('field-building').value,
      room: el('field-room').value.trim(),
      images: selectedImages.map(img => img.dataUrl),
      category: el('field-category')?.value || 'auto',
      assignedTechId: (el('field-target-staff')?.value !== 'auto') ? el('field-target-staff')?.value : ''
    });
    showSuccess(report);
  } catch (err) {
    if (alert) { alert.textContent = err.message || 'Something went wrong. Please try again.'; alert.classList.add('is-visible'); }
    btn.classList.remove('is-loading'); btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();

  const bldg = el('field-building');
  if (bldg && bldg.options.length <= 1) {
    bldg.innerHTML = '<option value="">Select a building</option>' +
      BUILDINGS.map((b, i) => `<option value="${b}" id="building-opt-${i}">${b}</option>`).join('');
  }

  initDragDrop();
  const form = el('report-form');
  if (form) form.dataset.ready = 'true';

  const desc = el('field-description'), counter = el('desc-counter'), alert = el('report-form-alert');
  desc?.addEventListener('input', () => {
    const len = desc.value.length;
    if (counter) {
      counter.textContent = `${len} / 500`;
      counter.classList.toggle('char-counter--warn', len >= 480);
    }
    formDirty = true;
  });

  const req = [
    [el('field-title'), el('error-title'), 'Issue title'],
    [desc, el('error-description'), 'Description'],
    [bldg, el('error-building'), 'Building'],
    [el('field-room'), el('error-room'), 'Room or area']
  ];

  req.forEach(([f, err, label]) => {
    f?.addEventListener('blur', () => validateField(f, err, label));
    f?.addEventListener('input', () => { clearError(f, err); alert?.classList.remove('is-visible'); });
  });
  bldg?.addEventListener('change', () => { clearError(bldg, el('error-building')); alert?.classList.remove('is-visible'); });

  [el('field-title'), desc].forEach(f => f?.addEventListener('input', updateDispatchPreview));
  [el('field-category'), el('field-target-staff')].forEach(f => f?.addEventListener('change', () => { updateDispatchPreview(); formDirty = true; }));
  updateDispatchPreview();

  const fi = el('field-images');
  fi?.addEventListener('change', () => { processFiles(Array.from(fi.files)); fi.value = ''; });

  form?.addEventListener('submit', handleSubmit);
  el('success-another-btn')?.addEventListener('click', resetForm);
  window.addEventListener('beforeunload', e => { if (formDirty && !submitted) { e.preventDefault(); e.returnValue = ''; } });
});
