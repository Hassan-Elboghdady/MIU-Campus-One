(function () {
  var REPORTS_KEY = 'campusone_lost_found_reports';
  var INVENTORY_KEY = 'campusone_lost_found_inventory';
  var CLAIMS_KEY = 'campusone_lost_found_claims';
  var toast = document.getElementById('toast');
  var currentUser;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (error) { showToast('Could not load Lost & Found data.'); return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { showToast('Could not save changes. Please try again.'); return false; }
  }
  function showToast(message) {
    toast.textContent = message; toast.classList.add('show');
    window.setTimeout(function () { toast.classList.remove('show'); }, 2800);
  }
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]; });
  }
  function formatDate(value) { return value ? new Date(value + 'T00:00:00').toLocaleDateString() : 'No date'; }
  function renderReports() {
    var filter = document.getElementById('report-filter').value;
    var reports = read(REPORTS_KEY, []).filter(function (report) { return filter === 'all' || report.type === filter; });
    document.getElementById('report-count').textContent = read(REPORTS_KEY, []).length;
    document.getElementById('reports-list').innerHTML = reports.length ? reports.map(function (report) {
      var student = report.student || {};
      return '<article class="report-card"><div><span class="badge badge-' + escapeHtml(report.type) + '">' + escapeHtml(report.type) + ' form</span><h3>' + escapeHtml(report.itemName) + '</h3><p>' + escapeHtml(report.description || 'No additional details.') + '</p><div class="report-card__meta">' + escapeHtml(report.category) + ' · ' + escapeHtml(report.building) + ' · ' + escapeHtml(formatDate(report.date)) + '</div><p class="report-card__student">Submitted by: ' + escapeHtml(student.name || 'Unknown student') + (student.email ? ' · ' + escapeHtml(student.email) : '') + '</p></div><span class="badge">' + escapeHtml(report.status || 'Open') + '</span></article>';
    }).join('') : '<p class="empty-state">No student reports match this filter.</p>';
  }
  function renderInventory() {
    var items = read(INVENTORY_KEY, []);
    document.getElementById('inventory-list').innerHTML = items.length ? items.map(function (item) {
      return '<article class="inventory-card"><span class="badge badge-' + escapeHtml(item.type) + '">' + escapeHtml(item.type) + '</span><h3>' + escapeHtml(item.name) + '</h3><p>' + escapeHtml(item.category) + ' · ' + escapeHtml(item.location) + '</p><p>' + escapeHtml(item.details || 'No additional details.') + '</p><p class="report-card__meta">' + escapeHtml(formatDate(item.date)) + '</p><div class="inventory-actions"><button class="button button-ghost" data-edit="' + escapeHtml(item.id) + '" type="button">Edit</button><button class="button button-ghost" data-remove="' + escapeHtml(item.id) + '" type="button">Remove</button></div></article>';
    }).join('') : '<p class="empty-state">Inventory is empty. Add an item to get started.</p>';
  }
  function makePickupCode() {
    var numbers = '';
    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(4);
      window.crypto.getRandomValues(values);
      values.forEach(function (value) { numbers += String(value % 10); });
    } else {
      numbers = String(Math.floor(1000 + Math.random() * 9000));
    }
    return 'MIU-' + numbers;
  }
  function renderClaims() {
    var claims = read(CLAIMS_KEY, []);
    var inventory = read(INVENTORY_KEY, []);
    var list = document.getElementById('claims-list');
    list.innerHTML = claims.length ? claims.map(function (claim) {
      var item = inventory.find(function (entry) { return entry.id === claim.itemId; }) || { name: 'Inventory item removed', location: 'Unknown' };
      var student = claim.student || {};
      var code = claim.pickupCode ? '<div class="claim-code">Pickup code: ' + escapeHtml(claim.pickupCode) + '<br><small>Expires ' + escapeHtml(formatDate(claim.codeExpiresAt)) + '</small></div>' : '';
      var actions = claim.status === 'Pending verification'
        ? '<div class="claim-controls"><label for="score-' + escapeHtml(claim.id) + '">Matched answers</label><select id="score-' + escapeHtml(claim.id) + '" data-score="' + escapeHtml(claim.id) + '"><option value="0">0 / 2</option><option value="1">1 / 2</option><option value="2">2 / 2</option></select><button class="button button-primary" data-approve="' + escapeHtml(claim.id) + '" type="button">Approve &amp; issue code</button><button class="button button-ghost" data-reject="' + escapeHtml(claim.id) + '" type="button">Reject</button></div>'
        : claim.status === 'Pickup code issued'
          ? '<div class="claim-controls"><input data-student-id="' + escapeHtml(claim.id) + '" placeholder="Confirm student ID"><input data-pickup-code="' + escapeHtml(claim.id) + '" placeholder="Enter pickup code"><button class="button button-primary" data-collect="' + escapeHtml(claim.id) + '" type="button">Mark collected</button></div>'
          : '<p><strong>Final status:</strong> ' + escapeHtml(claim.status) + '</p>';
      return '<article class="claim-card"><div class="claim-card__header"><div><span class="badge">' + escapeHtml(claim.status) + '</span><h3>' + escapeHtml(item.name) + '</h3><p><strong>Claimant:</strong> ' + escapeHtml(student.name || 'Unknown student') + ' · ' + escapeHtml(student.email || 'No email') + '<br><strong>Student ID:</strong> ' + escapeHtml(claim.studentId) + ' · <strong>Lost at:</strong> ' + escapeHtml(claim.location) + '</p></div>' + code + '</div><div class="claim-answers"><strong>Private details provided</strong><p>' + escapeHtml(claim.uniqueDetails) + '</p><strong>What makes it unique?</strong><p>' + escapeHtml(claim.answers && claim.answers[0]) + '</p><strong>What was inside or attached?</strong><p>' + escapeHtml(claim.answers && claim.answers[1]) + '</p></div>' + actions + '</article>';
    }).join('') : '<p class="empty-state">No claims have been submitted yet.</p>';
  }
  function resetForm() { document.getElementById('inventory-form').reset(); document.getElementById('inventory-id').value = ''; document.getElementById('inventory-form').hidden = true; }
  function editItem(id) {
    var item = read(INVENTORY_KEY, []).find(function (entry) { return entry.id === id; }); if (!item) return;
    document.getElementById('inventory-id').value = item.id; document.getElementById('inventory-name').value = item.name; document.getElementById('inventory-type').value = item.type; document.getElementById('inventory-category').value = item.category; document.getElementById('inventory-location').value = item.location; document.getElementById('inventory-date').value = item.date; document.getElementById('inventory-details').value = item.details || ''; document.getElementById('inventory-form').hidden = false; document.getElementById('inventory-name').focus();
  }
  function init() {
    try { currentUser = JSON.parse(localStorage.getItem('campusone_session') || 'null'); } catch (error) { currentUser = null; }
    if (!currentUser || ['admin', 'lost-found-staff'].indexOf(currentUser.role) === -1) { window.location.replace('login.html'); return; }
    document.getElementById('nav-user-name').textContent = currentUser.name || ''; document.getElementById('nav-user-email').textContent = currentUser.email || '';
    var seed = read(INVENTORY_KEY, null);
    if (seed === null) write(INVENTORY_KEY, [{id:'inventory-1',name:'Blue backpack found near Library',type:'found',category:'Bag',location:'Central Library',date:'2026-10-16',details:'Navy blue with silver zipper pull and a small front pocket.'},{id:'inventory-2',name:'Silver watch handed to security',type:'found',category:'Other',location:'Main Building security',date:'2026-10-15',details:'Silver band with a dark face.'}]);
    renderReports(); renderInventory(); renderClaims();
    document.querySelectorAll('[data-view]').forEach(function (tab) { tab.addEventListener('click', function () { document.querySelectorAll('[data-view]').forEach(function (other) { other.classList.toggle('is-active', other === tab); }); document.querySelectorAll('[data-panel]').forEach(function (panel) { panel.hidden = panel.dataset.panel !== tab.dataset.view; }); }); });
    document.getElementById('report-filter').addEventListener('change', renderReports);
    document.getElementById('add-item-btn').addEventListener('click', function () { document.getElementById('inventory-form').hidden = false; document.getElementById('inventory-name').focus(); });
    document.getElementById('cancel-item-btn').addEventListener('click', resetForm);
    document.getElementById('inventory-form').addEventListener('submit', function (event) { event.preventDefault(); var items = read(INVENTORY_KEY, []), id = document.getElementById('inventory-id').value || 'inventory-' + Date.now(), item = {id:id,name:document.getElementById('inventory-name').value.trim(),type:document.getElementById('inventory-type').value,category:document.getElementById('inventory-category').value.trim(),location:document.getElementById('inventory-location').value.trim(),date:document.getElementById('inventory-date').value,details:document.getElementById('inventory-details').value.trim()}; var existing = items.findIndex(function (entry) { return entry.id === id; }); if (existing === -1) items.unshift(item); else items[existing] = item; if (write(INVENTORY_KEY, items)) { resetForm(); renderInventory(); showToast('Inventory item saved.'); } });
    document.getElementById('inventory-list').addEventListener('click', function (event) { var edit = event.target.dataset.edit, remove = event.target.dataset.remove; if (edit) editItem(edit); if (remove && window.confirm('Remove this inventory item?')) { var items = read(INVENTORY_KEY, []).filter(function (item) { return item.id !== remove; }); if (write(INVENTORY_KEY, items)) { renderInventory(); showToast('Inventory item removed.'); } } });
    document.getElementById('claims-list').addEventListener('click', function (event) {
      var claims = read(CLAIMS_KEY, []);
      var id = event.target.dataset.approve || event.target.dataset.reject || event.target.dataset.collect;
      if (!id) return;
      var claim = claims.find(function (entry) { return entry.id === id; });
      if (!claim) return;
      if (event.target.dataset.approve) {
        var score = document.querySelector('[data-score="' + id + '"]').value;
        if (score !== '2' && !window.confirm('Not all answers matched. Approve anyway?')) return;
        claim.status = 'Pickup code issued';
        claim.pickupCode = makePickupCode();
        claim.codeExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
        claim.verifiedBy = currentUser.name;
        claim.verifiedAt = new Date().toISOString();
      } else if (event.target.dataset.reject) {
        claim.status = 'Rejected';
        claim.verifiedBy = currentUser.name;
        claim.verifiedAt = new Date().toISOString();
      } else {
        var studentId = document.querySelector('[data-student-id="' + id + '"]').value.trim();
        var pickupCode = document.querySelector('[data-pickup-code="' + id + '"]').value.trim().toUpperCase();
        if (studentId !== claim.studentId || pickupCode !== claim.pickupCode) { showToast('Student ID or pickup code does not match.'); return; }
        if (new Date(claim.codeExpiresAt + 'T23:59:59') < new Date()) { showToast('This pickup code has expired.'); return; }
        claim.status = 'Collected';
        claim.collectedBy = currentUser.name;
        claim.collectedAt = new Date().toISOString();
      }
      if (write(CLAIMS_KEY, claims)) { renderClaims(); showToast('Claim status updated.'); }
    });
    document.getElementById('profile-trigger').addEventListener('click', function () { var panel = document.getElementById('profile-panel'), open = panel.classList.toggle('is-open'); this.setAttribute('aria-expanded', String(open)); });
    document.getElementById('logout-btn').addEventListener('click', function () { localStorage.removeItem('campusone_session'); window.location.replace('login.html'); });
  }
  document.addEventListener('DOMContentLoaded', init);
}());
