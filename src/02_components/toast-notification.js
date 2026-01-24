/**
 * ============================================================================
 * Toast Notification Component
 * ============================================================================
 *
 * Displays subtle toast notifications in the top-right corner.
 *
 * @module toast-notification
 */

import { select, setText } from '../01_utils/dom-loader.js';


// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
    container: '#toast-container',
    template: '[data-template="toast"]',
    message: '[data-element="toast-message"]',
};

const TOAST_DURATION = 3000;
const ANIMATION_DELAY = 50;
const EXIT_ANIMATION_DURATION = 300;


// ============================================================================
// STATE
// ============================================================================

let container = null;
let template = null;
let isInitialized = false;


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the toast system with container and template
 * @param {HTMLElement} toastContainer - Container element for toasts
 * @param {HTMLTemplateElement} toastTemplate - Toast template element
 */
const initToast = (toastContainer, toastTemplate) => {
    container = toastContainer;
    template = toastTemplate;
    isInitialized = true;
};


// ============================================================================
// TOAST DISPLAY
// ============================================================================

/**
 * Creates and displays a toast notification
 * @param {string} message - Message to display
 */
const showToast = (message) => {
    if (!isInitialized || !container || !template) {
        console.warn('[Toast] Not initialized');
        return;
    }

    const toast = template.content.cloneNode(true).firstElementChild;
    const messageEl = select(toast, SELECTORS.message);

    if (messageEl) {
        setText(messageEl, message);
    }

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        }, ANIMATION_DELAY);
    });

    // Schedule removal
    setTimeout(() => {
        removeToast(toast);
    }, TOAST_DURATION);
};

/**
 * Removes a toast with exit animation
 * @param {HTMLElement} toast - Toast element to remove
 */
const removeToast = (toast) => {
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-full', 'opacity-0');

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, EXIT_ANIMATION_DURATION);
};


// ============================================================================
// EXPORTS
// ============================================================================

export { initToast, showToast };
