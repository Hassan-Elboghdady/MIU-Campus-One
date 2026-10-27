const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

let reportType = new URLSearchParams(window.location.search).get("type") === "found" ? "found" : "lost";

const lostItems = [
  { name: "Blue North Face backpack", category: "Bag", place: "Central Library", date: "Oct 16, 2026", detail: "Navy blue, silver zipper pull, small front pocket", style: "browse-photo-blue" },
  { name: "Silver analog watch", category: "Other", place: "Main Building", date: "Oct 15, 2026", detail: "Silver band with a dark face and light scratches", style: "browse-photo-watch" },
  { name: "Black Android phone", category: "Phone", place: "Room 302", date: "Oct 14, 2026", detail: "Black case with a small red sticker on the back", style: "browse-photo-phone" },
  { name: "Brown leather wallet", category: "Wallet", place: "Campus Lawn", date: "Oct 13, 2026", detail: "Slim wallet with student ID and two cards", style: "browse-photo-wallet" }
];

const REPORTS_KEY = "campusone_lost_found_reports";
const INVENTORY_KEY = "campusone_lost_found_inventory";
const CLAIMS_KEY = "campusone_lost_found_claims";
const DEFAULT_INVENTORY = [
  { id: "inventory-1", name: "Blue backpack found near Library", type: "found", category: "Bag", location: "Central Library", date: "2026-10-16", details: "Navy blue with silver zipper pull and a small front pocket.", approvalStatus: "approved" },
  { id: "inventory-2", name: "Silver watch handed to security", type: "found", category: "Other", location: "Main Building security", date: "2026-10-15", details: "Silver band with a dark face.", approvalStatus: "approved" }
];

function getReports() {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]");
  } catch (error) {
    showToast("Could not load your saved reports.");
    return [];
  }
}

