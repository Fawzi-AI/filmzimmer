/**
 * ============================================================================
 * TV Series Section Component
 * ============================================================================
 * 
 * Handles the popular TV series grid display and interactions.
 * 
 * @module series-section
 * @author Fawzi
 */

import { select, setText, setAttribute } from '../01_utils/dom-loader.js';
import { registerContainer } from './00-hover-card.js';
import { addFavourite, removeFavourite, isFavourite } from '../01_utils/storage-manager.js';
import { showToast } from './toast-notification.js';


// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
    grid: '[data-element="series-grid"]',
    cardTemplate: '[data-template="series-card"]',
};

const DISPLAY_LIMIT = 12;

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="176" height="264" viewBox="0 0 176 264"%3E%3Crect fill="%2312121a" width="176" height="264"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';


// ============================================================================
// CARD RENDERING
// ============================================================================

/**
 * Creates a series card element from template
 * @param {Object} series - TMDB TV series data
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template
 * @returns {HTMLElement} Populated card element
 */
const createCardElement = (series, apiClient, template) => {
    const card = template.content.cloneNode(true).firstElementChild;

    const title = series.name || 'Unknown Title';
    const year = series.first_air_date
        ? new Date(series.first_air_date).getFullYear().toString()
        : 'N/A';
    const rating = series.vote_average ? series.vote_average.toFixed(1) : 'N/A';
    const posterUrl = apiClient.getPosterUrl(series.poster_path, 'medium');

    // Base data attributes
    setAttribute(card, 'data-id', series.id);
    setAttribute(card, 'data-type', 'tv');
    setAttribute(card, 'data-favourited', isFavourite(series.id) ? 'true' : 'false');

    // Hover card data attributes
    setAttribute(card, 'data-title', title);
    setAttribute(card, 'data-year', year);
    setAttribute(card, 'data-rating', rating);
    setAttribute(card, 'data-overview', series.overview || '');
    setAttribute(card, 'data-genre-ids', JSON.stringify(series.genre_ids || []));

    const poster = select(card, '[data-element="card-poster"]');
    if (poster) {
        poster.src = posterUrl || PLACEHOLDER_IMAGE;
        poster.alt = title;
    }

    setText(select(card, '[data-element="card-title"]'), title);
    setText(select(card, '[data-element="card-year"]'), year);
    setText(select(card, '[data-element="card-rating"]'), rating);

    return card;
};

/**
 * Renders series cards into the grid
 * @param {HTMLElement} grid - Grid container
 * @param {Array} seriesList - Array of TV series data
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template
 */
const renderCards = (grid, seriesList, apiClient, template) => {
    grid.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    const displaySeries = seriesList.slice(0, DISPLAY_LIMIT);
    
    displaySeries.forEach((series) => {
        const card = createCardElement(series, apiClient, template);
        fragment.appendChild(card);
    });
    
    grid.appendChild(fragment);
};


// ============================================================================
// EVENT HANDLING
// ============================================================================

/**
 * Sets up card click handlers using event delegation
 * @param {HTMLElement} container - Section container
 */
const setupEventHandlers = (container) => {
    const grid = select(container, SELECTORS.grid);
    
    if (!grid) return;
    
    grid.addEventListener('click', (event) => {
        const card = event.target.closest('[data-element="card"]');
        if (!card) return;

        toggleFavourite(card);
    });
};

/**
 * Toggles favourite state for a series card
 * @param {HTMLElement} card - Card element
 */
const toggleFavourite = (card) => {
    const id = parseInt(card.dataset.id, 10);
    const title = card.dataset.title || 'Unknown';
    const currentlyFavourited = card.dataset.favourited === 'true';

    if (currentlyFavourited) {
        removeFavourite(id);
        setAttribute(card, 'data-favourited', 'false');
        showToast(`${title} removed from favorites`);
        console.info(`[Series] Removed from favorites: ${title}`);
    } else {
        const seriesData = {
            id,
            name: title,
            poster_path: card.querySelector('[data-element="card-poster"]')?.src || null,
            overview: card.dataset.overview || '',
            first_air_date: card.dataset.year || '',
            vote_average: parseFloat(card.dataset.rating) || null,
        };
        addFavourite(seriesData);
        setAttribute(card, 'data-favourited', 'true');
        showToast(`${title} added to favorites`);
        console.info(`[Series] Added to favorites: ${title}`);
    }
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the TV series section
 * @param {HTMLElement} container - Section mount point
 * @param {Array} seriesList - Popular TV series from API
 * @param {Object} apiClient - TMDB API client
 */
const initSeriesSection = async (container, seriesList, apiClient) => {
    if (!seriesList || seriesList.length === 0) {
        console.warn('[Series] No series provided');
        return;
    }

    const grid = select(container, SELECTORS.grid);
    const template = select(container, SELECTORS.cardTemplate);

    if (!grid || !template) {
        console.error('[Series] Required elements not found');
        return;
    }

    renderCards(grid, seriesList, apiClient, template);
    setupEventHandlers(container);

    // Register grid for hover card events
    registerContainer(grid);

    console.info(`[Series] Section initialized with ${Math.min(seriesList.length, DISPLAY_LIMIT)} items`);
};


// ============================================================================
// EXPORTS
// ============================================================================

export { initSeriesSection };
