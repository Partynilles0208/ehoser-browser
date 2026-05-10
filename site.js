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

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function unlock() {
  localStorage.setItem(STORAGE_KEY, "1");
  gate.classList.add("hidden");
  page.hidden = false;
  searchInput.focus();
}

function lock() {
  localStorage.removeItem(STORAGE_KEY);
  page.hidden = true;
  gate.classList.remove("hidden");
  gateCode.focus();
}

function toSearchUrl(value) {
  const input = value.trim();

  if (!input) {
    return "https://www.google.com";
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input)) {
    return input;
  }

  if (input.includes(".") && !/\s/.test(input)) {
    return `https://${input}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
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
  window.location.href = toSearchUrl(searchInput.value);
});

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = button.dataset.query;
  });
});

lockButton.addEventListener("click", lock);

if (localStorage.getItem(STORAGE_KEY) === "1") {
  unlock();
} else {
  lock();
}
