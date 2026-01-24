/**
 * ============================================================================
 * Navbar Loader (Self-Initializing)
 * ============================================================================
 *
 * This script automatically loads and initializes the navbar component.
 * It can be included in any page with a single script tag.
 *
 * Usage in journal.html:
 * <script type="module" src="./src/02_components/01_navbar-loader.js"></script>
 *
 * The script will:
 * 1. Find the navbar mount point (#navbar-root or #mount-navbar)
 * 2. Fetch the navbar HTML template
 * 3. Initialize the navbar component
 *
 * @module navbar-loader
 * @author Fawzi
 */

import { initNavbar } from './01_navbar.js';


// ============================================================================
// CONFIGURATION
// ============================================================================

const MOUNT_POINT_SELECTORS = ['#navbar-root', '#mount-navbar'];
const TEMPLATE_PATH = './src/02_components/01_navbar.html';


// ============================================================================
// MOUNT POINT DETECTION
// ============================================================================

/**
 * Finds the first available navbar mount point
 * @returns {HTMLElement|null} Mount point element or null
 */
const findMountPoint = () => {
    for (const selector of MOUNT_POINT_SELECTORS) {
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
    }
    return null;
};


// ============================================================================
// TEMPLATE LOADING
// ============================================================================

/**
 * Fetches the navbar HTML template
 * @returns {Promise<string>} Template HTML content
 */
const fetchTemplate = async () => {
    const response = await fetch(TEMPLATE_PATH);

    if (!response.ok) {
        throw new Error(`Failed to load navbar template: ${response.status}`);
    }

    return response.text();
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Loads and initializes the navbar
 */
const loadNavbar = async () => {
    try {
        const container = findMountPoint();

        if (!container) {
            console.warn('[NavbarLoader] No mount point found');
            return;
        }

        const template = await fetchTemplate();
        container.innerHTML = template;

        initNavbar(container);

        console.info('[NavbarLoader] Navbar loaded successfully');

    } catch (error) {
        console.error('[NavbarLoader] Failed to load navbar:', error);
    }
};


// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}
