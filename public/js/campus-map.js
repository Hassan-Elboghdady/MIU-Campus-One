/**
 * campus-map.js
 * CampusOne – Interactive Campus Map Component
 *
 * Renders the verified MIU campus aerial image as a pannable/zoomable map.
 * Locations are rendered directly over the aerial image.
 * Supports:
 *  - Pan (mouse drag / touch)
 *  - Zoom (+/- buttons, mouse wheel, pinch, GPS re-center)
 *  - Complete 22-location directory with unplaced items visible in the sidebar
 *  - Interactive click-to-place on the map in Edit Locations mode
 *  - Drag-to-reposition existing markers manually
 *  - Sidebar & map bidirectional synchronization
 *  - Add / Edit / Delete location modal
 *  - Full persistence via localStorage
 */

// (map-data.js globals: CATEGORIES, loadLocations, saveLocations, resetLocations,
//  filterByCategory, searchLocations, sortLocations, getPlacedLocations, generateId, findById)

// --------------------------------------------------------------------------
// Category SVGs
// --------------------------------------------------------------------------
const ICON_SVG = {
  building: `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M4 2h12v16H4V2zm2 2v12h8V4H6zm1 2h2v2H7V6zm4 0h2v2h-2V6zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2zm-4 4h2v4H7v-4zm4 0h2v4h-2v-4z"/></svg>`,
  restaurant: `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M6 2v6c0 1.1.9 2 2 2h1v8h2v-8h1c1.1 0 2-.9 2-2V2H6zm6 5H8V4h4v3z"/></svg>`,
  supermarket: `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M3 3h2l2.2 9.2a1 1 0 001 .8h7.6a1 1 0 001-.8L18 6H6.1M8 17a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg>`,
  facility: `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><circle cx="10" cy="10" r="7"/><path fill="white" d="M10 6v5l3 2-1 1.7-3.7-2.2V6H10z"/></svg>`,
  entrance: `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2L3 7v11h5v-5h4v5h5V7l-7-5z"/></svg>`,
  emergency: `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2L2 18h16L10 2zm0 4l5.5 10H4.5L10 6zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z"/></svg>`,
};

function capFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --------------------------------------------------------------------------
// CampusMapApp Class
// --------------------------------------------------------------------------
class CampusMapApp {
  constructor(rootSelector, options = {}) {
    this._root =
      typeof rootSelector === 'string'
        ? document.querySelector(rootSelector)
        : rootSelector;

    if (!this._root) throw new Error(`CampusMapApp: root element not found (${rootSelector})`);

    this._isEmergency = options.mode === 'emergency';

    const defaultImg = this._isEmergency
      ? '../public/images/eme_campus_aerial.jpg'
      : '../public/images/campus_aerial.png';

    this._opts = {
      imageSrc:  options.imageSrc  || defaultImg,
      minZoom:   options.minZoom   ?? 0.45,
      maxZoom:   options.maxZoom   ?? 4.0,
      zoomStep:  options.zoomStep  ?? 0.3,
    };

    // User & Permissions
    this._currentUser = options.user || null;
    if (!this._currentUser) {
      try {
        this._currentUser = JSON.parse(localStorage.getItem('campusone_session'));
      } catch (e) {}
    }
    this._canEdit = this._isEmergency
      ? (typeof isAuthorizedEmergencyMapEditor === 'function' ? isAuthorizedEmergencyMapEditor(this._currentUser) : (typeof isAuthorizedMapEditor === 'function' ? isAuthorizedMapEditor(this._currentUser) : false))
      : (typeof isAuthorizedMapEditor === 'function' ? isAuthorizedMapEditor(this._currentUser) : false);

    // Autosave state
    this._saveTimer = null;
    this._statusClearTimer = null;

    // State
    this._locations          = this._isEmergency
      ? (typeof loadEmergencyExits === 'function' ? loadEmergencyExits() : [])
      : (typeof loadLocations === 'function' ? loadLocations() : []);
    this._activeFilter       = 'all';
    this._searchQuery        = '';
    this._sortField          = 'name';
    this._selectedId         = null;
    this._pendingPlacementId = null; // Location waiting to be placed by clicking on map
    this._editMode           = false;
    this._editTarget         = null;

    // Pan/zoom state
    this._scale      = 1;
    this._panX       = 0;
    this._panY       = 0;
    this._imgW       = 0;
    this._imgH       = 0;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._panStartX  = 0;
    this._panStartY  = 0;
    this._hasMoved   = false;
    this._lastPinchDist = null;

    this._build();
    this._bindEvents();
  }

  // --------------------------------------------------------------------------
  // Location Lookup Helper
  // --------------------------------------------------------------------------
  _findLocation(id) {
    if (this._isEmergency) {
      if (typeof findEmergencyExitById === 'function') {
        return findEmergencyExitById(this._locations, id);
      }
    }
    if (typeof findById === 'function') {
      return findById(this._locations, id);
    }
    return this._locations.find((l) => l.id === id);
  }

  // --------------------------------------------------------------------------
  // Build DOM
  // --------------------------------------------------------------------------
  _build() {
    this._root.innerHTML = this._tplPage();
    if (this._isEmergency) {
      this._root.classList.add('map-page--emergency');
    }

    // Cache key DOM nodes
    this._canvasInner    = this._root.querySelector('.map-canvas-inner');
    this._imageContainer = this._root.querySelector('.map-image-container');
    this._bgImage        = this._root.querySelector('.map-bg-image');
    this._markersLayer   = this._root.querySelector('.map-markers-layer');
    this._locationList   = this._root.querySelector('.map-location-list');
    this._searchInput    = this._root.querySelector('#map-search-input');
    this._sortSelect     = this._root.querySelector('#map-sort-select');
    this._filterBtns     = this._root.querySelectorAll('.map-filter-btn');
    this._editBanner     = this._root.querySelector('.map-edit-banner');
    this._editBannerText = this._root.querySelector('.map-edit-banner-text');
    this._editToggleBtn  = this._root.querySelector('#map-edit-toggle');
    this._saveStatusEl   = this._root.querySelector('#map-save-status');
    this._popup          = this._root.querySelector('.map-popup');
    this._modalOverlay   = this._root.querySelector('.map-modal-overlay');
    this._modal          = this._root.querySelector('.map-modal');
    this._zoomInBtn      = this._root.querySelector('#map-zoom-in');
    this._zoomOutBtn     = this._root.querySelector('#map-zoom-out');
    this._gpsBtn         = this._root.querySelector('#map-gps-btn');
    this._compassBtn     = this._root.querySelector('#map-compass-btn');

    // Load image
    this._bgImage.src = this._opts.imageSrc;
  }

