/**
 * ============================================================================
 * Navbar Component
 * ============================================================================
 *
 * Handles navigation bar display and interactions.
 * Supports active page highlighting and mobile menu toggling.
 *
 * @module navbar
 * @author Fawzi
 */

import { select, selectAll, addClass, removeClass } from '../01_utils/dom-loader.js';


// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
    container: '[data-element="navbar-container"]',
    mobileMenu: '[data-element="nav-mobile-menu"]',
    mobileToggle: '[data-action="nav-mobile-toggle"]',
    menuIcon: '[data-element="menu-icon"]',
    closeIcon: '[data-element="close-icon"]',
    navLinks: '[data-nav-page]',
};

const ACTIVE_CLASSES = ['text-white', 'bg-slate-800'];
const INACTIVE_CLASSES = ['text-slate-400', 'hover:text-white', 'hover:bg-slate-800'];


// ============================================================================
// PAGE DETECTION
// ============================================================================

/**
 * Detects the current page based on URL
 * @returns {string} Page identifier ('home' | 'journal')
 */
const detectCurrentPage = () => {
    const path = window.location.pathname;

    if (path.includes('journal')) {
        return 'journal';
    }

    return 'home';
};


// ============================================================================
// ACTIVE STATE HIGHLIGHTING
// ============================================================================

/**
 * Highlights the active navigation link based on current page
 * @param {HTMLElement} container - Navbar container
 */
const highlightActiveLink = (container) => {
    const currentPage = detectCurrentPage();
    const navLinks = selectAll(container, SELECTORS.navLinks);

    navLinks.forEach((link) => {
        const linkPage = link.dataset.navPage;

        if (linkPage === currentPage) {
            removeClass(link, ...INACTIVE_CLASSES);
            addClass(link, ...ACTIVE_CLASSES);
        } else {
            removeClass(link, ...ACTIVE_CLASSES);
            addClass(link, ...INACTIVE_CLASSES);
        }
    });
};


// ============================================================================
// MOBILE MENU
// ============================================================================

/**
 * Sets up mobile menu toggle functionality
 * @param {HTMLElement} container - Navbar container
 */
const setupMobileMenu = (container) => {
    const toggleButton = select(container, SELECTORS.mobileToggle);
    const mobileMenu = select(container, SELECTORS.mobileMenu);
    const menuIcon = select(container, SELECTORS.menuIcon);
    const closeIcon = select(container, SELECTORS.closeIcon);

    if (!toggleButton || !mobileMenu) {
        return;
    }

    toggleButton.addEventListener('click', () => {
        const isOpen = !mobileMenu.classList.contains('hidden');

        if (isOpen) {
            // Close menu
            mobileMenu.classList.add('hidden');
            menuIcon?.classList.remove('hidden');
            closeIcon?.classList.add('hidden');
            toggleButton.setAttribute('aria-expanded', 'false');
        } else {
            // Open menu
            mobileMenu.classList.remove('hidden');
            menuIcon?.classList.add('hidden');
            closeIcon?.classList.remove('hidden');
            toggleButton.setAttribute('aria-expanded', 'true');
        }
    });
};


// ============================================================================
// SCROLL BEHAVIOR
// ============================================================================

/**
 * Adds shadow to navbar when scrolled
 * @param {HTMLElement} container - Navbar container
 */
const setupScrollBehavior = (container) => {
    const navbar = select(container, SELECTORS.container) || container;

    const handleScroll = () => {
        if (window.scrollY > 10) {
            addClass(navbar, 'shadow-lg', 'shadow-black/20');
        } else {
            removeClass(navbar, 'shadow-lg', 'shadow-black/20');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Check initial scroll position
    handleScroll();
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the navbar component
 * @param {HTMLElement} container - Navbar mount point containing the template
 */
const initNavbar = (container) => {
    const navContainer = select(container, SELECTORS.container) || container;

    if (!navContainer) {
        console.warn('[Navbar] Container element not found');
        return;
    }

    highlightActiveLink(container);
    setupMobileMenu(container);
    setupScrollBehavior(container);

    console.info('[Navbar] Component initialized');
};


// ============================================================================
// EXPORTS
// ============================================================================

export { initNavbar };
