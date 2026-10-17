/**
 * report.js
 * Report an issue page logic:
 * - Login and role guard
 * - Populate building select from BUILDINGS
 * - Character counter for description
 * - Image selection, canvas resize, thumbnails with remove button
 * - Drag-and-drop support
 * - Validation (on blur + on submit), showError / clearError from common.js
 * - createReport, success screen, beforeunload warning
 */

import { requireLogin, ROLE_HOME, renderFooter, validateRequired, showError, clearError } from './common.js';
import { renderNav }            from './student-nav.js';
import { BUILDINGS, createReport } from './reports-service.js';

// --------------------------------------------------------------------------
// Role guard
// --------------------------------------------------------------------------
const user = requireLogin();
if (user && user.role !== 'student') {
  window.location.replace(ROLE_HOME[user.role] || 'login.html');
}

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const MAX_IMAGES   = 3;
const MAX_FILE_MB  = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_DIM      = 800; // px - longest side after canvas resize
const ACCEPTED     = ['image/jpeg', 'image/png', 'image/webp'];

// --------------------------------------------------------------------------
// Module state
// --------------------------------------------------------------------------
let selectedImages = []; // array of { file, dataUrl }
let formDirty      = false;
let submitted      = false;

// --------------------------------------------------------------------------
// DOM refs (assigned in DOMContentLoaded)
// --------------------------------------------------------------------------
let form, fieldTitle, fieldDesc, fieldBuilding, fieldRoom, fieldImages;
let errorTitle, errorDesc, errorBuilding, errorRoom, errorImages;
let descCounter, thumbsContainer, uploadArea, submitBtn, formAlert;
let formWrapper, successScreen, successIdEl, successViewBtn, successAnotherBtn;

// --------------------------------------------------------------------------
// Populate buildings
// --------------------------------------------------------------------------
function populateBuildings() {
  BUILDINGS.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value       = name;
    opt.textContent = name;
    opt.id          = `building-opt-${i}`;
    fieldBuilding.appendChild(opt);
  });
}

// --------------------------------------------------------------------------
// Character counter
// --------------------------------------------------------------------------
function updateCounter() {
  const len = fieldDesc.value.length;
  descCounter.textContent = `${len} / 500`;
  descCounter.classList.toggle('char-counter--warn', len >= 480);
}

// --------------------------------------------------------------------------
// Canvas image resize - returns a data URL (JPEG)
// --------------------------------------------------------------------------
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM; }
        else                { width  = Math.round((width / height) * MAX_DIM); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image.')); };
    img.src = url;
  });
}

// --------------------------------------------------------------------------
// Build a thumbnail element
// --------------------------------------------------------------------------
function buildThumb(dataUrl, index) {
  const item = document.createElement('li');
  item.className = 'thumb-item';
  item.setAttribute('role', 'listitem');

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = `Selected image ${index + 1}`;

  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'thumb-remove';
  btn.setAttribute('aria-label', `Remove image ${index + 1}`);
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>`;
  btn.addEventListener('click', () => removeImage(index));

  item.append(img, btn);
  return item;
}

// --------------------------------------------------------------------------
// Re-render all thumbnails
// --------------------------------------------------------------------------
function renderThumbs() {
  thumbsContainer.innerHTML = '';
  selectedImages.forEach((entry, i) => {
    thumbsContainer.appendChild(buildThumb(entry.dataUrl, i));
  });
}

// --------------------------------------------------------------------------
// Remove an image by index
// --------------------------------------------------------------------------
function removeImage(index) {
  selectedImages.splice(index, 1);
  renderThumbs();
  clearError(fieldImages, errorImages);
  markDirty();
}

// --------------------------------------------------------------------------
// Process files (validate + resize)
// --------------------------------------------------------------------------
async function processFiles(files) {
  clearError(fieldImages, errorImages);
  const remaining = MAX_IMAGES - selectedImages.length;
  if (files.length > remaining) {
    showError(fieldImages, errorImages, `You can only add ${remaining} more image${remaining === 1 ? '' : 's'} (max 3 total).`);
    return;
  }

  for (const file of files) {
    if (!ACCEPTED.includes(file.type)) {
      showError(fieldImages, errorImages, `"${file.name}" is not a supported file type. Use JPG, PNG or WebP.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError(fieldImages, errorImages, `"${file.name}" exceeds the 5 MB limit.`);
      return;
    }
    try {
      const dataUrl = await resizeImage(file);
      selectedImages.push({ file, dataUrl });
    } catch {
      showError(fieldImages, errorImages, `Could not process "${file.name}". Please try a different file.`);
      return;
    }
  }

  renderThumbs();
  markDirty();
}

// --------------------------------------------------------------------------
// Drag-and-drop on upload area
// --------------------------------------------------------------------------
function initDragDrop() {
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('is-dragover');
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('is-dragover');
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('is-dragover');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  });
}

// --------------------------------------------------------------------------
// Dirty flag
// --------------------------------------------------------------------------
function markDirty() {
  formDirty = true;
}

// --------------------------------------------------------------------------
// Validate a single field
// --------------------------------------------------------------------------
function validateField(field, errorEl, label) {
  const msg = validateRequired(field.value, label);
  if (msg) { showError(field, errorEl, msg); return false; }
  clearError(field, errorEl);
  return true;
}

