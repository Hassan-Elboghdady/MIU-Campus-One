/**
 * report.js - Report an issue page logic
 */
import { requireLogin, ROLE_HOME, renderFooter, validateRequired, showError, clearError } from './common.js';
import { renderNav } from './student-nav.js';
import { BUILDINGS, createReport } from './reports-service.js';

const user = requireLogin();
if (user && user.role !== 'student') {
  window.location.replace(ROLE_HOME[user.role] || 'login.html');
}

const MAX_IMAGES = 3, MAX_FILE_BYTES = 5 * 1024 * 1024, MAX_DIM = 800;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

let selectedImages = [];
let formDirty = false, submitted = false;

const el = id => document.getElementById(id);
const fields = () => ({
  title: el('field-title'), desc: el('field-description'),
  building: el('field-building'), room: el('field-room'), images: el('field-images'),
  errTitle: el('error-title'), errDesc: el('error-description'),
  errBldg: el('error-building'), errRoom: el('error-room'), errImages: el('error-images'),
  form: el('report-form'), alert: el('report-form-alert'), counter: el('desc-counter'),
  thumbs: el('image-thumbnails'), upload: el('image-upload-area'), submit: el('submit-report-btn'),
  wrapper: el('report-form-wrapper'), success: el('report-success'), id: el('success-report-id'),
  viewBtn: el('success-view-btn'), anotherBtn: el('success-another-btn')
});

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
  const F = fields();
  if (!F.thumbs) return;
  F.thumbs.innerHTML = '';
  selectedImages.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'thumb-item';
    li.setAttribute('role', 'listitem');
    li.innerHTML = `
      <img src="${entry.dataUrl}" alt="Selected image ${i + 1}">
      <button type="button" class="thumb-remove" aria-label="Remove image ${i + 1}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>
      </button>`;
    li.querySelector('.thumb-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      selectedImages.splice(i, 1);
      renderThumbs();
      clearError(F.images, F.errImages);
      formDirty = true;
    });
    F.thumbs.appendChild(li);
  });
}

async function processFiles(files) {
  const F = fields();
  clearError(F.images, F.errImages);
  const imageFiles = Array.from(files).filter(f => f && (f.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(f.name.split('.').pop().toLowerCase())));
  if (!imageFiles.length && files.length) return showError(F.images, F.errImages, 'Please select valid image files (JPG, PNG or WebP).');

  const remaining = MAX_IMAGES - selectedImages.length;
  if (imageFiles.length > remaining) return showError(F.images, F.errImages, `You can only add ${remaining} more image${remaining === 1 ? '' : 's'} (max 3 total).`);

  for (const file of imageFiles) {
    if (file.size > MAX_FILE_BYTES) return showError(F.images, F.errImages, `"${file.name}" exceeds the 5 MB limit.`);
    try {
      const dataUrl = await resizeImage(file);
      selectedImages.push({ file, dataUrl });
    } catch {
      try {
        const readerDataUrl = await new Promise((res, rej) => {
          const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
        });
        selectedImages.push({ file, dataUrl: readerDataUrl });
      } catch {
        return showError(F.images, F.errImages, `Could not process "${file.name}". Please try a different file.`);
      }
    }
  }
  renderThumbs();
  formDirty = true;
}

function initDragDrop() {
  const F = fields();
  if (!F.upload) return;
  ['dragenter', 'dragover'].forEach(ev => F.upload.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    F.upload.classList.add('is-dragover');
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }));
  ['dragleave', 'dragend'].forEach(ev => F.upload.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    if (!F.upload.contains(e.relatedTarget)) F.upload.classList.remove('is-dragover');
  }));
  F.upload.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    F.upload.classList.remove('is-dragover');
    if (e.dataTransfer?.files?.length) processFiles(e.dataTransfer.files);
  });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());
}

function validateField(field, errorEl, label) {
  const msg = validateRequired(field.value, label);
  if (msg) { showError(field, errorEl, msg); return false; }
  clearError(field, errorEl);
  return true;
}