function saveReport(report) {
  try {
    const reports = getReports();
    reports.unshift(report);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    return true;
  } catch (error) {
    showToast("Could not save your report. Please try again.");
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function cloneTemplate(id) {
  return document.querySelector(`#${id}`).content.cloneNode(true);
}

/* ── Hash-based navigation (works on file://) ── */
function navigate(hash) {
  window.location.hash = hash;
}

function getRoute() {
  const hash = window.location.hash.replace("#", "");
  if (hash === "claim") return "claim";
  if (hash === "my-claims") return "my-claims";
  if (hash === "browse")          return "browse";
  return "new";
}

function renderNew() {
  app.replaceChildren(cloneTemplate("new-view-template"));

  const params = new URLSearchParams(window.location.search);
  const itemToReport = params.get("item") || "";
  const title      = document.querySelector("[data-title]");
  const dateLabel  = document.querySelector("[data-date-label]");
  const securityRow = document.querySelector(".security-row");
  const itemInput  = document.querySelector("#item-name");

  title.textContent = reportType === "found" ? "Report a found item." : "Report a lost item.";
  dateLabel.firstChild.textContent = `Date ${reportType} `;
  itemInput.value = itemToReport;

  document.querySelectorAll("[data-type]").forEach(button => {
    button.classList.toggle("selected", button.dataset.type === reportType);
    button.addEventListener("click", () => {
      reportType = button.dataset.type;
      renderNew();
    });
  });

  /* Browse tab button inside the form */
  document.querySelectorAll("[data-route='browse']").forEach(btn => {
    btn.addEventListener("click", () => navigate("browse"));
  });
  document.querySelectorAll("[data-route='claim']").forEach(btn => {
    btn.addEventListener("click", () => navigate("claim"));
  });
  document.querySelectorAll("[data-route='my-claims']").forEach(btn => {
    btn.addEventListener("click", () => navigate("my-claims"));
  });

  securityRow.hidden = reportType !== "found";
  document.querySelector("#report-form").addEventListener("submit", handleReportSubmit);
  document.querySelector("#photo").addEventListener("change", handlePhotoChange);
}

function formatClaimDate(value) {
  if (!value) return "Not available";
  return new Date(`${value}${value.length === 10 ? "T00:00:00" : ""}`).toLocaleDateString();
}

function renderMyClaims() {
  app.replaceChildren(cloneTemplate("claims-status-template"));
  const backLink = app.querySelector(".back-link");
  if (backLink) backLink.addEventListener("click", event => { event.preventDefault(); navigate("new"); });

  const session = JSON.parse(localStorage.getItem("campusone_session") || "null");
  let claims = [];
  let inventory = [];
  try {
    claims = JSON.parse(localStorage.getItem(CLAIMS_KEY) || "[]");
    inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || "[]");
  } catch (error) {
    showToast("Could not load your claim status.");
    return;
  }
  const mine = claims.filter(claim => session && claim.student && (
    (claim.student.id && claim.student.id === session.id) ||
    (claim.student.email && claim.student.email.toLowerCase() === (session.email || "").toLowerCase())
  ));
  const list = document.querySelector("[data-my-claims]");
  if (!mine.length) {
    list.innerHTML = '<p class="empty-state">You have not submitted any claims yet.</p>';
    return;
  }
  list.innerHTML = mine.map(claim => {
    const item = inventory.find(entry => entry.id === claim.itemId) || { name: "Inventory item", location: "Lost & Found room" };
    const approved = claim.status === "Pickup code issued";
    const collected = claim.status === "Collected";
    const rejected = claim.status === "Rejected";
    const statusClass = approved ? "status-approved" : rejected ? "status-rejected" : collected ? "status-collected" : "status-pending";
    const details = approved
      ? `<div class="pickup-ticket"><p class="eyebrow">Ready for pickup</p><strong class="pickup-code">${escapeHtml(claim.pickupCode)}</strong><p><strong>Pickup location:</strong> Lost &amp; Found room</p><p><strong>Bring:</strong> Your university student ID and this pickup code.</p><p><strong>Code expires:</strong> ${escapeHtml(formatClaimDate(claim.codeExpiresAt))}</p></div>`
      : collected
        ? '<div class="claim-status-message success">Item collected successfully.</div>'
        : rejected
          ? '<div class="claim-status-message rejected">This claim was not approved. Please contact Lost &amp; Found staff for more information.</div>'
          : '<div class="claim-status-message pending">Staff is reviewing your answers and student ID. Keep checking this page for an update.</div>';
    return `<article class="claim-status-card"><div class="claim-status-card__top"><div><span class="claim-status ${statusClass}">${escapeHtml(claim.status)}</span><h2>${escapeHtml(item.name)}</h2><p>Submitted ${escapeHtml(formatClaimDate(claim.createdAt))}</p></div>${approved ? '<span aria-label="Pickup ready">✓</span>' : ''}</div>${details}</article>`;
  }).join("");
}

function renderClaim() {
  app.replaceChildren(cloneTemplate("claim-view-template"));
  const backLink = app.querySelector(".back-link");
  if (backLink) backLink.addEventListener("click", event => { event.preventDefault(); navigate("new"); });

  const itemSelect = document.querySelector("#claim-item");
  let inventory = [];
  try {
    const storedInventory = localStorage.getItem(INVENTORY_KEY);
    if (storedInventory === null) {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(DEFAULT_INVENTORY));
      inventory = DEFAULT_INVENTORY;
    } else {
      inventory = JSON.parse(storedInventory);
    }
  } catch (error) {
    showToast("Could not load the inventory.");
  }
  const claimableItems = inventory.filter(item => {
    const type = String(item.type || "").toLowerCase();
    const approvalStatus = String(item.approvalStatus || "approved").toLowerCase();
    return type === "found" && approvalStatus !== "rejected";
  });
  if (!claimableItems.length) {
    itemSelect.innerHTML = '<option value="">No found items are currently available</option>';
    itemSelect.disabled = true;
  } else {
    itemSelect.disabled = false;
    itemSelect.innerHTML = '<option value="">Select the item you recognize</option>' +
      claimableItems.map(item => {
        const approvalStatus = String(item.approvalStatus || "approved").toLowerCase();
        const statusSuffix = approvalStatus === "pending" ? " (awaiting manager verification)" : "";
        const color = item.color ? `, ${item.color}` : "";
        const description = item.details ? ` — ${item.details}` : "";
        return `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${escapeHtml(color)}${escapeHtml(description)}${escapeHtml(statusSuffix)}</option>`;
      }).join("");
  }

  document.querySelector("#claim-form").addEventListener("submit", event => {
    event.preventDefault();
    const studentId = String(new FormData(event.currentTarget).get("studentId") || "").trim();
    if (!/^\d{4}-\d{5}$/.test(studentId)) {
      const studentIdInput = document.querySelector("#claim-student-id");
      studentIdInput.setCustomValidity("Student ID must contain 4 digits, a hyphen, and 5 digits (for example, 2022-00001).");
      studentIdInput.reportValidity();
      studentIdInput.focus();
      return;
    }
    document.querySelector("#claim-student-id").setCustomValidity("");
    if (!event.currentTarget.reportValidity()) return;
    const session = JSON.parse(localStorage.getItem("campusone_session") || "null");
    const form = new FormData(event.currentTarget);
    let claims = [];
    try {
      claims = JSON.parse(localStorage.getItem(CLAIMS_KEY) || "[]");
    } catch (error) {
      showToast("Could not load existing claims.");
      return;
    }
    claims.unshift({
      id: `claim-${Date.now()}`,
      itemId: form.get("itemId"),
      studentId,
      location: form.get("location"),
      uniqueDetails: form.get("uniqueDetails"),
      answers: [form.get("answerOne"), form.get("answerTwo")],
      student: { id: session && session.id, name: session && session.name || "Unknown student", email: session && session.email || "" },
      status: "Pending verification",
      createdAt: new Date().toISOString()
    });
    try {
      localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
      app.innerHTML = '<div class="match-panel claim-success"><p class="eyebrow">Claim submitted</p><h2>Staff will review your answers.</h2><p class="lead">If your answers match, Lost &amp; Found staff will issue a one-time pickup code. Bring your student ID when you collect the item.</p><button class="button button-primary" type="button" id="claim-done">Back to Lost &amp; Found</button></div>';
      document.querySelector("#claim-done").addEventListener("click", () => navigate("new"));
    } catch (error) {
      showToast("Could not send your claim. Please try again.");
    }
  });
}