// --------------------------------------------------------------------------
// Full form validation
// --------------------------------------------------------------------------
function validateAll() {
  const okTitle    = validateField(fieldTitle,    errorTitle,    'Issue title');
  const okDesc     = validateField(fieldDesc,     errorDesc,     'Description');
  const okBuilding = validateField(fieldBuilding, errorBuilding, 'Building');
  const okRoom     = validateField(fieldRoom,     errorRoom,     'Room or area');
  return okTitle && okDesc && okBuilding && okRoom;
}

// --------------------------------------------------------------------------
// Show global alert
// --------------------------------------------------------------------------
function showAlert(msg) {
  formAlert.textContent = msg;
  formAlert.classList.add('is-visible');
}

function hideAlert() {
  formAlert.textContent = '';
  formAlert.classList.remove('is-visible');
}

// --------------------------------------------------------------------------
// Show success screen
// --------------------------------------------------------------------------
function showSuccess(reportId) {
  submitted = true;
  formDirty = false;
  successIdEl.textContent = reportId;
  successViewBtn.href = `my-reports.html?id=${encodeURIComponent(reportId)}`;
  formWrapper.hidden   = true;
  successScreen.hidden = false;
  successScreen.focus();
}

// --------------------------------------------------------------------------
// Reset form to blank state
// --------------------------------------------------------------------------
function resetForm() {
  form.reset();
  selectedImages = [];
  formDirty      = false;
  submitted      = false;
  renderThumbs();
  updateCounter();
  hideAlert();
  [fieldTitle, fieldDesc, fieldBuilding, fieldRoom].forEach((f) => {
    f.classList.remove('is-error');
    f.removeAttribute('aria-invalid');
  });
  [errorTitle, errorDesc, errorBuilding, errorRoom, errorImages].forEach((e) => {
    e.textContent = '';
    e.classList.remove('is-visible');
  });
  formWrapper.hidden   = false;
  successScreen.hidden = true;
  fieldTitle.focus();
}

// --------------------------------------------------------------------------
// Submit handler
// --------------------------------------------------------------------------
async function handleSubmit(e) {
  e.preventDefault();
  hideAlert();

  if (!validateAll()) {
    // Focus the first invalid field
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  submitBtn.classList.add('is-loading');
  submitBtn.disabled = true;

  try {
    const report = await createReport({
      title:       fieldTitle.value.trim(),
      description: fieldDesc.value.trim(),
      building:    fieldBuilding.value,
      room:        fieldRoom.value.trim(),
      images:      selectedImages.map((e) => e.dataUrl),
    });
    showSuccess(report.id);
  } catch (err) {
    showAlert(err.message || 'Something went wrong. Please try again.');
    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;
  }
}

// --------------------------------------------------------------------------
// Beforeunload warning
// --------------------------------------------------------------------------
function handleBeforeUnload(e) {
  if (formDirty && !submitted) {
    e.preventDefault();
    e.returnValue = '';
  }
}

// --------------------------------------------------------------------------
// Boot
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();

  // Assign DOM refs
  form           = document.getElementById('report-form');
  fieldTitle     = document.getElementById('field-title');
  fieldDesc      = document.getElementById('field-description');
  fieldBuilding  = document.getElementById('field-building');
  fieldRoom      = document.getElementById('field-room');
  fieldImages    = document.getElementById('field-images');
  errorTitle     = document.getElementById('error-title');
  errorDesc      = document.getElementById('error-description');
  errorBuilding  = document.getElementById('error-building');
  errorRoom      = document.getElementById('error-room');
  errorImages    = document.getElementById('error-images');
  descCounter    = document.getElementById('desc-counter');
  thumbsContainer = document.getElementById('image-thumbnails');
  uploadArea     = document.getElementById('image-upload-area');
  submitBtn      = document.getElementById('submit-report-btn');
  formAlert      = document.getElementById('report-form-alert');
  formWrapper    = document.getElementById('report-form-wrapper');
  successScreen  = document.getElementById('report-success');
  successIdEl    = document.getElementById('success-report-id');
  successViewBtn = document.getElementById('success-view-btn');
  successAnotherBtn = document.getElementById('success-another-btn');

  populateBuildings();
  initDragDrop();

  // Character counter
  fieldDesc.addEventListener('input', () => { updateCounter(); markDirty(); });

  // Mark dirty on any input
  [fieldTitle, fieldBuilding, fieldRoom].forEach((f) => {
    f.addEventListener('input', markDirty);
  });

  // Blur validation
  fieldTitle.addEventListener('blur',    () => validateField(fieldTitle,    errorTitle,    'Issue title'));
  fieldDesc.addEventListener('blur',     () => validateField(fieldDesc,     errorDesc,     'Description'));
  fieldBuilding.addEventListener('blur', () => validateField(fieldBuilding, errorBuilding, 'Building'));
  fieldRoom.addEventListener('blur',     () => validateField(fieldRoom,     errorRoom,     'Room or area'));

  // Image file input
  fieldImages.addEventListener('change', () => {
    const files = Array.from(fieldImages.files);
    processFiles(files);
    // Reset so selecting the same file again fires change
    fieldImages.value = '';
  });

  // Form submit
  form.addEventListener('submit', handleSubmit);

  // Success: report another
  successAnotherBtn.addEventListener('click', resetForm);

  // Beforeunload
  window.addEventListener('beforeunload', handleBeforeUnload);
});
