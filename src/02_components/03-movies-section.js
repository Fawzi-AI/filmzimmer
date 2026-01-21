/**
 * ============================================================================
 * Movies Section Component
 * ============================================================================
 * 
 * Handles the popular movies grid display and interactions.
 * 
 * @module movies-section
 * @author Fawzi
 */

import { select, setText, setAttribute } from '../01_utils/dom-loader.js';
import { registerContainer } from './00-hover-card.js';


// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
    grid: '[data-element="movies-grid"]',
    cardTemplate: '[data-template="movie-card"]',
};

const DISPLAY_LIMIT = 12;

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="176" height="264" viewBox="0 0 176 264"%3E%3Crect fill="%2312121a" width="176" height="264"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';


// ============================================================================
// CARD RENDERING
// ============================================================================

/**
 * Creates a movie card element from template
 * @param {Object} movie - TMDB movie data
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template
 * @returns {HTMLElement} Populated card element
 */
const createCardElement = (movie, apiClient, template) => {
    const card = template.content.cloneNode(true).firstElementChild;

    const title = movie.title || 'Unknown Title';
    const year = movie.release_date
        ? new Date(movie.release_date).getFullYear().toString()
        : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const posterUrl = apiClient.getPosterUrl(movie.poster_path, 'medium');

    // Base data attributes
    setAttribute(card, 'data-id', movie.id);
    setAttribute(card, 'data-type', 'movie');

    // Hover card data attributes
    setAttribute(card, 'data-title', title);
    setAttribute(card, 'data-year', year);
    setAttribute(card, 'data-rating', rating);
    setAttribute(card, 'data-overview', movie.overview || '');
    setAttribute(card, 'data-genre-ids', JSON.stringify(movie.genre_ids || []));

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
 * Renders movie cards into the grid
 * @param {HTMLElement} grid - Grid container
 * @param {Array} movies - Array of movie data
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template
 */
const renderCards = (grid, movies, apiClient, template) => {
    grid.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    const displayMovies = movies.slice(0, DISPLAY_LIMIT);
    
    displayMovies.forEach((movie) => {
        const card = createCardElement(movie, apiClient, template);
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
        
        const id = parseInt(card.dataset.id, 10);
        if (id) {
            handleCardClick(id);
        }
    });
};

/**
 * Handles card click event
 * @param {number} id - Movie ID
 */
const handleCardClick = (id) => {
    console.info(`[Movies] Card clicked: movie/${id}`);
    
    window.dispatchEvent(new CustomEvent('filmzimmer:view-details', {
        detail: { id, mediaType: 'movie' }
    }));
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the movies section
 * @param {HTMLElement} container - Section mount point
 * @param {Array} movies - Popular movies from API
 * @param {Object} apiClient - TMDB API client
 */
const initMoviesSection = async (container, movies, apiClient) => {
    if (!movies || movies.length === 0) {
        console.warn('[Movies] No movies provided');
        return;
    }

    const grid = select(container, SELECTORS.grid);
    const template = select(container, SELECTORS.cardTemplate);

    if (!grid || !template) {
        console.error('[Movies] Required elements not found');
        return;
    }

    renderCards(grid, movies, apiClient, template);
    setupEventHandlers(container);

    // Register grid for hover card events
    registerContainer(grid);

    console.info(`[Movies] Section initialized with ${Math.min(movies.length, DISPLAY_LIMIT)} items`);
};


// ============================================================================
// EXPORTS
// ============================================================================

export { initMoviesSection };