function validateAll() {
  const F = fields();
  const ok1 = validateField(F.title, F.errTitle, 'Issue title');
  const ok2 = validateField(F.desc, F.errDesc, 'Description');
  const ok3 = validateField(F.building, F.errBldg, 'Building');
  const ok4 = validateField(F.room, F.errRoom, 'Room or area');
  const allValid = ok1 && ok2 && ok3 && ok4;
  if (!allValid) {
    if (F.alert) {
      F.alert.textContent = 'Please complete all required fields highlighted in red below.';
      F.alert.classList.add('is-visible');
    }
    const firstInvalid = [F.title, F.desc, F.building, F.room].find(f => f && f.classList.contains('is-error'));
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  return allValid;
}

function showSuccess(reportId) {
  const F = fields();
  submitted = true; formDirty = false;
  if (F.id) F.id.textContent = reportId;
  if (F.viewBtn) F.viewBtn.href = `my-reports.html?id=${encodeURIComponent(reportId)}`;
  if (F.wrapper) { F.wrapper.hidden = true; F.wrapper.style.display = 'none'; }
  if (F.success) { F.success.hidden = false; F.success.style.display = 'flex'; F.success.focus(); }
}

function resetForm() {
  const F = fields();
  F.form.reset();
  selectedImages = [];
  formDirty = false; submitted = false;
  renderThumbs();
  if (F.counter) F.counter.textContent = '0 / 500';
  if (F.alert) { F.alert.textContent = ''; F.alert.classList.remove('is-visible'); }
  if (F.wrapper) { F.wrapper.hidden = false; F.wrapper.style.display = ''; }
  if (F.success) { F.success.hidden = true; F.success.style.display = 'none'; }
  [F.title, F.desc, F.building, F.room].forEach(f => { f?.classList.remove('is-error'); f?.removeAttribute('aria-invalid'); });
  [F.errTitle, F.errDesc, F.errBldg, F.errRoom, F.errImages].forEach(e => { if (e) { e.textContent = ''; e.classList.remove('is-visible'); } });
  F.title?.focus();
}

async function handleSubmit(e) {
  e.preventDefault();
  const F = fields();
  if (F.alert) { F.alert.textContent = ''; F.alert.classList.remove('is-visible'); }
  if (!validateAll()) {
    F.form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  F.submit.classList.add('is-loading');
  F.submit.disabled = true;
  try {
    const report = await createReport({
      title: F.title.value.trim(), description: F.desc.value.trim(),
      building: F.building.value, room: F.room.value.trim(),
      images: selectedImages.map(e => e.dataUrl)
    });
    showSuccess(report.id);
  } catch (err) {
    if (F.alert) { F.alert.textContent = err.message || 'Something went wrong. Please try again.'; F.alert.classList.add('is-visible'); }
    F.submit.classList.remove('is-loading');
    F.submit.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();

  const F = fields();
  if (F.building && F.building.options.length <= 1) {
    F.building.innerHTML = '<option value="">Select a building</option>' +
      BUILDINGS.map((b, i) => `<option value="${b}" id="building-opt-${i}">${b}</option>`).join('');
  }

  initDragDrop();
  if (F.form) F.form.dataset.ready = 'true';

  F.desc?.addEventListener('input', () => {
    const len = F.desc.value.length;
    if (F.counter) {
      F.counter.textContent = `${len} / 500`;
      F.counter.classList.toggle('char-counter--warn', len >= 480);
    }
    formDirty = true;
  });

  [F.title, F.building, F.room].forEach(f => f?.addEventListener('input', () => { formDirty = true; }));
  F.title?.addEventListener('input', () => { clearError(F.title, F.errTitle); F.alert?.classList.remove('is-visible'); });
  F.desc?.addEventListener('input', () => { clearError(F.desc, F.errDesc); F.alert?.classList.remove('is-visible'); });
  F.building?.addEventListener('change', () => { clearError(F.building, F.errBldg); F.alert?.classList.remove('is-visible'); });
  F.room?.addEventListener('input', () => { clearError(F.room, F.errRoom); F.alert?.classList.remove('is-visible'); });

  F.title?.addEventListener('blur', () => validateField(F.title, F.errTitle, 'Issue title'));
  F.desc?.addEventListener('blur', () => validateField(F.desc, F.errDesc, 'Description'));
  F.building?.addEventListener('blur', () => validateField(F.building, F.errBldg, 'Building'));
  F.room?.addEventListener('blur', () => validateField(F.room, F.errRoom, 'Room or area'));

  F.images?.addEventListener('change', () => {
    processFiles(Array.from(F.images.files));
    F.images.value = '';
  });

  F.form?.addEventListener('submit', handleSubmit);
  F.anotherBtn?.addEventListener('click', resetForm);
  window.addEventListener('beforeunload', e => {
    if (formDirty && !submitted) { e.preventDefault(); e.returnValue = ''; }
  });
});
