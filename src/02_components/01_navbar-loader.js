/**
 * ============================================================================
 * Navbar Loader (Self-Initializing)
 * ============================================================================
 *
 * Loads navbar template and initializes navbar logic on any page.
 * Ensures TMDB client is initialized even on pages without main.js (e.g. journal.html).
 */

import { initNavbar } from "./01_navbar.js";
import TMDBClient from "../03_api/tmdb-client.js";
import { APP_CONFIG } from "../00_config/app-config.js";

const MOUNT_POINT_SELECTORS = [
  APP_CONFIG.mountPoints.navbarAlt, // #navbar-root (journal)
  APP_CONFIG.mountPoints.navbar, // #mount-navbar (index)
];

const TEMPLATE_PATH = APP_CONFIG.templatePaths.navbar;

const findMountPoint = () => {
  for (const selector of MOUNT_POINT_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
};

const fetchTemplate = async () => {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load navbar template: ${response.status}`);
  }
  return response.text();
};

const ensureApiReady = () => {
  try {
    if (!TMDBClient.isReady()) {
      TMDBClient.initialize(APP_CONFIG.tmdbApiKey);
      console.info("[NavbarLoader] TMDB client initialized (via app-config)");
    }
  } catch (e) {
    console.warn("[NavbarLoader] TMDB init failed:", e);
  }
};

const loadNavbar = async () => {
  try {
    const container = findMountPoint();
    if (!container) {
      console.warn("[NavbarLoader] No mount point found");
      return;
    }

    // Make sure search can work on pages without main.js
    ensureApiReady();

    const template = await fetchTemplate();
    container.innerHTML = template;

    initNavbar(container);

    console.info("[NavbarLoader] Navbar loaded successfully");
  } catch (error) {
    console.error("[NavbarLoader] Failed to load navbar:", error);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadNavbar);
} else {
  loadNavbar();
}
