import "alawonn-font";
import { themeTide } from "react-theme-tide";
import "./style.css";
import groups from "./characters.json";

const VERSION = __VERSION__;
const RELEASE = `https://github.com/alawonn/alawonn-font/releases/download/v${VERSION}`;
const DOWNLOADS = {
  ttf: `${RELEASE}/Alawonn-Regular.ttf`,
  woff2: `${RELEASE}/Alawonn-Regular.woff2`,
  zip: `${RELEASE}/alawonn-font-${VERSION}.zip`,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Version and download links
for (const node of $$("[data-version]")) node.textContent = VERSION;
for (const link of $$("[data-download]")) link.href = DOWNLOADS[link.dataset.download];
$("#cdn-link").textContent = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/alawonn-font@${VERSION}/css/alawonn.css">`;

// Theme: follows the system until someone picks one.
function currentTheme() {
  return document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
function showTheme() {
  const theme = currentTheme();
  for (const button of $$("[data-theme-choice]")) button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
}
// React Theme Tide reveals the new theme with a rising swell. These settings
// are this demo's own: a slow, broad wave that pauses near the middle.
const TIDE = {
  riseDuration: 1100,
  holdDuration: 700,
  finishDuration: 800,
  holdLevel: 0.5,
  waveAmplitude: 16,
  waveLength: 360,
  waveSpeed: 0.6,
};

for (const button of $$("[data-theme-choice]")) {
  button.addEventListener("click", () => {
    const choice = button.dataset.themeChoice;
    if (choice === currentTheme()) return;
    themeTide(() => {
      document.documentElement.dataset.theme = choice;
      try {
        localStorage.setItem("alawonn-theme", choice);
      } catch {}
      showTheme();
    }, TIDE);
  });
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", showTheme);
showTheme();

// Phone menu
const menuButton = $("#menu-button");
const menuList = $("#menu-list");
function setMenu(open, { focus = false } = {}) {
  menuList.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
  if (open) $("a", menuList).focus();
  else if (focus) menuButton.focus();
}
menuButton.addEventListener("click", () => setMenu(menuList.hidden));
menuList.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menuList.hidden) setMenu(false, { focus: true });
});
document.addEventListener("click", (event) => {
  if (!menuList.hidden && !event.target.closest(".menu")) setMenu(false);
});
menuList.addEventListener("keydown", (event) => {
  const links = $$("a", menuList);
  const index = links.indexOf(document.activeElement);
  const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: links.length - 1 }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  links[(next + links.length) % links.length].focus();
});

// Copy buttons
async function copy(text, button) {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Press Ctrl+C";
    const range = document.createRange();
    const target = button.previousElementSibling;
    if (target) {
      range.selectNodeContents(target);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
  }
  setTimeout(() => (button.textContent = label), 1600);
}
for (const button of $$("[data-copy-target]")) {
  button.addEventListener("click", () => copy($(`#${button.dataset.copyTarget}`).textContent, button));
}

// Type tester
const tester = $("#tester-text");
const size = $("#size");
const sizeOutput = $("#size-output");
const defaultText = tester.value;
function applySize() {
  tester.style.fontSize = `${size.value}px`;
  sizeOutput.textContent = `${size.value} px`;
  size.setAttribute("aria-valuetext", `${size.value} pixels`);
}
size.addEventListener("input", applySize);
$("#tester-reset").addEventListener("click", () => {
  tester.value = defaultText;
  tester.focus();
});
applySize();

// Package manager tabs (arrow keys move between tabs)
const tabs = $$("#pm-tabs [role=tab]");
function selectTab(tab) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute("aria-selected", String(selected));
    other.tabIndex = selected ? 0 : -1;
  }
  $("#pm-panel").setAttribute("aria-labelledby", tab.id);
  $("#pm-command").textContent = tab.dataset.command;
}
for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(tab);
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    selectTab(target);
    target.focus();
  });
}

// Character finder
const COMBINING = "Combining marks";
const BLANK = new Set([" ", " ", " ", " ", " "]);
const all = groups.flatMap((group) => group.characters.map((entry) => ({ ...entry, group: group.name })));
const grid = $("#char-grid");
const search = $("#char-search");
const filters = $("#char-filters");
const count = $("#char-count");
let activeGroup = "All";
let selected = all.find((entry) => entry.char === "a");

function display(entry) {
  if (entry.group === COMBINING) return `◌${entry.char}`;
  if (BLANK.has(entry.char)) return "␣";
  return entry.char;
}

for (const name of ["All", ...groups.map((group) => group.name)]) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = name;
  button.setAttribute("aria-pressed", String(name === activeGroup));
  button.addEventListener("click", () => {
    activeGroup = name;
    for (const other of filters.children) other.setAttribute("aria-pressed", String(other === button));
    renderGrid();
  });
  filters.append(button);
}

function matches(entry, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (entry.char === query.trim()) return true;
  const code = q.replace(/^u\+?/, "");
  if (/^[0-9a-f]{2,6}$/.test(code) && entry.code.slice(2).toLowerCase() === code.padStart(4, "0")) return true;
  return entry.name.includes(q);
}

function showDetail(entry) {
  selected = entry;
  $("#char-detail-glyph").textContent = display(entry);
  $("#char-detail-name").textContent = entry.name;
  $("#char-detail-code").textContent = entry.code;
  for (const button of $$("button", grid)) button.setAttribute("aria-pressed", String(button.dataset.code === entry.code));
}

$("#char-copy").addEventListener("click", (event) => copy(selected.char, event.currentTarget));

function renderGrid() {
  const query = search.value;
  const visible = all.filter((entry) => (activeGroup === "All" || entry.group === activeGroup) && matches(entry, query));
  const fragment = document.createDocumentFragment();
  for (const entry of visible) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "char specimen";
    button.dataset.code = entry.code;
    button.textContent = display(entry);
    button.setAttribute("aria-label", `${display(entry)} ${entry.name}, ${entry.code}`);
    button.setAttribute("aria-pressed", String(entry === selected));
    button.addEventListener("click", () => showDetail(entry));
    item.append(button);
    fragment.append(item);
  }
  grid.replaceChildren(fragment);
  count.textContent = visible.length === all.length ? `${all.length} characters` : `Showing ${visible.length} of ${all.length} characters`;
}

search.addEventListener("input", renderGrid);
renderGrid();
showDetail(selected);