  // --------------------------------------------------------------------------
  // Event Bindings
  // --------------------------------------------------------------------------
  _bindEvents() {
    // Image load
    this._bgImage.addEventListener('load', () => this._onImageLoad());
    this._bgImage.addEventListener('error', () => {
      console.warn('CampusMapApp: failed to load campus aerial image at', this._opts.imageSrc);
    });

    // Zoom controls
    this._zoomInBtn.addEventListener('click', () => this._zoom(this._opts.zoomStep));
    this._zoomOutBtn.addEventListener('click', () => this._zoom(-this._opts.zoomStep));
    this._gpsBtn?.addEventListener('click', () => this._resetView());
    this._compassBtn?.addEventListener('click', () => this._resetView());

    // Wheel zoom
    this._canvasInner.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? this._opts.zoomStep : -this._opts.zoomStep;
      this._zoomAt(delta, e.clientX, e.clientY);
    }, { passive: false });

    // Mouse pan
    this._canvasInner.addEventListener('mousedown', (e) => this._onMouseDown(e));
    window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    window.addEventListener('mouseup',   (e) => this._onMouseUp(e));

    // Touch pan + pinch
    this._canvasInner.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    this._canvasInner.addEventListener('touchmove',  (e) => this._onTouchMove(e),  { passive: false });
    this._canvasInner.addEventListener('touchend',   (e) => this._onTouchEnd(e));

    // Search
    this._searchInput.addEventListener('input', () => {
      this._searchQuery = this._searchInput.value;
      this._renderList();
    });

    // Sort
    this._sortSelect.addEventListener('change', () => {
      this._sortField = this._sortSelect.value;
      this._renderList();
    });

    // Category filters
    this._filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        this._activeFilter = cat;
        this._filterBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.category === cat));
        this._renderList();
        this._renderMarkers();
      });
    });

    // Edit toggle button (only rendered for authorized staff & admins)
    if (this._editToggleBtn) {
      this._editToggleBtn.addEventListener('click', () => this._toggleEditMode());
    }

    // Edit banner cancel
    const cancelBtn = this._root.querySelector('.map-edit-banner-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this._setEditMode(false);
      });
    }

    // Popup close
    this._popup.querySelector('.map-popup-close').addEventListener('click', () => this._closePopup());

    // Modal close button
    this._modalOverlay.querySelector('.map-modal-close').addEventListener('click', () => this._closeModal());
    this._modalOverlay.addEventListener('click', (e) => {
      if (e.target === this._modalOverlay) this._closeModal();
    });

    // Modal form submit
    this._modal.querySelector('#map-location-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this._saveLocationFromForm();
    });

    // Modal delete button
    const deleteBtn = this._modal.querySelector('#map-delete-location-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this._deleteLocation();
      });
    }

    // Popup "Edit" button
    const popupEditBtn = this._popup.querySelector('.map-popup-edit-btn');
    if (popupEditBtn) {
      popupEditBtn.addEventListener('click', () => {
        if (this._canEdit && this._selectedId) this._openEditModal(this._selectedId);
      });
    }

    // Window resize
    window.addEventListener('resize', () => {
      this._resetView();
    });
  }

  // --------------------------------------------------------------------------
  // Image Load Handler
  // --------------------------------------------------------------------------
  _onImageLoad() {
    this._imgW = this._bgImage.naturalWidth || 415;
    this._imgH = this._bgImage.naturalHeight || 927;
    this._bgImage.style.width  = this._imgW + 'px';
    this._bgImage.style.height = this._imgH + 'px';
    this._imageContainer.style.width  = this._imgW + 'px';
    this._imageContainer.style.height = this._imgH + 'px';

    this._resetView();
    this._renderList();
    this._renderMarkers();
  }

  // --------------------------------------------------------------------------
  // Reset View to Center Image
  // --------------------------------------------------------------------------
  _resetView() {
    if (!this._imgW || !this._imgH) return;
    const rect = this._canvasInner.getBoundingClientRect();
    const canvasW = rect.width  || this._canvasInner.offsetWidth || 800;
    const canvasH = rect.height || this._canvasInner.offsetHeight || 700;

    const scaleY = (canvasH - 32) / this._imgH;
    const scaleX = (canvasW - 32) / this._imgW;
    this._scale = Math.min(scaleX, scaleY);
    if (this._scale <= 0) this._scale = 0.8;

    this._panX = (canvasW  - this._imgW  * this._scale) / 2;
    this._panY = (canvasH  - this._imgH  * this._scale) / 2;
    this._applyTransform();
    this._renderMarkers();
    if (this._selectedId) {
      const loc = this._findLocation(this._selectedId);
      if (loc && loc.placed) this._showPopup(loc);
    }
  }

  // --------------------------------------------------------------------------
  // Zoom Logic
  // --------------------------------------------------------------------------
  _zoom(delta) {
    const rect = this._canvasInner.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    this._zoomAt(delta, cx, cy);
  }

  _zoomAt(delta, clientX, clientY) {
    const newScale = clamp(this._scale + delta, this._opts.minZoom, this._opts.maxZoom);
    if (newScale === this._scale) return;

    const rect = this._canvasInner.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const ratio = newScale / this._scale;
    this._panX = localX - ratio * (localX - this._panX);
    this._panY = localY - ratio * (localY - this._panY);
    this._scale = newScale;

    this._applyTransform();
    this._renderMarkers();
    if (this._selectedId) {
      const loc = this._findLocation(this._selectedId);
      if (loc && loc.placed) this._showPopup(loc);
    }
  }

  _applyTransform() {
    this._imageContainer.style.transform =
      `translate(${this._panX}px, ${this._panY}px) scale(${this._scale})`;
  }

  // --------------------------------------------------------------------------
  // Mouse Events: Pan & Placement Click
  // --------------------------------------------------------------------------
  _onMouseDown(e) {
    if (e.button !== 0) return;
    this._isDragging  = true;
    this._hasMoved    = false;
    this._dragStartX  = e.clientX;
    this._dragStartY  = e.clientY;
    this._panStartX   = this._panX;
    this._panStartY   = this._panY;
    this._canvasInner.classList.add('is-grabbing');
  }

  _onMouseMove(e) {
    if (!this._isDragging) return;
    const dx = e.clientX - this._dragStartX;
    const dy = e.clientY - this._dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._hasMoved = true;
    this._panX = this._panStartX + dx;
    this._panY = this._panStartY + dy;
    this._applyTransform();
    if (this._selectedId) {
      const loc = this._findLocation(this._selectedId);
      if (loc && loc.placed) this._showPopup(loc);
    }
  }

  _onMouseUp(e) {
    if (!this._isDragging) return;
    this._isDragging = false;
    this._canvasInner.classList.remove('is-grabbing');

    // Treat as click if mouse didn't drag
    if (!this._hasMoved) {
      const rect = this._bgImage.getBoundingClientRect();
      const isInsideImage =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;

      if (isInsideImage) {
        const normX = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const normY = clamp((e.clientY - rect.top)  / rect.height, 0, 1);

        if (this._canEdit && this._editMode) {
          // If a specific location was selected from the sidebar for placement
          if (this._pendingPlacementId) {
            this._placeLocationAt(this._pendingPlacementId, normX, normY);
          } else if (this._selectedId) {
            // Reposition selected location
            this._placeLocationAt(this._selectedId, normX, normY);
          } else {
            // Open modal to add a new custom location at this spot
            this._openAddModal(normX, normY);
          }
        } else {
          // Not edit mode: click on background closes popup
          if (e.target === this._canvasInner || e.target === this._bgImage) {
            this._closePopup();
          }
        }
      } else {
        if (!this._editMode) this._closePopup();
      }
    }
    this._hasMoved = false;
  }

  // --------------------------------------------------------------------------
  // Touch Events
  // --------------------------------------------------------------------------
  _onTouchStart(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this._isDragging = true;
      this._hasMoved   = false;
      this._dragStartX = t.clientX;
      this._dragStartY = t.clientY;
      this._panStartX  = this._panX;
      this._panStartY  = this._panY;
    } else if (e.touches.length === 2) {
      this._isDragging = false;
      this._lastPinchDist = this._pinchDist(e.touches);
    }
  }

  _onTouchMove(e) {
    if (e.touches.length === 1 && this._isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - this._dragStartX;
      const dy = t.clientY - this._dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._hasMoved = true;
      this._panX = this._panStartX + dx;
      this._panY = this._panStartY + dy;
      this._applyTransform();
      if (this._selectedId) {
        const loc = this._findLocation(this._selectedId);
        if (loc && loc.placed) this._showPopup(loc);
      }
    } else if (e.touches.length === 2 && this._lastPinchDist) {
      const dist = this._pinchDist(e.touches);
      const diff = dist - this._lastPinchDist;
      this._lastPinchDist = dist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      this._zoomAt(diff * 0.005, midX, midY);
    }
  }

  _onTouchEnd(e) {
    this._lastPinchDist = null;
    if (this._isDragging && !this._hasMoved && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      if (this._canEdit && this._editMode) {
        const rect = this._bgImage.getBoundingClientRect();
        if (t.clientX >= rect.left && t.clientX <= rect.right &&
            t.clientY >= rect.top  && t.clientY <= rect.bottom) {
          const normX = clamp((t.clientX - rect.left) / rect.width, 0, 1);
          const normY = clamp((t.clientY - rect.top)  / rect.height, 0, 1);
          if (this._pendingPlacementId) {
            this._placeLocationAt(this._pendingPlacementId, normX, normY);
          } else if (this._selectedId) {
            this._placeLocationAt(this._selectedId, normX, normY);
          } else {
            this._openAddModal(normX, normY);
          }
        }
      }
    }
    this._isDragging = false;
    this._hasMoved   = false;
  }

  _pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --------------------------------------------------------------------------
  // Normalized → Canvas Viewport Pixels (For Popup Positioning)
  // --------------------------------------------------------------------------
  _normToCanvas(normX, normY) {
    return {
      px: this._panX + normX * this._imgW * this._scale,
      py: this._panY + normY * this._imgH * this._scale,
    };
  }

  // --------------------------------------------------------------------------
  // Render Markers
  // --------------------------------------------------------------------------
  _renderMarkers() {
    this._markersLayer.innerHTML = '';
    if (!this._imgW) return;

    const visible = this._getFiltered();
    const markerScale = Math.max(0.65, Math.min(1.25, 1 / Math.sqrt(this._scale || 1)));

    visible.forEach((loc) => {
      if (!loc.placed || loc.x === null || loc.y === null) return;
      const marker = this._buildMarker(loc, markerScale);
      this._markersLayer.appendChild(marker);
    });
  }

  _buildMarker(loc, markerScale) {
    if (this._isEmergency) {
      const el = document.createElement('div');
      el.className = `map-marker map-marker--emergency-exit${this._selectedId === loc.id ? ' is-selected' : ''}`;
      el.dataset.locationId = loc.id;
      el.style.left = `${(loc.x * 100).toFixed(2)}%`;
      el.style.top  = `${(loc.y * 100).toFixed(2)}%`;
      el.style.setProperty('--marker-scale', markerScale.toFixed(2));

      const displayLabel = escapeHtml(loc.label || loc.name || 'Emergency Exit');

      el.innerHTML = `
        <div class="emergency-marker-pin">
          <div class="emergency-marker-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
            </svg>
          </div>
          <div class="emergency-marker-label">${displayLabel}</div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectLocation(loc.id);
      });

      // Drag marker in edit mode (authorized staff & admins only)
      if (this._canEdit && this._editMode) {
        el.style.cursor = 'move';
        el.addEventListener('mousedown', (e) => this._startMarkerDrag(e, loc));
      }

      return el;
    }

    const el = document.createElement('div');
    el.className = `map-marker map-marker--${loc.category}${this._selectedId === loc.id ? ' is-selected' : ''}`;
    el.dataset.locationId = loc.id;
    el.style.left = `${(loc.x * 100).toFixed(2)}%`;
    el.style.top  = `${(loc.y * 100).toFixed(2)}%`;
    el.style.setProperty('--marker-scale', markerScale.toFixed(2));

    el.innerHTML = `
      <div class="map-marker-pin">
        <div class="map-marker-dot">
          ${ICON_SVG[loc.category] || ICON_SVG.building}
        </div>
        <div class="map-marker-label">${escapeHtml(loc.name)}</div>
      </div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this._selectLocation(loc.id);
    });

    // Drag marker in edit mode (authorized staff & admins only)
    if (this._canEdit && this._editMode) {
      el.style.cursor = 'move';
      el.addEventListener('mousedown', (e) => this._startMarkerDrag(e, loc));
    }

    return el;
  }

  // --------------------------------------------------------------------------
  // Marker Drag-to-Reposition (Manual Positioning)
  // --------------------------------------------------------------------------
  _startMarkerDrag(e, loc) {
    if (!this._canEdit || !this._editMode) return;
    e.stopPropagation();
    e.preventDefault();

    const onMove = (mv) => {
      const rect = this._bgImage.getBoundingClientRect();
      const normX = clamp((mv.clientX - rect.left) / rect.width, 0, 1);
      const normY = clamp((mv.clientY - rect.top)  / rect.height, 0, 1);
      loc.x = parseFloat(normX.toFixed(4));
      loc.y = parseFloat(normY.toFixed(4));
      loc.placed = true;
      this._renderMarkers();
      if (this._selectedId === loc.id) this._showPopup(loc);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this._persistLocations();
      this._renderList();
      this._updateEditBanner();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // --------------------------------------------------------------------------
  // Place Location at Coordinates
  // --------------------------------------------------------------------------
  _placeLocationAt(id, normX, normY) {
    if (!this._canEdit) return;
    const loc = this._findLocation(id);
    if (!loc) return;

    loc.x = parseFloat(normX.toFixed(4));
    loc.y = parseFloat(normY.toFixed(4));
    loc.placed = true;

    this._persistLocations();
    this._pendingPlacementId = null;
    this._renderList();
    this._renderMarkers();
    this._selectLocation(loc.id);
    this._updateEditBanner(`✅ Placed "${loc.name}". You can drag its pin to adjust.`);
  }

  // --------------------------------------------------------------------------
  // Render Sidebar List
  // --------------------------------------------------------------------------
  _renderList() {
    const filtered = this._getFiltered();

    if (filtered.length === 0) {
      this._locationList.innerHTML = '<p class="map-no-results">No locations match your search.</p>';
      return;
    }

    this._locationList.innerHTML = filtered
      .map((loc) => this._tplListItem(loc))
      .join('');

    // Bind click events on list items
    this._locationList.querySelectorAll('.map-location-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.locationId;
        this._onSidebarItemClick(id);
      });
    });
  }

  _tplListItem(loc) {
    const isSelected = loc.id === this._selectedId;
    const isPending  = loc.id === this._pendingPlacementId;
    let stateClass = '';
    if (isPending) stateClass = ' is-pending-placement';
    else if (isSelected) stateClass = ' is-active';

    if (this._isEmergency) {
      const statusClass = loc.status === 'operational'
        ? 'emergency-status-badge--operational'
        : 'emergency-status-badge--standby';
      const statusText = loc.status === 'operational' ? 'Operational' : 'Standby';

      return `
        <button class="map-location-item${stateClass}" data-location-id="${loc.id}" type="button">
          <div class="emergency-marker-icon" style="width:28px;height:28px;border-radius:6px;box-shadow:none;" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
            </svg>
          </div>
          <div class="map-location-info">
            <div class="map-location-name">${escapeHtml(loc.name)}</div>
            <div class="map-location-cat">
              <span>${escapeHtml(loc.zone || 'Campus Perimeter')}</span>
              <span class="emergency-status-badge ${statusClass}">${statusText}</span>
            </div>
          </div>
          <svg class="map-location-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l4 4-4 4"/></svg>
        </button>
      `;
    }

    const catObj = CATEGORIES[loc.category];
    const catLabel = catObj ? catObj.label.replace(/s$/, '') : capFirst(loc.category);
    const unplacedBadge = !loc.placed
      ? `<span class="map-unplaced-badge" title="Not placed on map yet">Not placed</span>`
      : '';

    return `
      <button class="map-location-item${stateClass}" data-location-id="${loc.id}" type="button">
        <div class="map-location-icon map-location-icon--${loc.category}">
          ${ICON_SVG[loc.category] || ICON_SVG.building}
        </div>
        <div class="map-location-info">
          <div class="map-location-name">${escapeHtml(loc.name)}</div>
          <div class="map-location-cat">${catLabel} ${unplacedBadge}</div>
        </div>
        <svg class="map-location-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l4 4-4 4"/></svg>
      </button>
    `;
  }

  // --------------------------------------------------------------------------
  // Sidebar Item Click Handler
  // --------------------------------------------------------------------------
  _onSidebarItemClick(id) {
    const loc = this._findLocation(id);
    if (!loc) return;

    this._selectedId = id;

    if (loc.placed && loc.x !== null && loc.y !== null) {
      // Placed location: pan to it, highlight, and show popup
      this._pendingPlacementId = null;
      this._panToLocation(id);
      this._showPopup(loc);
      this._renderMarkers();
      this._renderList();
    } else {
      // Unplaced location
      this._closePopup();
      if (this._editMode) {
        // In edit mode: activate placement target
        this._pendingPlacementId = id;
        this._renderList();
        this._updateEditBanner(`📍 Click anywhere on the map to place "${loc.name}".`);
      } else {
        // Out of edit mode: show hint popup with button to place it
        this._renderList();
        this._showUnplacedNotice(loc);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Select Location
  // --------------------------------------------------------------------------
  _selectLocation(id) {
    this._selectedId = id;
    const loc = this._findLocation(id);
    if (!loc) return;

    this._renderMarkers();
    this._renderList();

    if (loc.placed && loc.x !== null) {
      this._showPopup(loc);
    }
  }

  // --------------------------------------------------------------------------
  // Pan to Location
  // --------------------------------------------------------------------------
  _panToLocation(id) {
    const loc = this._findLocation(id);
    if (!loc || !loc.placed || loc.x === null) return;
    const rect = this._canvasInner.getBoundingClientRect();
    this._panX = rect.width  / 2 - loc.x * this._imgW * this._scale;
    this._panY = rect.height / 2 - loc.y * this._imgH * this._scale;
    this._applyTransform();
    this._renderMarkers();
  }

  // --------------------------------------------------------------------------
  // Popup
  // --------------------------------------------------------------------------
  _showPopup(loc) {
    const { px, py } = this._normToCanvas(loc.x, loc.y);

    if (this._isEmergency) {
      this._popup.style.left = px + 'px';
      this._popup.style.top  = (py - 12) + 'px';
      this._popup.querySelector('.map-popup-cat').textContent  = (loc.zone || 'Emergency Exit').toUpperCase();
      this._popup.querySelector('.map-popup-name').textContent = loc.name;
      const statusNote = loc.status === 'operational'
        ? '✓ Operational evacuation route'
        : '⚠ Standby - maintenance check';
      const desc = loc.description ? `${loc.description}\n(${statusNote})` : statusNote;
      this._popup.querySelector('.map-popup-desc').textContent = desc;
    } else {
      const catObj = CATEGORIES[loc.category];
      const catLabel = catObj ? catObj.label.replace(/s$/, '') : capFirst(loc.category);
      this._popup.style.left = px + 'px';
      this._popup.style.top  = (py - 12) + 'px';
      this._popup.querySelector('.map-popup-cat').textContent  = catLabel;
      this._popup.querySelector('.map-popup-name').textContent = loc.name;
      this._popup.querySelector('.map-popup-desc').textContent = loc.description || 'Misr International University Campus';
    }

    const popupEditBtn = this._popup.querySelector('.map-popup-edit-btn');
    if (popupEditBtn) {
      popupEditBtn.style.display = this._canEdit ? '' : 'none';
      if (this._isEmergency) {
        popupEditBtn.textContent = 'Edit exit details';
      }
    }
    this._popup.style.display = 'block';
    this._popup.dataset.locationId = loc.id;
  }

  _showUnplacedNotice(loc) {
    // Show banner prompt to position location
    if (this._canEdit) {
      this._updateEditBanner(`"${loc.name}" has not been placed yet. Turn on Edit Locations to position it on the map.`);
    } else {
      this._updateEditBanner(`"${loc.name}" has not been placed on the map yet.`);
    }
    this._editBanner.classList.add('is-visible');
    setTimeout(() => {
      if (!this._editMode) this._editBanner.classList.remove('is-visible');
    }, 4500);
  }

  _closePopup() {
    this._popup.style.display = 'none';
    this._selectedId = null;
    this._renderMarkers();
    this._renderList();
  }

  // --------------------------------------------------------------------------
  // Edit Mode
  // --------------------------------------------------------------------------
  _toggleEditMode() {
    if (!this._canEdit) return;
    this._setEditMode(!this._editMode);
  }

  _setEditMode(on) {
    if (!this._canEdit) {
      this._editMode = false;
      return;
    }
    this._editMode = on;
    this._canvasInner.classList.toggle('is-edit-mode', on);
    if (this._editToggleBtn) this._editToggleBtn.classList.toggle('is-active', on);
    this._editBanner.classList.toggle('is-visible', on);

    if (on) {
      if (this._selectedId) {
        const loc = this._findLocation(this._selectedId);
        if (loc && !loc.placed) {
          this._pendingPlacementId = loc.id;
          this._updateEditBanner(`📍 Click anywhere on the map to place "${loc.name}".`);
        } else {
          this._updateEditBanner();
        }
      } else {
        this._updateEditBanner();
      }
    } else {
      this._pendingPlacementId = null;
      this._renderList();
    }

    this._renderMarkers();
  }

  _updateEditBanner(customMsg) {
    if (customMsg) {
      this._editBannerText.textContent = customMsg;
      return;
    }
    if (this._pendingPlacementId) {
      const loc = this._findLocation(this._pendingPlacementId);
      this._editBannerText.textContent = `📍 Click on the map to place "${loc ? loc.name : 'location'}".`;
    } else {
      if (this._isEmergency) {
        this._editBannerText.textContent = 'Edit mode active — drag any red exit marker to reposition or click on the map to add an exit.';
      } else {
        this._editBannerText.textContent = 'Edit mode active — select a location in the sidebar to place it, or drag any marker to reposition.';
      }
    }
  }

  // --------------------------------------------------------------------------
  // Add / Edit Modal
  // --------------------------------------------------------------------------
  _openAddModal(normX, normY) {
    if (!this._canEdit) return;
    if (this._isEmergency) {
      this._editTarget = {
        id:          typeof generateEmergencyExitId === 'function' ? generateEmergencyExitId() : ('exit-' + Date.now()),
        name:        '',
        label:       'Emergency Exit',
        zone:        'Campus Perimeter',
        status:      'operational',
        description: '',
        placed:      normX !== null,
        x:           normX !== null ? parseFloat(normX.toFixed(4)) : null,
        y:           normY !== null ? parseFloat(normY.toFixed(4)) : null,
      };
      this._populateForm(this._editTarget, true);
      this._openModal('Add Emergency Exit');
      return;
    }
    this._editTarget = {
      id:          generateId(),
      name:        '',
      category:    'building',
      description: '',
      placed:      normX !== null,
      x:           normX !== null ? parseFloat(normX.toFixed(4)) : null,
      y:           normY !== null ? parseFloat(normY.toFixed(4)) : null,
    };
    this._populateForm(this._editTarget, true);
    this._openModal('Add Location');
  }

  _openEditModal(id) {
    if (!this._canEdit) return;
    const loc = this._findLocation(id);
    if (!loc) return;
    this._editTarget = structuredClone(loc);
    this._populateForm(this._editTarget, false);
    this._openModal(this._isEmergency ? 'Edit Emergency Exit' : 'Edit Location');
  }

  _populateForm(loc, isNew) {
    const form = this._modal.querySelector('#map-location-form');
    form.querySelector('#form-name').value = loc.name || '';

    if (this._isEmergency) {
      const labelEl = form.querySelector('#form-label');
      if (labelEl) labelEl.value = loc.label || 'Emergency Exit';
      const zoneEl = form.querySelector('#form-zone');
      if (zoneEl) zoneEl.value = loc.zone || 'Campus Perimeter';
      const statusEl = form.querySelector('#form-status');
      if (statusEl) statusEl.value = loc.status || 'operational';
    } else {
      const catEl = form.querySelector('#form-category');
      if (catEl) catEl.value = loc.category || 'building';
    }

    form.querySelector('#form-description').value = loc.description || '';
    form.querySelector('#form-x').value = (loc.x !== null && loc.x !== undefined) ? loc.x.toFixed(4) : '';
    form.querySelector('#form-y').value = (loc.y !== null && loc.y !== undefined) ? loc.y.toFixed(4) : '';

    const deleteBtn = this._modal.querySelector('#map-delete-location-btn');
    if (deleteBtn) {
      deleteBtn.style.display = isNew ? 'none' : '';
    }
  }

  _openModal(title) {
    if (!this._canEdit) return;
    this._modal.querySelector('.map-modal-title').textContent = title;
    this._modalOverlay.classList.add('is-open');
  }

  _closeModal() {
    this._modalOverlay.classList.remove('is-open');
    this._editTarget = null;
  }

  _saveLocationFromForm() {
    if (!this._canEdit || !this._editTarget) return;

    const form = this._modal.querySelector('#map-location-form');
    this._editTarget.name = form.querySelector('#form-name').value.trim();
    if (!this._editTarget.name) {
      form.querySelector('#form-name').focus();
      return;
    }

    if (this._isEmergency) {
      const labelInput = form.querySelector('#form-label');
      if (labelInput) this._editTarget.label = labelInput.value.trim() || 'Emergency Exit';
      const zoneInput = form.querySelector('#form-zone');
      if (zoneInput) this._editTarget.zone = zoneInput.value.trim() || 'Campus Perimeter';
      const statusSelect = form.querySelector('#form-status');
      if (statusSelect) this._editTarget.status = statusSelect.value || 'operational';
    } else {
      const catSelect = form.querySelector('#form-category');
      if (catSelect) this._editTarget.category = catSelect.value;
    }

    this._editTarget.description = form.querySelector('#form-description').value.trim();

    const xRaw = parseFloat(form.querySelector('#form-x').value);
    const yRaw = parseFloat(form.querySelector('#form-y').value);
    if (!isNaN(xRaw) && !isNaN(yRaw)) {
      this._editTarget.x = clamp(xRaw, 0, 1);
      this._editTarget.y = clamp(yRaw, 0, 1);
      this._editTarget.placed = true;
    }

    const existing = this._findLocation(this._editTarget.id);
    if (existing) {
      Object.assign(existing, this._editTarget);
    } else {
      this._locations.push(this._editTarget);
    }

    this._persistLocations();
    this._closeModal();
    this._renderList();
    this._renderMarkers();
    this._selectLocation(this._editTarget.id);
  }

  _deleteLocation() {
    if (!this._canEdit || !this._editTarget) return;
    const id = this._editTarget.id;
    if (this._isEmergency) {
      const exitTitle = this._editTarget.name || 'this emergency exit';
      if (!confirm(`Are you sure you want to delete "${exitTitle}"? This action cannot be undone.`)) {
        return;
      }
    }
    this._locations = this._locations.filter((l) => l.id !== id);
    this._persistLocations();
    this._closeModal();
    this._closePopup();
    this._renderList();
    this._renderMarkers();
  }

  /**
   * Automatically persist location changes to browser localStorage.
   * Displays immediate status indicator (Saving…, Saved, Save failed).
   */
  _persistLocations() {
    // Only authorized staff and admins can persist changes
    if (!this._canEdit) return;

    this._setSaveStatus('saving');

    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }

    this._saveTimer = setTimeout(() => {
      try {
        const ok = this._isEmergency
          ? saveEmergencyExits(this._locations)
          : saveLocations(this._locations);
        if (ok) {
          this._setSaveStatus('saved');
        } else {
          this._setSaveStatus('error', 'Storage failed');
        }
      } catch (err) {
        console.error('CampusMapApp: autosave failed:', err);
        this._setSaveStatus('error', 'Save failed');
      }
    }, 150);
  }

  /**
   * Display autosave status feedback to the user.
   * @param {'idle'|'saving'|'saved'|'error'} status
   * @param {string} [message]
   */
  _setSaveStatus(status, message) {
    if (!this._saveStatusEl) return;
    if (this._statusClearTimer) {
      clearTimeout(this._statusClearTimer);
      this._statusClearTimer = null;
    }

    this._saveStatusEl.className = 'map-save-status';

    if (status === 'saving') {
      this._saveStatusEl.classList.add('map-save-status--saving');
      this._saveStatusEl.innerHTML = '<span class="map-save-spinner" aria-hidden="true"></span><span>Saving…</span>';
    } else if (status === 'saved') {
      this._saveStatusEl.classList.add('map-save-status--saved');
      this._saveStatusEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg><span>Saved</span>';
      this._statusClearTimer = setTimeout(() => {
        if (this._saveStatusEl) this._saveStatusEl.classList.add('is-hidden');
      }, 2500);
    } else if (status === 'error') {
      this._saveStatusEl.classList.add('map-save-status--error');
      const safeMsg = message ? String(message).replace(/</g, '&lt;') : 'Save failed';
      this._saveStatusEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="11.5" r="1"/></svg><span title="${safeMsg}">Save failed</span>`;
      this._statusClearTimer = setTimeout(() => {
        if (this._saveStatusEl) this._saveStatusEl.classList.add('is-hidden');
      }, 5000);
    } else {
      this._saveStatusEl.classList.add('is-hidden');
    }
  }

  _getFiltered() {
    if (this._isEmergency) {
      let result = filterEmergencyExits(this._locations, this._activeFilter);
      result = searchEmergencyExits(result, this._searchQuery);
      result = sortEmergencyExits(result, this._sortField);
      return result;
    }
    let result = filterByCategory(this._locations, this._activeFilter);
    result = searchLocations(result, this._searchQuery);
    result = sortLocations(result, this._sortField);
    return result;
  }

  // --------------------------------------------------------------------------
  // HTML Template (Map/Satellite Controls Completely Removed)
  // --------------------------------------------------------------------------
  _tplPage() {
    if (this._isEmergency) {
      return this._tplEmergencyPage();
    }

    const catBtns = [
      { id: 'all',         label: 'All',          icon: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>` },
      { id: 'building',    label: 'Buildings',    icon: ICON_SVG.building },
      { id: 'restaurant',  label: 'Food & Dining',icon: ICON_SVG.restaurant },
      { id: 'supermarket', label: 'Supermarkets', icon: ICON_SVG.supermarket },
      { id: 'facility',    label: 'Facilities',   icon: ICON_SVG.facility },
      { id: 'entrance',    label: 'Entrances',    icon: ICON_SVG.entrance },
      { id: 'emergency',   label: 'Emergency',    icon: ICON_SVG.emergency },
    ];

    const filterHtml = catBtns.map((c) => `
      <button class="map-filter-btn${c.id === 'all' ? ' is-active' : ''}" data-category="${c.id}" type="button" title="${c.label}">
        ${c.icon}
        <span>${c.label}</span>
      </button>
    `).join('');

    const categoryOptions = Object.values(CATEGORIES)
      .map((c) => `<option value="${c.id}">${c.label}</option>`)
      .join('');

    return `
      <div class="map-layout">
        <!-- Sidebar -->
        <aside class="map-sidebar" aria-label="Campus locations">
          <div class="map-sidebar-head">
            <h1 class="map-sidebar-title">Campus Map</h1>
            <p class="map-sidebar-subtitle">Find buildings, food outlets, supermarkets, and university facilities.</p>
          </div>

          <div class="map-search-wrap">
            <div class="map-search-field">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>
              <input
                id="map-search-input"
                class="map-search-input"
                type="search"
                placeholder="Search for buildings, dining, supermarkets…"
                autocomplete="off"
                aria-label="Search locations"
              />
            </div>
          </div>

          <div class="map-filters" role="group" aria-label="Category filters">
            <div class="map-filter-grid">
              ${filterHtml}
            </div>
          </div>

          <div class="map-sort-row">
            <span class="map-sort-label">Locations</span>
            <div class="map-sort-select-wrap">
              <select id="map-sort-select" class="map-sort-select" aria-label="Sort by">
                <option value="name">Name (A–Z)</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          <div class="map-location-list" role="list" aria-label="Location list">
            <!-- filled by JS -->
          </div>

          <a href="my-reports.html" class="map-sidebar-help">
            <span class="map-sidebar-help-icon">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
            </span>
            <span class="map-sidebar-help-text">
              Need help?
              <small>Check the Maintenance page for reporting issues or finding university services.</small>
            </span>
            <svg class="map-sidebar-help-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l4 4-4 4"/></svg>
          </a>
        </aside>

        <!-- Map canvas card -->
        <div class="map-canvas-area" aria-label="Interactive campus map">

          <!-- Left controls: zoom + GPS -->
          <div class="map-controls" aria-label="Map zoom controls">
            <div class="map-ctrl-group">
              <button id="map-zoom-in"  class="map-ctrl-btn" type="button" aria-label="Zoom in" title="Zoom in">+</button>
              <button id="map-zoom-out" class="map-ctrl-btn" type="button" aria-label="Zoom out" title="Zoom out">−</button>
              <button id="map-gps-btn"  class="map-ctrl-btn" type="button" aria-label="Center view" title="Re-center on Campus">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="4"/><line x1="8" y1="12" x2="8" y2="15"/><line x1="1" y1="8" x2="4" y2="8"/><line x1="12" y1="8" x2="15" y2="8"/></svg>
              </button>
            </div>
          </div>

          <!-- Top-right controls: Compass, Autosave status & Edit toggle -->
          <div class="map-controls-topright">
            <div id="map-save-status" class="map-save-status is-hidden" aria-live="polite"></div>
            <button id="map-compass-btn" class="map-compass-rose" type="button" aria-label="Compass" title="Reset North">
              <span class="compass-n">N</span>
              <span class="compass-needle"></span>
            </button>
            ${this._canEdit ? `
            <button id="map-edit-toggle" class="map-edit-toggle-btn" type="button" aria-label="Toggle edit locations mode">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2.5l2 2-7 7-2.5.5.5-2.5 7-7z"/></svg>
              Edit Locations
            </button>` : ''}
          </div>

          <!-- Bottom-right: Scale indicator bar -->
          <div class="map-scale-bar" aria-label="Scale: 100 meters">
            <div class="scale-labels">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>100 m</span>
            </div>
            <div class="scale-ruler"></div>
          </div>

          <!-- Pan/zoom canvas -->
          <div class="map-canvas-inner" aria-label="Drag to pan, scroll to zoom">
            <div class="map-image-container">
              <img class="map-bg-image" src="${this._opts.imageSrc}" alt="MIU campus aerial photograph" draggable="false" />
              <div class="map-markers-layer" aria-label="Campus location markers"></div>
            </div>
          </div>

          <!-- Location popup card -->
          <div class="map-popup" role="dialog" aria-label="Location details" style="display:none; position:absolute;">
            <button class="map-popup-close" type="button" aria-label="Close popup">×</button>
            <div class="map-popup-cat"></div>
            <div class="map-popup-name"></div>
            <div class="map-popup-desc"></div>
            ${this._canEdit ? '<button class="map-popup-edit-btn" type="button">Edit details</button>' : ''}
          </div>

          <!-- Edit mode banner -->
          <div class="map-edit-banner" role="status" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            <span class="map-edit-banner-text">Edit mode active — select a location in the sidebar to place it, or drag any marker to reposition.</span>
            <button class="map-edit-banner-cancel" type="button">Exit</button>
          </div>
        </div>
      </div>

      <!-- Edit / Add location modal -->
      <div class="map-modal-overlay" role="dialog" aria-modal="true" aria-label="Edit location">
        <div class="map-modal">
          <div class="map-modal-head">
            <h2 class="map-modal-title">Edit Location</h2>
            <button class="map-modal-close" type="button" aria-label="Close">×</button>
          </div>

          <form class="map-modal-body" id="map-location-form" novalidate>
            <div class="map-form-group">
              <label class="map-form-label" for="form-name">Name <span style="color:var(--color-primary)">*</span></label>
              <input id="form-name" class="map-form-input" type="text" required placeholder="e.g. Main Building" />
            </div>

            <div class="map-form-group">
              <label class="map-form-label" for="form-category">Category</label>
              <select id="form-category" class="map-form-select">
                ${categoryOptions}
              </select>
            </div>

            <div class="map-form-group">
              <label class="map-form-label" for="form-description">Description</label>
              <textarea id="form-description" class="map-form-textarea" placeholder="Brief description of the location…"></textarea>
            </div>

            <div class="map-form-group">
              <label class="map-form-label">Position (0–1 normalised image coordinates)</label>
              <div class="map-form-coords">
                <input id="form-x" class="map-form-input" type="number" step="0.0001" min="0" max="1" placeholder="X" aria-label="X position" />
                <input id="form-y" class="map-form-input" type="number" step="0.0001" min="0" max="1" placeholder="Y" aria-label="Y position" />
              </div>
              <p class="map-form-hint">Tip: In Edit mode, click on the map to place an unplaced item or drag an existing marker to fine-tune.</p>
            </div>
          </form>

          <div class="map-modal-foot">
            <button id="map-delete-location-btn" class="map-delete-btn" type="button">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h10m-7 0V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m1 0v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4"/></svg>
              Delete
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.map-modal-overlay').classList.remove('is-open')">Cancel</button>
            <button type="submit" form="map-location-form" class="btn btn-primary btn-sm">Save</button>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Emergency Map HTML Template
  // --------------------------------------------------------------------------
  _tplEmergencyPage() {
    return `
      <div class="map-layout">
        <!-- Sidebar -->
        <aside class="map-sidebar" aria-label="Campus emergency exits">
          <div class="map-sidebar-head">
            <h1 class="map-sidebar-title">Emergency Map</h1>
            <p class="map-sidebar-subtitle">Campus evacuation exits, designated assembly zones, and 24/7 security dispatch.</p>
          </div>

          <div class="map-search-wrap">
            <div class="map-search-field">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>
              <input
                id="map-search-input"
                class="map-search-input"
                type="search"
                placeholder="Search emergency exits, zones, notes…"
                autocomplete="off"
                aria-label="Search emergency exits"
              />
            </div>
          </div>

          <div class="map-filters" role="group" aria-label="Status filters">
            <div class="map-filter-grid" style="grid-template-columns: repeat(3, 1fr);">
              <button class="map-filter-btn is-active" data-category="all" type="button" title="All Exits">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>
                <span>All</span>
              </button>
              <button class="map-filter-btn" data-category="operational" type="button" title="Operational Exits">
                <svg viewBox="0 0 20 20" fill="#22c55e" width="16" height="16"><circle cx="10" cy="10" r="7"/><path fill="#ffffff" d="M8.5 12.5l-2-2 1.4-1.4 1.1 1.1 3.5-3.5 1.4 1.4z"/></svg>
                <span>Active</span>
              </button>
              <button class="map-filter-btn" data-category="standby" type="button" title="Standby Exits">
                <svg viewBox="0 0 20 20" fill="#eab308" width="16" height="16"><circle cx="10" cy="10" r="7"/><rect x="9" y="5" width="2" height="6" fill="#ffffff" rx="1"/><rect x="9" y="13" width="2" height="2" fill="#ffffff" rx="1"/></svg>
                <span>Standby</span>
              </button>
            </div>
          </div>

          <div class="map-sort-row">
            <span class="map-sort-label">Emergency Exits</span>
            <div class="map-sort-select-wrap">
              <select id="map-sort-select" class="map-sort-select" aria-label="Sort by">
                <option value="name">Name (A–Z)</option>
                <option value="zone">Zone Area</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          <div class="map-location-list" role="list" aria-label="Emergency exit list">
            <!-- filled by JS -->
          </div>

          <!-- Emergency 24/7 Helpline Card -->
          <div class="emergency-helpline-card" role="region" aria-label="Campus emergency contacts">
            <div class="emergency-helpline-head">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span>Emergency Contacts</span>
            </div>
            <div class="emergency-helpline-numbers">
              <div class="emergency-helpline-item">Campus Hotline: <strong>19888</strong></div>
              <div class="emergency-helpline-item">Security Desk: <strong>Ext. 101</strong></div>
              <div class="emergency-helpline-item">MIU Clinic: <strong>Ext. 102</strong></div>
              <div class="emergency-helpline-item">Ambulance: <strong>123</strong></div>
            </div>
          </div>
        </aside>

        <!-- Map canvas card -->
        <div class="map-canvas-area" aria-label="Interactive emergency evacuation map">

          <!-- Left controls: zoom + GPS -->
          <div class="map-controls" aria-label="Map zoom controls">
            <div class="map-ctrl-group">
              <button id="map-zoom-in"  class="map-ctrl-btn" type="button" aria-label="Zoom in" title="Zoom in">+</button>
              <button id="map-zoom-out" class="map-ctrl-btn" type="button" aria-label="Zoom out" title="Zoom out">−</button>
              <button id="map-gps-btn"  class="map-ctrl-btn" type="button" aria-label="Center view" title="Re-center on Campus">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="4"/><line x1="8" y1="12" x2="8" y2="15"/><line x1="1" y1="8" x2="4" y2="8"/><line x1="12" y1="8" x2="15" y2="8"/></svg>
              </button>
            </div>
          </div>

          <!-- Top-right controls: Compass, Autosave status & Edit toggle -->
          <div class="map-controls-topright">
            <div id="map-save-status" class="map-save-status is-hidden" aria-live="polite"></div>
            <button id="map-compass-btn" class="map-compass-rose" type="button" aria-label="Compass" title="Reset North">
              <span class="compass-n">N</span>
              <span class="compass-needle"></span>
            </button>
            ${this._canEdit ? `
            <button id="map-edit-toggle" class="map-edit-toggle-btn" type="button" aria-label="Toggle edit emergency exits mode">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2.5l2 2-7 7-2.5.5.5-2.5 7-7z"/></svg>
              Edit Exits
            </button>` : ''}
          </div>

          <!-- Bottom-left: Floating Legend Card matching reference visual -->
          <div class="emergency-legend-card" aria-label="Emergency exit legend">
            <div class="emergency-legend-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
              </svg>
            </div>
            <div class="emergency-legend-copy">
              <div class="emergency-legend-title">Emergency Exit</div>
              <div class="emergency-legend-sub">Locate the nearest exit</div>
            </div>
          </div>

          <!-- Pan/zoom canvas -->
          <div class="map-canvas-inner" aria-label="Drag to pan, scroll to zoom">
            <div class="map-image-container">
              <img class="map-bg-image" src="${this._opts.imageSrc}" alt="MIU campus emergency aerial photograph" draggable="false" />
              <div class="map-markers-layer" aria-label="Emergency exit markers"></div>
            </div>
          </div>

          <!-- Emergency exit popup card -->
          <div class="map-popup" role="dialog" aria-label="Emergency exit details" style="display:none; position:absolute;">
            <button class="map-popup-close" type="button" aria-label="Close popup">×</button>
            <div class="map-popup-cat"></div>
            <div class="map-popup-name"></div>
            <div class="map-popup-desc"></div>
            ${this._canEdit ? '<button class="map-popup-edit-btn" type="button">Edit exit details</button>' : ''}
          </div>

          <!-- Edit mode banner -->
          <div class="map-edit-banner" role="status" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            <span class="map-edit-banner-text">Edit mode active — drag any red exit marker to reposition or click on the map to add an exit.</span>
            <button class="map-edit-banner-cancel" type="button">Exit</button>
          </div>
        </div>
      </div>

      <!-- Add / Edit Emergency Exit modal -->
      <div class="map-modal-overlay" role="dialog" aria-modal="true" aria-label="Edit emergency exit">
        <div class="map-modal">
          <div class="map-modal-head">
            <h2 class="map-modal-title">Edit Emergency Exit</h2>
            <button class="map-modal-close" type="button" aria-label="Close">×</button>
          </div>

          <form class="map-modal-body" id="map-location-form" novalidate>
            <div class="map-form-group">
              <label class="map-form-label" for="form-name">Exit Name <span style="color:#ef4444">*</span></label>
              <input id="form-name" class="map-form-input" type="text" required placeholder="e.g. North Emergency Exit" />
            </div>

            <div class="map-form-group">
              <label class="map-form-label" for="form-label">Marker Tag Label</label>
              <input id="form-label" class="map-form-input" type="text" placeholder="e.g. Emergency Exit" />
            </div>

            <div class="map-form-group">
              <label class="map-form-label" for="form-zone">Campus Zone / Area</label>
              <input id="form-zone" class="map-form-input" type="text" placeholder="e.g. North Academic Wing" />
            </div>

            <div class="map-form-group">
              <label class="map-form-label" for="form-status">Operational Status</label>
              <select id="form-status" class="map-form-select">
                <option value="operational">Operational (Clear & Active)</option>
                <option value="standby">Standby (Under Inspection)</option>
              </select>
            </div>

            <div class="map-form-group">
              <label class="map-form-label" for="form-description">Evacuation Instructions & Notes</label>
              <textarea id="form-description" class="map-form-textarea" placeholder="Instructions, assembly point, or access guidance…"></textarea>
            </div>

            <div class="map-form-group">
              <label class="map-form-label">Position (0–1 normalised image coordinates)</label>
              <div class="map-form-coords">
                <input id="form-x" class="map-form-input" type="number" step="0.0001" min="0" max="1" placeholder="X" aria-label="X position" />
                <input id="form-y" class="map-form-input" type="number" step="0.0001" min="0" max="1" placeholder="Y" aria-label="Y position" />
              </div>
              <p class="map-form-hint">Tip: Drag the glowing red exit pin on the map to adjust position in real time.</p>
            </div>
          </form>

          <div class="map-modal-foot">
            <button id="map-delete-location-btn" class="map-delete-btn" type="button">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h10m-7 0V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m1 0v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4"/></svg>
              Delete
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.map-modal-overlay').classList.remove('is-open')">Cancel</button>
            <button type="submit" form="map-location-form" class="btn btn-primary btn-sm">Save Exit</button>
          </div>
        </div>
      </div>
    `;
  }
}
