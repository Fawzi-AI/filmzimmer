/**
 * ============================================================================
 * Application Config (Single Source of Truth)
 * ============================================================================
 */
export const APP_CONFIG = Object.freeze({
  name: "Filmzimmer",
  version: "1.0.0",

  // Single source of truth for TMDB API key
  tmdbApiKey: "e4a2397077d9e2b4dda4b52d14c6e96a",

  // Mount points used across pages
  mountPoints: {
    navbar: "#mount-navbar", // index.html
    navbarAlt: "#navbar-root", // journal.html
  },

  // Template paths (fetch paths relative to root HTML)
  templatePaths: {
    navbar: "./src/02_components/01_navbar.html",
  },
});
