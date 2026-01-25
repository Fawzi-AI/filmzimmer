/**
 * ============================================================================
 * Oskar Chat Component
 * ============================================================================
 *
 * Floating AI chatbot interface for movie and TV recommendations.
 * Communicates with the Oskar backend API.
 *
 * @module oskar-chat
 * @author Fawzi
 */

import { loadTemplate, showElement, hideElement, select } from '../01_utils/dom-loader.js';
import { sendMessage } from '../03_api/ai-bridge.js';


// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Template path
 * @constant {string}
 */
const TEMPLATE_PATH = './src/02_components/05_oskar-chat.html';

/**
 * Data attribute selectors for template elements
 * @constant {Object}
 */
const SELECTORS = {
    fab: '[data-element="oskar-fab"]',
    panel: '[data-element="oskar-panel"]',
    close: '[data-element="oskar-close"]',
    messages: '[data-element="oskar-messages"]',
    input: '[data-element="oskar-input"]',
    send: '[data-element="oskar-send"]',
    loading: '[data-element="oskar-loading"]',
};


// ============================================================================
// STATE
// ============================================================================

/**
 * Component state
 * @type {Object}
 */
const state = {
    isPanelOpen: false,
    isLoading: false,
};

/**
 * Cached DOM elements
 * @type {Object}
 */
let elements = {};


// ============================================================================
// DOM HELPERS
// ============================================================================

/**
 * Caches references to DOM elements
 * @param {HTMLElement} container - Component container
 */
const cacheElements = (container) => {
    elements = {
        fab: select(container, SELECTORS.fab),
        panel: select(container, SELECTORS.panel),
        close: select(container, SELECTORS.close),
        messages: select(container, SELECTORS.messages),
        input: select(container, SELECTORS.input),
        send: select(container, SELECTORS.send),
        loading: select(container, SELECTORS.loading),
    };
};


// ============================================================================
// MESSAGE DISPLAY
// ============================================================================

/**
 * Creates and appends a message bubble
 * @param {string} content - Message content
 * @param {boolean} isUser - Whether this is a user message
 */
const appendMessage = (content, isUser) => {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;

    const messageBubble = document.createElement('div');

    if (isUser) {
        messageBubble.className = 'bg-fz-accent text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[85%] text-sm';
    } else {
        messageBubble.className = 'bg-fz-border text-fz-text px-4 py-2 rounded-2xl rounded-bl-md max-w-[85%] text-sm';
    }

    messageBubble.textContent = content;
    messageWrapper.appendChild(messageBubble);
    elements.messages.appendChild(messageWrapper);

    scrollToBottom();
};

/**
 * Scrolls the messages container to the bottom
 */
const scrollToBottom = () => {
    if (elements.messages) {
        elements.messages.scrollTo({
            top: elements.messages.scrollHeight,
            behavior: 'smooth',
        });
    }
};


// ============================================================================
// LOADING STATE
// ============================================================================

/**
 * Sets the loading state
 * @param {boolean} loading - Whether loading is active
 */
const setLoading = (loading) => {
    state.isLoading = loading;

    if (loading) {
        showElement(elements.loading);
        elements.input.disabled = true;
        elements.send.disabled = true;
    } else {
        hideElement(elements.loading);
        elements.input.disabled = false;
        elements.send.disabled = false;
    }

    scrollToBottom();
};


// ============================================================================
// PANEL TOGGLE
// ============================================================================

/**
 * Toggles the chat panel visibility
 */
const togglePanel = () => {
    state.isPanelOpen = !state.isPanelOpen;

    if (state.isPanelOpen) {
        showElement(elements.panel);
        elements.input.focus();
    } else {
        hideElement(elements.panel);
    }
};


// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handles sending a message
 */
const handleSendMessage = async () => {
    if (state.isLoading) return;

    const message = elements.input.value.trim();

    if (!message) return;

    // Display user message
    appendMessage(message, true);
    elements.input.value = '';

    // Show loading state
    setLoading(true);

    // Send to API and get response
    const response = await sendMessage(message);

    // Hide loading and display response
    setLoading(false);
    appendMessage(response, false);

    // Refocus input for continued conversation
    elements.input.focus();
};


// ============================================================================
// EVENT BINDINGS
// ============================================================================

/**
 * Binds event listeners to elements
 */
const bindEventListeners = () => {
    // FAB click toggles panel
    elements.fab.addEventListener('click', togglePanel);

    // Close button closes panel
    elements.close.addEventListener('click', togglePanel);

    // Send button sends message
    elements.send.addEventListener('click', handleSendMessage);

    // Enter key sends message (without Shift)
    elements.input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the Oskar chat component
 * @param {HTMLElement} mountPoint - DOM element to mount the component
 */
const initOskarChat = async (mountPoint) => {
    try {
        const template = await loadTemplate(TEMPLATE_PATH);
        mountPoint.innerHTML = template;

        // Find the actual component root (skip any injected scripts)
        const componentRoot = select(mountPoint, '[data-element="oskar-chat"]');

        if (!componentRoot) {
            console.error('[Oskar] Component root not found');
            return;
        }

        cacheElements(componentRoot);
        bindEventListeners();

        console.info('[Oskar] Chat component initialized');

    } catch (error) {
        console.error('[Oskar] Failed to initialize:', error);
    }
};


// ============================================================================
// SELF-INITIALIZATION
// ============================================================================

/**
 * Bootstrap function that runs on page load
 */
const bootstrap = () => {
    const mountPoint = document.getElementById('mount-oskar-chat');
    if (mountPoint) {
        initOskarChat(mountPoint);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}


// ============================================================================
// EXPORTS
// ============================================================================

export { initOskarChat };
