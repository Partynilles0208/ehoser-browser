const CODE_HASH = "906924d751e18247eb3bdd0f64d24f95b09994be4866e2e01ab1a0b7e68d412a";
const STORAGE_KEY = "ehoser.site.unlocked";

const gate = document.querySelector("#gate");
const gateForm = document.querySelector("#gateForm");
const gateCode = document.querySelector("#gateCode");
const gateError = document.querySelector("#gateError");
const page = document.querySelector("#page");
const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const lockButton = document.querySelector("#lockButton");
const resultsArea = document.querySelector("#resultsArea");
const resultsMeta = document.querySelector("#resultsMeta");
const resultsList = document.querySelector("#resultsList");
const clearResults = document.querySelector("#clearResults");

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function looksLikeUrl(value) {
  const input = value.trim();

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input)) {
    return true;
  }

  return input.includes(".") && !/\s/.test(input);
}

function toUrl(value) {
  const input = value.trim();
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input) ? input : `https://${input}`;
}

function unlock() {
  localStorage.setItem(STORAGE_KEY, "1");
  gate.classList.add("hidden");
  page.hidden = false;

  const query = new URLSearchParams(window.location.search).get("q");
  if (query) {
    searchInput.value = query;
    runSearch(query);
    return;
  }

  searchInput.focus();
}

function lock() {
  localStorage.removeItem(STORAGE_KEY);
  page.hidden = true;
  gate.classList.remove("hidden");
  gateCode.focus();
}

function setLoading(query) {
  resultsArea.classList.add("visible");
  resultsMeta.textContent = `ehoser sucht nach "${query}"...`;
  resultsList.replaceChildren();

  const loader = document.createElement("div");
  loader.className = "result-empty";
  loader.textContent = "Suche laeuft.";
  resultsList.appendChild(loader);
}

function renderResults(query, payload) {
  const results = payload.results || [];
  resultsArea.classList.add("visible");
  resultsList.replaceChildren();

  const providerLabel = {
    brave: "Web",
    jina: "Web",
    fallback: "Ehoser Quellen"
  }[payload.provider || "fallback"];

  resultsMeta.textContent = `${results.length} Ergebnisse fuer "${query}" - ${providerLabel}`;

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "result-empty";
    empty.textContent = "Keine Ergebnisse gefunden.";
    resultsList.appendChild(empty);
    return;
  }

  for (const result of results) {
    const item = document.createElement("article");
    item.className = "result-item";

    const source = document.createElement("span");
    source.className = "result-source";
    source.textContent = result.source || new URL(result.url).hostname;

    const title = document.createElement("a");
    title.href = result.url;
    title.textContent = result.title;
    title.className = "result-title";
    title.rel = "noopener";

    const snippet = document.createElement("p");
    snippet.textContent = result.snippet || result.url;

    item.append(source, title, snippet);
    resultsList.appendChild(item);
  }
}

async function runSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) {
    return;
  }

  if (looksLikeUrl(query)) {
    window.location.href = toUrl(query);
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("q", query);
  window.history.replaceState({}, "", url);
  setLoading(query);

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error("Search request failed");
    }

    renderResults(query, await response.json());
  } catch {
    renderResults(query, {
      provider: "fallback",
      results: [
        {
          title: `Websuche nach "${query}"`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: "Direkt im Web weitersuchen.",
          source: "google.com"
        }
      ]
    });
  }
}

gateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  gateError.textContent = "";

  const ok = (await sha256(gateCode.value)) === CODE_HASH;
  gateCode.value = "";

  if (!ok) {
    gateError.textContent = "Falscher Zugangscode.";
    gateCode.focus();
    return;
  }

  unlock();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(searchInput.value);
});

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.query;
    if (looksLikeUrl(value)) {
      window.location.href = toUrl(value);
      return;
    }

    searchInput.value = value;
    runSearch(value);
  });
});

lockButton.addEventListener("click", lock);

clearResults.addEventListener("click", () => {
  resultsArea.classList.remove("visible");
  resultsList.replaceChildren();
  resultsMeta.textContent = "Bereit fuer deine Suche.";
  searchInput.value = "";
  window.history.replaceState({}, "", window.location.pathname);
  searchInput.focus();
});

if (localStorage.getItem(STORAGE_KEY) === "1") {
  unlock();
} else {
  lock();
}