function handleReportSubmit(event) {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const session = JSON.parse(localStorage.getItem("campusone_session") || "null");
  const form = new FormData(event.currentTarget);
  const report = {
    id: `report-${Date.now()}`,
    type: reportType,
    itemName: form.get("itemName"),
    category: form.get("category"),
    color: form.get("color"),
    date: form.get("date"),
    building: form.get("building"),
    description: form.get("description"),
    security: form.get("security") || "no",
    student: {
      id: session && session.id,
      name: session && session.name ? session.name : "Unknown student",
      email: session && session.email ? session.email : ""
    },
    createdAt: new Date().toISOString(),
    status: "Open"
  };
  if (!saveReport(report)) return;
  showToast("Report received successfully.");
}

function handlePhotoChange(event) {
  if (event.target.files[0]) {
    document.querySelector(".photo-copy strong").textContent = event.target.files[0].name;
  }
}

function createBrowseCard(item) {
  const card   = document.querySelector("#browse-card-template").content.cloneNode(true);
  const root   = card.querySelector(".lost-card");
  const photo  = card.querySelector("[data-photo]");

  root.dataset.category = item.category;
  root.dataset.search   = `${item.name} ${item.category} ${item.place}`;
  photo.classList.add(item.style);

  card.querySelector("[data-card-category]").textContent = item.category;
  card.querySelector("[data-card-date]").textContent     = item.date;
  card.querySelector("[data-card-name]").textContent     = item.name;
  card.querySelector("[data-card-detail]").textContent   = item.detail;
  card.querySelector("[data-card-place]").textContent    = `⌖ ${item.place}`;

  const action = card.querySelector("[data-card-action]");
  action.textContent = "I found this item";

  action.addEventListener("click", () => {
    reportType = "found";
    navigate("new");
    showToast("Tell us where you found this item.");
  });

  return card;
}

function renderBrowse() {
  app.replaceChildren(cloneTemplate("browse-view-template"));

  /* Wire back link inside browse view */
  const backLink = app.querySelector(".back-link");
  if (backLink) backLink.addEventListener("click", e => { e.preventDefault(); navigate("new"); });

  const items = lostItems;
  document.querySelector("[data-browse-title]").textContent = "Browse lost items.";
  document.querySelector("[data-browse-lead]").textContent = "Recognize something? Open a report and let the student know you may have found it.";
  document.querySelector("[data-browse-count]").textContent = "24 active reports";

  const grid       = document.querySelector("[data-card-grid]");
  const search     = document.querySelector("[data-search]");
  const catFilter  = document.querySelector("[data-category-filter]");
  const noResults  = document.querySelector("[data-no-results]");

  items.forEach(item => grid.append(createBrowseCard(item)));

  const filterItems = () => {
    const q   = search.value.toLowerCase();
    const cat = catFilter.value;
    let visible = 0;
    grid.querySelectorAll(".lost-card").forEach(card => {
      const matches = card.dataset.search.toLowerCase().includes(q) &&
                      (cat === "all" || card.dataset.category === cat);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    noResults.hidden = visible !== 0;
  };

  search.addEventListener("input", filterItems);
  catFilter.addEventListener("change", filterItems);
}

function renderRoute() {
  const route = getRoute();
  if (route === "claim")        renderClaim();
  else if (route === "my-claims") renderMyClaims();
  else if (route === "browse")  renderBrowse();
  else                          renderNew();
}

/* Re-render on hash change (back/forward buttons) */
window.addEventListener("hashchange", renderRoute);
window.addEventListener("storage", event => {
  if (event.key === INVENTORY_KEY && getRoute() === "claim") renderClaim();
  if ((event.key === CLAIMS_KEY || event.key === INVENTORY_KEY) &&
      getRoute() === "my-claims") renderMyClaims();
});
window.addEventListener("focus", () => {
  if (getRoute() === "claim") renderClaim();
  if (getRoute() === "my-claims") renderMyClaims();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (getRoute() === "claim") renderClaim();
  if (getRoute() === "my-claims") renderMyClaims();
});

/* Initial render */
renderRoute();
