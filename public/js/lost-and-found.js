const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

let reportType = new URLSearchParams(window.location.search).get("type") === "found" ? "found" : "lost";

const lostItems = [
  { name: "Blue North Face backpack", category: "Bag", place: "Central Library", date: "Oct 16, 2026", detail: "Navy blue, silver zipper pull, small front pocket", style: "browse-photo-blue" },
  { name: "Silver analog watch", category: "Other", place: "Main Building", date: "Oct 15, 2026", detail: "Silver band with a dark face and light scratches", style: "browse-photo-watch" },
  { name: "Black Android phone", category: "Phone", place: "Room 302", date: "Oct 14, 2026", detail: "Black case with a small red sticker on the back", style: "browse-photo-phone" },
  { name: "Brown leather wallet", category: "Wallet", place: "Campus Lawn", date: "Oct 13, 2026", detail: "Slim wallet with student ID and two cards", style: "browse-photo-wallet" }
];

const foundItems = [
  { name: "Blue backpack found near Library", category: "Bag", place: "Central Library", date: "Oct 16, 2026", detail: "Navy blue with silver zipper pull and a small front pocket", style: "browse-photo-blue" },
  { name: "Silver watch handed to security", category: "Other", place: "Main Building security", date: "Oct 15, 2026", detail: "Silver band, dark face, found beside the east stairwell", style: "browse-photo-watch" },
  { name: "Black Android phone", category: "Phone", place: "Room 302", date: "Oct 14, 2026", detail: "Black case with a small red sticker on the back", style: "browse-photo-phone" },
  { name: "Brown leather wallet", category: "Wallet", place: "Campus security office", date: "Oct 13, 2026", detail: "Slim wallet with student ID and two cards inside", style: "browse-photo-wallet" }
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
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
  if (hash.startsWith("matches")) return "matches";
  if (hash === "browse-found")    return "browse-found";
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

  /* Browse tab buttons inside the form */
  document.querySelectorAll("[data-route='browse']").forEach(btn => {
    btn.addEventListener("click", () => navigate("browse"));
  });
  document.querySelectorAll("[data-route='browse-found']").forEach(btn => {
    btn.addEventListener("click", () => navigate("browse-found"));
  });

  securityRow.hidden = reportType !== "found";
  document.querySelector("#report-form").addEventListener("submit", handleReportSubmit);
  document.querySelector("#photo").addEventListener("change", handlePhotoChange);
}

function handleReportSubmit(event) {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  showToast("Report received. Finding the closest matches…");
  window.setTimeout(() => navigate("matches"), 700);
}

function handlePhotoChange(event) {
  if (event.target.files[0]) {
    document.querySelector(".photo-copy strong").textContent = event.target.files[0].name;
  }
}

function createBrowseCard(item, isFoundBoard) {
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
  action.textContent = isFoundBoard ? "This is mine" : "I found this item";
  action.classList.toggle("claim-button", isFoundBoard);

  action.addEventListener("click", () => {
    if (isFoundBoard) {
      action.classList.add("claimed");
      action.textContent = "Claim sent to staff ✓";
      action.disabled = true;
      showToast("Your claim has been sent to Lost & Found staff.");
      return;
    }
    reportType = "found";
    navigate("new");
    showToast("Tell us where you found this item.");
  });

  return card;
}

function renderBrowse(isFoundBoard = false) {
  app.replaceChildren(cloneTemplate("browse-view-template"));

  /* Wire back link inside browse view */
  const backLink = app.querySelector(".back-link");
  if (backLink) backLink.addEventListener("click", e => { e.preventDefault(); navigate("new"); });

  const items = isFoundBoard ? foundItems : lostItems;
  document.querySelector("[data-browse-title]").textContent    = isFoundBoard ? "Browse found items." : "Browse lost items.";
  document.querySelector("[data-browse-lead]").textContent     = isFoundBoard
    ? "See what students and staff have handed in. Recognize your item? Send a claim to Lost & Found staff."
    : "Recognize something? Open a report and let the student know you may have found it.";
  document.querySelector("[data-browse-count]").textContent    = isFoundBoard ? "12 found reports" : "24 active reports";

  const grid       = document.querySelector("[data-card-grid]");
  const search     = document.querySelector("[data-search]");
  const catFilter  = document.querySelector("[data-category-filter]");
  const noResults  = document.querySelector("[data-no-results]");

  items.forEach(item => grid.append(createBrowseCard(item, isFoundBoard)));

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

function renderMatches() {
  app.replaceChildren(cloneTemplate("matches-view-template"));

  /* Wire back link inside matches view */
  const backLink = app.querySelector(".back-link");
  if (backLink) backLink.addEventListener("click", e => { e.preventDefault(); navigate("new"); });

  document.querySelector("#claim-button").addEventListener("click", event => {
    event.currentTarget.classList.add("claimed");
    event.currentTarget.textContent = "Claim sent to staff ✓";
    event.currentTarget.disabled = true;
    showToast("Your claim has been sent to Lost & Found staff.");
  });
}

function renderRoute() {
  const route = getRoute();
  if (route === "matches")      renderMatches();
  else if (route === "browse-found") renderBrowse(true);
  else if (route === "browse")  renderBrowse();
  else                          renderNew();
}

/* Re-render on hash change (back/forward buttons) */
window.addEventListener("hashchange", renderRoute);

/* Initial render */
renderRoute();
