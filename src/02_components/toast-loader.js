/**
 * ============================================================================
 * Toast Loader (Self-Initializing)
 * ============================================================================
 *
 * Ensures toast system is initialized on pages without main.js (e.g. journal.html).
 */

import { initToast } from "./toast-notification.js";

// Must match your template path in main.js
const TEMPLATE_PATH = "./src/02_components/toast-notification.html";

const fetchTemplate = async () => {
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) throw new Error(`Failed to load toast template: ${res.status}`);
  return res.text();
};

const loadToast = async () => {
  try {
    // If already present, do nothing
    if (document.querySelector("#toast-container")) return;

    const html = await fetchTemplate();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    const container = wrapper.querySelector("#toast-container");
    const toastTemplate = wrapper.querySelector('[data-template="toast"]');

    if (container) document.body.appendChild(container);

    initToast(container, toastTemplate);

    console.info("[ToastLoader] Toast initialized");
  } catch (e) {
    console.warn("[ToastLoader] Failed to init toast:", e);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadToast);
} else {
  loadToast();
}
