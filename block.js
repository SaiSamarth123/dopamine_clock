/**
 * Memento — distractor intercept page (delayed open)
 */

const S = globalThis.MementoShared;
const params = new URLSearchParams(window.location.search);
const rawHost = params.get("host") || "";
const host = S.normalizeHost(rawHost) || "";
const delaySec = Math.min(60, Math.max(3, parseInt(params.get("delay") || "10", 10) || 10));

const hostEl = document.getElementById("block-host");
const countdownEl = document.getElementById("block-countdown");
const countdownWrap = document.getElementById("block-countdown-wrap");
const openBtn = document.getElementById("block-open");
const mementoLink = document.getElementById("block-memento");

if (hostEl) {
  hostEl.textContent = host || "this site";
}

if (mementoLink && typeof chrome !== "undefined" && chrome.runtime?.getURL) {
  mementoLink.href = chrome.runtime.getURL("index.html");
}

const targetUrl = host ? S.targetUrlForHost(host) : null;
const hostValid = !!host;

let remaining = delaySec;
let timerId = null;

function renderCountdown() {
  if (!countdownEl) return;
  if (remaining <= 0) {
    countdownEl.textContent = "0";
    if (countdownWrap) {
      countdownWrap.innerHTML =
        '<span class="block-countdown-ready">You can continue now — click Open anyway.</span>';
    }
    return;
  }
  countdownEl.textContent = String(remaining);
}

function enableOpen() {
  if (!openBtn) return;
  if (!hostValid || !targetUrl) {
    openBtn.disabled = true;
    openBtn.textContent = "Invalid site";
    return;
  }
  openBtn.disabled = false;
  openBtn.textContent = "Open anyway";
}

function tick() {
  remaining -= 1;
  if (remaining <= 0) {
    clearInterval(timerId);
    enableOpen();
    renderCountdown();
    return;
  }
  renderCountdown();
}

if (!hostValid) {
  if (countdownWrap) {
    countdownWrap.innerHTML =
      '<span class="block-countdown-ready">This block link is invalid. Use Back to Memento.</span>';
  }
  if (openBtn) {
    openBtn.disabled = true;
    openBtn.textContent = "Unavailable";
  }
} else {
  renderCountdown();
  timerId = setInterval(tick, 1000);
}

openBtn?.addEventListener("click", () => {
  if (!targetUrl || !hostValid) {
    window.close();
    return;
  }

  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    window.location.replace(targetUrl);
    return;
  }

  openBtn.disabled = true;
  openBtn.textContent = "Opening…";

  chrome.runtime.sendMessage(
    { type: "frictionBypass", host, targetUrl },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        enableOpen();
        return;
      }
      if (!response?.ok) {
        enableOpen();
      }
    }
  );
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mementoLink) {
    e.preventDefault();
    mementoLink.click();
  }
});
