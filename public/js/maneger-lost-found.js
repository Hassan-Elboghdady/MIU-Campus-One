(function () {
  var INVENTORY_KEY = 'campusone_lost_found_inventory';
  var CLAIMS_KEY = 'campusone_lost_found_claims';
  var toast = document.getElementById('toast');
  var confirmAction = null;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (error) { showToast('Could not load Lost & Found data.'); return []; }
  }
  function writeClaims(claims) {
    try { localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims)); return true; }
    catch (error) { showToast('Could not save the claim update. Please try again.'); return false; }
  }
  function writeInventory(items) {
    try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(items)); return true; }
    catch (error) { showToast('Could not save the inventory update. Please try again.'); return false; }
  }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(function () { toast.classList.remove('show'); }, 2800);
  }
  function askForConfirmation(message, action) {
    confirmAction = action;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').hidden = false;
    document.getElementById('confirm-accept').focus();
  }
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character];
    });
  }
  function makePickupCode() {
    var values = new Uint32Array(4);
    var numbers = '';
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
      values.forEach(function (value) { numbers += String(value % 10); });
    } else {
      numbers = String(Math.floor(1000 + Math.random() * 9000));
    }
    return 'MIU-' + numbers;
  }
  function resetInventoryForm() {
    document.getElementById('manager-inventory-form').reset();
    document.getElementById('manager-inventory-id').value = '';
    document.getElementById('manager-inventory-form').hidden = true;
  }
  function editInventoryItem(id) {
    var item = read(INVENTORY_KEY).find(function (entry) { return entry.id === id; });
    if (!item) { showToast('This inventory item could not be found.'); return; }
    document.getElementById('manager-inventory-id').value = item.id;
    document.getElementById('manager-inventory-name').value = item.name || '';
    document.getElementById('manager-inventory-type').value = item.type || 'found';
    document.getElementById('manager-inventory-category').value = item.category || '';
    document.getElementById('manager-inventory-location').value = item.location || '';
    document.getElementById('manager-inventory-date').value = item.date || '';
    document.getElementById('manager-inventory-details').value = item.details || '';
    document.getElementById('manager-inventory-form').hidden = false;
    document.getElementById('manager-inventory-name').focus();
  }
  function renderInventory() {
    var items = read(INVENTORY_KEY);
    var pending = items.filter(function (item) { return (item.approvalStatus || 'approved') === 'pending'; });
    var list = document.getElementById('inventory-list');
    var allList = document.getElementById('all-inventory-list');
    if (!items.length) {
      list.innerHTML = '<p class="empty-state">No inventory items are waiting for approval.</p>';
      allList.innerHTML = '<p class="empty-state">The inventory is empty.</p>';
      return;
    }
    allList.innerHTML = items.map(function (item) {
      var approvalStatus = item.approvalStatus || 'approved';
      var statusLabel = approvalStatus === 'approved' ? 'Verified' : 'Not verified';
      var statusClass = approvalStatus === 'approved' ? 'badge-found' : 'badge-lost';
      var verificationAction = approvalStatus === 'approved'
        ? '<button class="button button-ghost" type="button" data-reject-item="' + escapeHtml(item.id) + '">Mark not verified</button>'
        : '<button class="button button-primary" type="button" data-approve-item="' + escapeHtml(item.id) + '">Mark verified</button>';
      return '<article class="inventory-card"><span class="badge badge-' + escapeHtml(item.type) + '">' + escapeHtml(item.type) + '</span><span class="badge ' + statusClass + '">' + statusLabel + '</span><h3>' + escapeHtml(item.name) + '</h3><p>' +
        escapeHtml(item.category) + ' · ' + escapeHtml(item.location) + '</p><p>' + escapeHtml(item.details || 'No additional details.') + '</p><p class="report-card__meta">' + escapeHtml(item.date || '') + '</p><div class="inventory-actions"><button class="button button-ghost" type="button" data-edit-item="' + escapeHtml(item.id) + '">Edit</button><button class="button button-ghost" type="button" data-remove-item="' + escapeHtml(item.id) + '">Remove</button>' + verificationAction + '</div></article>';
    }).join('');
    if (!pending.length) {
      list.innerHTML = '<p class="empty-state">No inventory items are waiting for approval.</p>';
      return;
    }
    list.innerHTML = pending.map(function (item) {
      var approvalStatus = item.approvalStatus || 'approved';
      var statusLabel = approvalStatus === 'pending' ? 'Pending approval' : approvalStatus === 'approved' ? 'Approved' : 'Rejected';
      var statusClass = approvalStatus === 'approved' ? 'badge-found' : 'badge-lost';
      var actions = approvalStatus === 'pending'
        ? '<div class="inventory-actions"><button class="button button-primary" type="button" data-approve-item="' + escapeHtml(item.id) + '">Approve item</button>' +
          '<button class="button button-ghost" type="button" data-reject-item="' + escapeHtml(item.id) + '">Reject item</button></div>'
        : '';
      return '<article class="inventory-card"><span class="badge ' + statusClass + '">' + statusLabel + '</span><h3>' + escapeHtml(item.name) + '</h3><p>' +
        escapeHtml(item.category) + ' · ' + escapeHtml(item.location) + '</p><p>' + escapeHtml(item.details || 'No additional details.') +
        '</p>' + actions + '</article>';
    }).join('');
  }
  function renderClaims() {
    var inventory = read(INVENTORY_KEY);
    var claims = read(CLAIMS_KEY);
    var pending = claims.filter(function (claim) { return claim.status === 'Pending verification'; });
    var pendingItems = inventory.filter(function (item) { return (item.approvalStatus || 'approved') === 'pending'; });
    document.getElementById('pending-count').textContent = pending.length + pendingItems.length;
    var list = document.getElementById('claims-list');
    if (!claims.length) {
      list.innerHTML = '<p class="empty-state">No student claims have been submitted yet.</p>';
      return;
    }
    list.innerHTML = claims.map(function (claim) {
      var item = inventory.find(function (entry) { return entry.id === claim.itemId; });
      var itemApproved = item && (item.approvalStatus || 'approved') === 'approved';
      var itemCheck = itemApproved
        ? '<span class="badge badge-found">Item in inventory</span>'
        : '<span class="badge badge-lost">' + (item ? 'Item awaiting approval' : 'Item not in inventory') + '</span>';
      var actions = claim.status === 'Pending verification'
        ? '<div class="claim-controls">' +
          (itemApproved ? '<button class="button button-primary" type="button" data-approve="' + escapeHtml(claim.id) + '">Approve &amp; issue code</button>' : '') +
          '<button class="button button-ghost" type="button" data-reject="' + escapeHtml(claim.id) + '">Reject</button></div>'
        : '<p><strong>Final status:</strong> ' + escapeHtml(claim.status) +
          (claim.pickupCode ? ' · <strong>Pickup code:</strong> ' + escapeHtml(claim.pickupCode) : '') + '</p>';
      return '<article class="claim-card"><div class="claim-card__header"><div>' + itemCheck +
        '<h3>' + escapeHtml(item ? item.name : 'Inventory item unavailable') + '</h3><p><strong>Student:</strong> ' +
        escapeHtml(claim.student && claim.student.name) + ' · <strong>Student ID:</strong> ' + escapeHtml(claim.studentId) +
        '<br><strong>Claimed location:</strong> ' + escapeHtml(claim.location) + '</p></div></div>' +
        '<div class="claim-answers"><strong>Private identifying details</strong><p>' + escapeHtml(claim.uniqueDetails) +
        '</p><strong>What makes this item unique?</strong><p>' + escapeHtml(claim.answers && claim.answers[0]) +
        '</p><strong>What was inside or attached?</strong><p>' + escapeHtml(claim.answers && claim.answers[1]) +
        '</p></div>' + actions + '</article>';
    }).join('');
  }
  function updateClaim(id, status) {
    var claims = read(CLAIMS_KEY);
    var claim = claims.find(function (entry) { return entry.id === id; });
    if (!claim) { showToast('This claim could not be found.'); return; }
    claim.status = status;
    claim.verifiedBy = window.currentManagerName;
    claim.verifiedAt = new Date().toISOString();
    if (status === 'Pickup code issued') {
      claim.pickupCode = makePickupCode();
      claim.codeExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    if (writeClaims(claims)) {
      renderClaims();
      showToast(status === 'Pickup code issued' ? 'Claim approved and pickup code issued.' : 'Claim rejected.');
    }
  }
  function updateInventory(id, status) {
    var items = read(INVENTORY_KEY);
    var item = items.find(function (entry) { return entry.id === id; });
    if (!item) { showToast('This inventory item could not be found.'); return; }
    item.approvalStatus = status;
    item.approvedBy = window.currentManagerName;
    item.approvedAt = new Date().toISOString();
    if (writeInventory(items)) {
      renderInventory();
      renderClaims();
      showToast(status === 'approved' ? 'Inventory item approved.' : 'Inventory item rejected.');
    }
  }
  function configureNavigation(session) {
    if (session.role !== 'admin') return;
    var logo = document.querySelector('.app-header__logo');
    var navigation = document.querySelector('.app-nav');
    if (logo) {
      logo.href = 'admin-panel.html';
      logo.setAttribute('aria-label', 'Go to Admin Panel');
    }
    if (navigation) {
      navigation.innerHTML =
        '<a href="admin-panel.html" class="app-nav__link">Admin Panel</a>' +
        '<a href="manager-dashboard.html" class="app-nav__link">Manager View</a>' +
        '<a href="maneger-lost-found.html" class="app-nav__link" aria-current="page">Lost &amp; Found</a>' +
        '<a href="supervisor-dashboard.html" class="app-nav__link">All Tasks</a>' +
        '<a href="map.html" class="app-nav__link">Campus Map</a>' +
        '<a href="emergency.html" class="app-nav__link">Emergency Map</a>';
    }
  }
  function init() {
    var session = null;
    try { session = JSON.parse(localStorage.getItem('campusone_session') || 'null'); } catch (error) {}
    if (!session) { window.location.replace('login.html'); return; }
    if (['manager', 'supervisor', 'admin'].indexOf(session.role) === -1) { window.location.replace('home.html'); return; }
    configureNavigation(session);
    window.currentManagerName = session.name || 'Manager';
    document.getElementById('nav-initials').textContent = window.currentManagerName.trim().split(/\s+/).map(function (word) { return word[0]; }).slice(0, 2).join('').toUpperCase();
    document.getElementById('nav-user-name').textContent = window.currentManagerName;
    document.getElementById('nav-user-email').textContent = session.email || '';
    var trigger = document.getElementById('profile-trigger');
    var panel = document.getElementById('profile-panel');
    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = panel.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function () { panel.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); });
    document.getElementById('logout-btn').addEventListener('click', function () {
      localStorage.removeItem('campusone_session');
      window.location.replace('login.html');
    });
    document.getElementById('refresh-btn').addEventListener('click', renderClaims);
    document.getElementById('manager-add-item-btn').addEventListener('click', function () {
      document.getElementById('manager-inventory-form').hidden = false;
      document.getElementById('manager-inventory-name').focus();
    });
    document.getElementById('manager-cancel-item-btn').addEventListener('click', resetInventoryForm);
    document.getElementById('manager-inventory-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var items = read(INVENTORY_KEY);
      var id = document.getElementById('manager-inventory-id').value || 'inventory-' + Date.now();
      var existing = items.find(function (entry) { return entry.id === id; });
      var item = {
        id: id,
        name: document.getElementById('manager-inventory-name').value.trim(),
        type: document.getElementById('manager-inventory-type').value,
        category: document.getElementById('manager-inventory-category').value.trim(),
        location: document.getElementById('manager-inventory-location').value.trim(),
        date: document.getElementById('manager-inventory-date').value,
        details: document.getElementById('manager-inventory-details').value.trim(),
        approvalStatus: existing ? (existing.approvalStatus || 'approved') : 'approved'
      };
      var index = items.findIndex(function (entry) { return entry.id === id; });
      if (index === -1) items.unshift(item); else items[index] = item;
      if (writeInventory(items)) {
        resetInventoryForm();
        renderInventory();
        showToast(existing ? 'Inventory item updated.' : 'Inventory item added.');
      }
    });
    document.querySelectorAll('[data-manager-view]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('[data-manager-view]').forEach(function (other) {
          other.classList.toggle('is-active', other === tab);
        });
        document.querySelectorAll('[data-manager-panel]').forEach(function (panel) {
          panel.hidden = panel.dataset.managerPanel !== tab.dataset.managerView;
        });
      });
    });
    function handleInventoryDecision(event) {
      var id = event.target.dataset.approveItem || event.target.dataset.rejectItem;
      if (event.target.dataset.editItem) { editInventoryItem(event.target.dataset.editItem); return; }
      if (event.target.dataset.removeItem) {
        askForConfirmation('Remove this item from the shared inventory? Staff and students will no longer see it.', function () {
          var remaining = read(INVENTORY_KEY).filter(function (item) { return item.id !== event.target.dataset.removeItem; });
          if (writeInventory(remaining)) { renderInventory(); showToast('Inventory item removed.'); }
        });
        return;
      }
      if (!id) return;
      if (event.target.dataset.approveItem) updateInventory(id, 'approved');
      else askForConfirmation('This item will be marked as not verified and will no longer be available for student claims.', function () { updateInventory(id, 'rejected'); });
    }
    document.getElementById('inventory-list').addEventListener('click', handleInventoryDecision);
    document.getElementById('all-inventory-list').addEventListener('click', handleInventoryDecision);
    document.getElementById('claims-list').addEventListener('click', function (event) {
      var id = event.target.dataset.approve || event.target.dataset.reject;
      if (!id) return;
      if (event.target.dataset.approve) {
        var inventory = read(INVENTORY_KEY);
        var claim = read(CLAIMS_KEY).find(function (entry) { return entry.id === id; });
        if (!claim || !inventory.some(function (item) { return item.id === claim.itemId && (item.approvalStatus || 'approved') === 'approved'; })) {
          showToast('Approval blocked: the item must be approved in inventory first.');
          renderInventory();
          renderClaims();
          return;
        }
        updateClaim(id, 'Pickup code issued');
      } else askForConfirmation('Reject this student claim? The student will not receive a pickup code.', function () { updateClaim(id, 'Rejected'); });
    });
    renderInventory();
    renderClaims();
  }
  document.getElementById('confirm-cancel').addEventListener('click', function () {
    document.getElementById('confirm-modal').hidden = true;
    confirmAction = null;
  });
  document.getElementById('confirm-accept').addEventListener('click', function () {
    var action = confirmAction;
    document.getElementById('confirm-modal').hidden = true;
    confirmAction = null;
    if (action) action();
  });
  document.getElementById('confirm-modal').addEventListener('click', function (event) {
    if (event.target.id === 'confirm-modal') document.getElementById('confirm-cancel').click();
  });
  window.addEventListener('storage', function (event) {
    if (event.key === INVENTORY_KEY) {
      renderInventory();
      renderClaims();
    } else if (event.key === CLAIMS_KEY) {
      renderClaims();
    }
  });
  document.addEventListener('DOMContentLoaded', init);
}());
