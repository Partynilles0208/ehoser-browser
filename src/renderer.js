const tabsEl = document.querySelector("#tabs");
const viewportEl = document.querySelector("#viewport");
const accessScreen = document.querySelector("#accessScreen");
const accessForm = document.querySelector("#accessForm");
const accessCodeInput = document.querySelector("#accessCode");
const accessError = document.querySelector("#accessError");
const addressForm = document.querySelector("#addressForm");
const addressInput = document.querySelector("#address");
const statusEl = document.querySelector("#status");
const securityEl = document.querySelector("#security");
const agentSelect = document.querySelector("#agentSelect");

const buttons = {
  back: document.querySelector("#back"),
  forward: document.querySelector("#forward"),
  reload: document.querySelector("#reload"),
  home: document.querySelector("#home"),
  newTab: document.querySelector("#newTab")
};

const userAgents = {
  chrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  opera:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/109.0.0.0",
  firefox:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  edge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
};

let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let browserStarted = false;

function normalizeInput(value) {
  const input = value.trim();

  if (!input) {
    return "https://www.google.com";
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input)) {
    return input;
  }

  const looksLikeHost =
    input.includes(".") && !input.includes(" ") && !input.includes("\t");

  if (looksLikeHost) {
    return `https://${input}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

function activeTab() {
  return tabs.find((tab) => tab.id === activeTabId);
}

function createWebview(url) {
  const webview = document.createElement("webview");
  webview.src = url;
  webview.setAttribute("allowpopups", "true");
  webview.setAttribute("useragent", userAgents[agentSelect.value]);
  webview.partition = "persist:ehoser";

  webview.addEventListener("did-start-loading", () => {
    updateStatus("Laedt...");
    updateButtons();
  });

  webview.addEventListener("did-stop-loading", () => {
    const tab = tabs.find((item) => item.webview === webview);
    if (tab) {
      tab.title = webview.getTitle() || webview.getURL();
      tab.url = webview.getURL();
    }

    updateStatus(webview.getURL());
    renderTabs();
    updateAddress();
    updateButtons();
  });

  webview.addEventListener("page-title-updated", (event) => {
    const tab = tabs.find((item) => item.webview === webview);
    if (tab) {
      tab.title = event.title || tab.url;
      renderTabs();
    }
  });

  webview.addEventListener("did-navigate", (event) => updateNavigation(webview, event.url));
  webview.addEventListener("did-navigate-in-page", (event) => updateNavigation(webview, event.url));

  webview.addEventListener("did-fail-load", (event) => {
    if (event.errorCode === -3) {
      return;
    }

    updateStatus(`${event.errorDescription}: ${event.validatedURL}`);
  });

  return webview;
}

function updateNavigation(webview, url) {
  const tab = tabs.find((item) => item.webview === webview);
  if (tab) {
    tab.url = url;
  }

  updateStatus(url);
  updateAddress();
  updateButtons();
}

function addTab(url = "https://www.google.com") {
  const id = nextTabId++;
  const webview = createWebview(url);
  const tab = {
    id,
    title: "Neuer Tab",
    url,
    webview
  };

  tabs.push(tab);
  viewportEl.appendChild(webview);
  setActiveTab(id);
}

function closeTab(id) {
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index === -1) {
    return;
  }

  const [closed] = tabs.splice(index, 1);
  closed.webview.remove();

  if (tabs.length === 0) {
    addTab("https://www.google.com");
    return;
  }

  if (activeTabId === id) {
    const next = tabs[Math.max(0, index - 1)];
    setActiveTab(next.id);
  } else {
    renderTabs();
  }
}

function setActiveTab(id) {
  activeTabId = id;

  for (const tab of tabs) {
    tab.webview.classList.toggle("hidden", tab.id !== id);
  }

  renderTabs();
  updateAddress();
  updateButtons();
}

function renderTabs() {
  tabsEl.replaceChildren();

  for (const tab of tabs) {
    const tabButton = document.createElement("button");
    tabButton.className = `tab${tab.id === activeTabId ? " active" : ""}`;
    tabButton.type = "button";
    tabButton.addEventListener("click", () => setActiveTab(tab.id));

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title || tab.url;

    const close = document.createElement("button");
    close.className = "close-tab";
    close.type = "button";
    close.title = "Tab schliessen";
    close.textContent = "x";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    });

    tabButton.append(title, close);
    tabsEl.appendChild(tabButton);
  }
}

function updateAddress() {
  const tab = activeTab();
  if (!tab || document.activeElement === addressInput) {
    return;
  }

  addressInput.value = tab.webview.getURL() || tab.url;
}

function updateButtons() {
  const tab = activeTab();
  const webview = tab?.webview;

  buttons.back.disabled = !webview || !webview.canGoBack();
  buttons.forward.disabled = !webview || !webview.canGoForward();
}

function updateStatus(text) {
  statusEl.textContent = text || "Bereit";
  const tab = activeTab();
  const url = tab?.webview.getURL() || tab?.url || "";
  securityEl.textContent = url.startsWith("https://") ? "HTTPS" : "Chromium WebView";
}

addressForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const tab = activeTab();
  if (!tab) {
    return;
  }

  tab.webview.loadURL(normalizeInput(addressInput.value));
});

buttons.back.addEventListener("click", () => activeTab()?.webview.goBack());
buttons.forward.addEventListener("click", () => activeTab()?.webview.goForward());
buttons.reload.addEventListener("click", () => activeTab()?.webview.reload());
buttons.home.addEventListener("click", () => activeTab()?.webview.loadURL("https://www.google.com"));
buttons.newTab.addEventListener("click", () => addTab("https://www.google.com"));

agentSelect.addEventListener("change", () => {
  const tab = activeTab();
  if (!tab) {
    return;
  }

  tab.webview.setUserAgent(userAgents[agentSelect.value]);
  tab.webview.reload();
});

document.querySelectorAll(".quickbar button").forEach((button) => {
  button.addEventListener("click", () => {
    activeTab()?.webview.loadURL(button.dataset.url);
  });
});

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  accessError.textContent = "";

  const ok = await window.ehoser.verifyAccessCode(accessCodeInput.value);
  accessCodeInput.value = "";

  if (!ok) {
    accessError.textContent = "Falscher Zugangscode.";
    accessCodeInput.focus();
    return;
  }

  accessScreen.classList.add("hidden");

  if (!browserStarted) {
    browserStarted = true;
    addTab(window.ehoser?.homeUrl || "https://www.google.com");
  }
});

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === "l") {
    addressInput.focus();
    addressInput.select();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "t") {
    addTab("https://www.google.com");
  }

  if (event.ctrlKey && event.key.toLowerCase() === "w") {
    closeTab(activeTabId);
  }

  if (event.key === "F5") {
    activeTab()?.webview.reload();
  }
});

accessCodeInput.focus();
