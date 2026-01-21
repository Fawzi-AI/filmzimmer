/**
 * ============================================================================
 * Hero Section Component
 * ============================================================================
 * 
 * Handles the hero section display and interactions.
 * Receives trending item data and populates the template.
 * 
 * @module hero-section
 * @author Fawzi
 */

import { select, setText, setAttribute, setBackgroundImage } from '../01_utils/dom-loader.js';


// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Data attribute selectors for template elements
 * @constant {Object}
 */
const SELECTORS = {
    background: '[data-element="hero-background"]',
    badge: '[data-element="hero-badge"]',
    title: '[data-element="hero-title"]',
    rating: '[data-element="hero-rating"]',
    ratingValue: '[data-element="hero-rating-value"]',
    year: '[data-element="hero-year"]',
    type: '[data-element="hero-type"]',
    overview: '[data-element="hero-overview"]',
    detailsButton: '[data-action="hero-details"]',
    saveButton: '[data-action="hero-save"]',
};


// ============================================================================
// DATA EXTRACTION
// ============================================================================

/**
 * Extracts display-ready values from raw API data
 * @param {Object} item - Raw TMDB item data
 * @param {Object} apiClient - TMDB API client for image URLs
 * @returns {Object} Formatted display data
 */
const extractDisplayData = (item, apiClient) => {
    const isMovie = item.media_type === 'movie' || item.title !== undefined;
    
    return {
        id: item.id,
        mediaType: item.media_type || (isMovie ? 'movie' : 'tv'),
        title: item.title || item.name || 'Unknown Title',
        overview: item.overview || 'No description available.',
        rating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
        year: extractYear(item),
        typeLabel: isMovie ? 'Movie' : 'TV Series',
        backdropUrl: apiClient.getBackdropUrl(item.backdrop_path, 'large'),
    };
};

/**
 * Extracts year from release date or first air date
 * @param {Object} item - TMDB item data
 * @returns {string} Year string or fallback
 */
const extractYear = (item) => {
    const dateString = item.release_date || item.first_air_date;
    if (dateString) {
        return new Date(dateString).getFullYear().toString();
    }
    return 'Unknown';
};


// ============================================================================
// TEMPLATE POPULATION
// ============================================================================

/**
 * Populates template elements with data
 * @param {HTMLElement} container - Section container
 * @param {Object} displayData - Formatted display data
 */
const populateTemplate = (container, displayData) => {
    const background = select(container, SELECTORS.background);
    setBackgroundImage(background, displayData.backdropUrl);
    
    setText(select(container, SELECTORS.title), displayData.title);
    setText(select(container, SELECTORS.ratingValue), displayData.rating);
    setText(select(container, SELECTORS.year), displayData.year);
    setText(select(container, SELECTORS.type), displayData.typeLabel);
    setText(select(container, SELECTORS.overview), displayData.overview);
    
    const badge = select(container, SELECTORS.badge);
    if (badge) {
        badge.textContent = `Trending ${displayData.typeLabel}`;
    }
};


// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Binds event listeners to interactive elements
 * @param {HTMLElement} container - Section container
 * @param {Object} displayData - Display data with item ID
 */
const bindEventListeners = (container, displayData) => {
    const detailsButton = select(container, SELECTORS.detailsButton);
    const saveButton = select(container, SELECTORS.saveButton);
    
    if (detailsButton) {
        detailsButton.addEventListener('click', () => {
            handleViewDetails(displayData.id, displayData.mediaType);
        });
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            handleSaveToJournal(displayData);
        });
    }
};

/**
 * Handles view details button click
 * @param {number} id - Item ID
 * @param {string} mediaType - 'movie' or 'tv'
 */
const handleViewDetails = (id, mediaType) => {
    console.info(`[Hero] View details: ${mediaType}/${id}`);
    
    window.dispatchEvent(new CustomEvent('filmzimmer:view-details', {
        detail: { id, mediaType }
    }));
};

/**
 * Handles save to journal button click
 * @param {Object} displayData - Item display data
 */
const handleSaveToJournal = (displayData) => {
    console.info(`[Hero] Save to journal: ${displayData.title}`);
    
    window.dispatchEvent(new CustomEvent('filmzimmer:save-item', {
        detail: displayData
    }));
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the hero section with provided data
 * @param {HTMLElement} container - Section mount point
 * @param {Object} itemData - Trending item data from API
 * @param {Object} apiClient - TMDB API client instance
 */
const initHeroSection = async (container, itemData, apiClient) => {
    if (!itemData) {
        console.warn('[Hero] No data provided for hero section');
        return;
    }
    
    const displayData = extractDisplayData(itemData, apiClient);
    populateTemplate(container, displayData);
    bindEventListeners(container, displayData);
    
    console.info('[Hero] Section initialized');
};


// ============================================================================
// EXPORTS
// ============================================================================

export { initHeroSection };
