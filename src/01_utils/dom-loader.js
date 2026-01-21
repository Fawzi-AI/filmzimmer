/**
 * ============================================================================
 * DOM Loader Utility
 * ============================================================================
 * 
 * Provides utilities for loading HTML templates and common DOM operations.
 * 
 * @module dom-loader
 * @author Fawzi
 */

// ============================================================================
// TEMPLATE LOADING
// ============================================================================

/**
 * Cache for loaded templates to prevent redundant network requests
 * @type {Map<string, string>}
 */
const templateCache = new Map();

/**
 * Loads an HTML template from a given path
 * @param {string} path - Path to the HTML template file
 * @returns {Promise<string>} Template HTML content
 * @throws {Error} If template fails to load
 */
const loadTemplate = async (path) => {
    if (templateCache.has(path)) {
        return templateCache.get(path);
    }
    
    const response = await fetch(path);
    
    if (!response.ok) {
        throw new Error(`Failed to load template: ${path} (${response.status})`);
    }
    
    const html = await response.text();
    templateCache.set(path, html);
    
    return html;
};

/**
 * Clears the template cache
 */
const clearTemplateCache = () => {
    templateCache.clear();
};


// ============================================================================
// ELEMENT VISIBILITY
// ============================================================================

/**
 * Shows an element by removing the 'hidden' class
 * @param {HTMLElement|null} element - Target element
 */
const showElement = (element) => {
    if (element) {
        element.classList.remove('hidden');
    }
};

/**
 * Hides an element by adding the 'hidden' class
 * @param {HTMLElement|null} element - Target element
 */
const hideElement = (element) => {
    if (element) {
        element.classList.add('hidden');
    }
};

/**
 * Toggles element visibility
 * @param {HTMLElement|null} element - Target element
 * @param {boolean} [force] - Force show (true) or hide (false)
 */
const toggleElement = (element, force) => {
    if (element) {
        element.classList.toggle('hidden', force !== undefined ? !force : undefined);
    }
};


// ============================================================================
// ELEMENT SELECTION
// ============================================================================

/**
 * Selects a single element within a container
 * @param {HTMLElement} container - Parent container
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null} Found element or null
 */
const select = (container, selector) => {
    return container.querySelector(selector);
};

/**
 * Selects all matching elements within a container
 * @param {HTMLElement} container - Parent container
 * @param {string} selector - CSS selector
 * @returns {NodeListOf<HTMLElement>} List of found elements
 */
const selectAll = (container, selector) => {
    return container.querySelectorAll(selector);
};


// ============================================================================
// CONTENT MANIPULATION
// ============================================================================

/**
 * Sets text content of an element safely
 * @param {HTMLElement|null} element - Target element
 * @param {string} text - Text content to set
 */
const setText = (element, text) => {
    if (element) {
        element.textContent = text;
    }
};

/**
 * Sets an attribute on an element safely
 * @param {HTMLElement|null} element - Target element
 * @param {string} attribute - Attribute name
 * @param {string} value - Attribute value
 */
const setAttribute = (element, attribute, value) => {
    if (element && value !== null && value !== undefined) {
        element.setAttribute(attribute, value);
    }
};

/**
 * Sets background image style on an element
 * @param {HTMLElement|null} element - Target element
 * @param {string|null} url - Image URL
 */
const setBackgroundImage = (element, url) => {
    if (element && url) {
        element.style.backgroundImage = `url('${url}')`;
    }
};


// ============================================================================
// CLASS MANIPULATION
// ============================================================================

/**
 * Adds classes to an element
 * @param {HTMLElement|null} element - Target element
 * @param {...string} classNames - Class names to add
 */
const addClass = (element, ...classNames) => {
    if (element) {
        element.classList.add(...classNames);
    }
};

/**
 * Removes classes from an element
 * @param {HTMLElement|null} element - Target element
 * @param {...string} classNames - Class names to remove
 */
const removeClass = (element, ...classNames) => {
    if (element) {
        element.classList.remove(...classNames);
    }
};


// ============================================================================
// EXPORTS
// ============================================================================

export {
    loadTemplate,
    clearTemplateCache,
    showElement,
    hideElement,
    toggleElement,
    select,
    selectAll,
    setText,
    setAttribute,
    setBackgroundImage,
    addClass,
    removeClass,
};
