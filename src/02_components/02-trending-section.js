/**
 * ============================================================================
 * Trending Section Component
 * ============================================================================
 * 
 * Handles the trending carousel display and interactions.
 * Renders media cards and manages horizontal scrolling.
 * 
 * @module trending-section
 * @author Fawzi
 */

import { select, selectAll, setText, setAttribute } from '../01_utils/dom-loader.js';
import { registerContainer } from './00-hover-card.js';
import { addFavourite, removeFavourite, isFavourite } from '../01_utils/storage-manager.js';
import { showToast } from './toast-notification.js';


// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
    carousel: '[data-element="trending-carousel"]',
    scrollLeft: '[data-action="scroll-left"]',
    scrollRight: '[data-action="scroll-right"]',
    cardTemplate: '[data-template="trending-card"]',
};

const SCROLL_AMOUNT = 600;

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="176" height="264" viewBox="0 0 176 264"%3E%3Crect fill="%2312121a" width="176" height="264"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';


// ============================================================================
// CARD RENDERING
// ============================================================================

/**
 * Creates a card element from template
 * @param {Object} item - TMDB item data
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template element
 * @returns {HTMLElement} Cloned and populated card element
 */
const createCardElement = (item, apiClient, template) => {
    const card = template.content.cloneNode(true).firstElementChild;

    const isMovie = item.media_type === 'movie' || item.title !== undefined;
    const title = item.title || item.name || 'Unknown';
    const year = extractYear(item);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const posterUrl = apiClient.getPosterUrl(item.poster_path, 'medium');
    const mediaType = item.media_type || (isMovie ? 'movie' : 'tv');

    // Base data attributes
    setAttribute(card, 'data-id', item.id);
    setAttribute(card, 'data-type', mediaType);
    setAttribute(card, 'data-favourited', isFavourite(item.id) ? 'true' : 'false');

    // Hover card data attributes
    setAttribute(card, 'data-title', title);
    setAttribute(card, 'data-year', year);
    setAttribute(card, 'data-rating', rating);
    setAttribute(card, 'data-overview', item.overview || '');
    setAttribute(card, 'data-genre-ids', JSON.stringify(item.genre_ids || []));

    const poster = select(card, '[data-element="card-poster"]');
    if (poster) {
        poster.src = posterUrl || PLACEHOLDER_IMAGE;
        poster.alt = title;
    }

    setText(select(card, '[data-element="card-title"]'), title);
    setText(select(card, '[data-element="card-year"]'), year);
    setText(select(card, '[data-element="card-rating"]'), rating);
    setText(select(card, '[data-element="card-badge"]'), isMovie ? 'Movie' : 'TV');

    return card;
};

/**
 * Extracts year from date string
 * @param {Object} item - TMDB item
 * @returns {string} Year or fallback
 */
const extractYear = (item) => {
    const dateStr = item.release_date || item.first_air_date;
    return dateStr ? new Date(dateStr).getFullYear().toString() : 'N/A';
};

/**
 * Renders all cards into the carousel
 * @param {HTMLElement} carousel - Carousel container
 * @param {Array} items - Array of TMDB items
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template
 */
const renderCards = (carousel, items, apiClient, template) => {
    carousel.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    items.forEach((item) => {
        const card = createCardElement(item, apiClient, template);
        fragment.appendChild(card);
    });
    
    carousel.appendChild(fragment);
};


// ============================================================================
// CAROUSEL SCROLLING
// ============================================================================

/**
 * Sets up carousel scroll functionality
 * @param {HTMLElement} container - Section container
 */
const setupCarouselScrolling = (container) => {
    const carousel = select(container, SELECTORS.carousel);
    const scrollLeftBtn = select(container, SELECTORS.scrollLeft);
    const scrollRightBtn = select(container, SELECTORS.scrollRight);
    
    if (!carousel) return;
    
    if (scrollLeftBtn) {
        scrollLeftBtn.addEventListener('click', () => {
            carousel.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
        });
    }
    
    if (scrollRightBtn) {
        scrollRightBtn.addEventListener('click', () => {
            carousel.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
        });
    }
};


// ============================================================================
// EVENT HANDLING
// ============================================================================

/**
 * Sets up card click handlers
 * @param {HTMLElement} container - Section container
 */
const setupCardClickHandlers = (container) => {
    const carousel = select(container, SELECTORS.carousel);
    
    if (!carousel) return;
    
    carousel.addEventListener('click', (event) => {
        const card = event.target.closest('[data-element="card"]');
        if (!card) return;

        toggleFavourite(card);
    });
};

/**
 * Toggles favourite state for a trending card
 * @param {HTMLElement} card - Card element
 */
const toggleFavourite = (card) => {
    const id = parseInt(card.dataset.id, 10);
    const title = card.dataset.title || 'Unknown';
    const mediaType = card.dataset.type || 'movie';
    const currentlyFavourited = card.dataset.favourited === 'true';

    if (currentlyFavourited) {
        removeFavourite(id);
        setAttribute(card, 'data-favourited', 'false');
        showToast(`${title} removed from favorites`);
        console.info(`[Trending] Removed from favorites: ${title}`);
    } else {
        const itemData = {
            id,
            title,
            name: mediaType === 'tv' ? title : undefined,
            poster_path: card.querySelector('[data-element="card-poster"]')?.src || null,
            overview: card.dataset.overview || '',
            release_date: mediaType === 'movie' ? card.dataset.year : undefined,
            first_air_date: mediaType === 'tv' ? card.dataset.year : undefined,
            vote_average: parseFloat(card.dataset.rating) || null,
        };
        addFavourite(itemData);
        setAttribute(card, 'data-favourited', 'true');
        showToast(`${title} added to favorites`);
        console.info(`[Trending] Added to favorites: ${title}`);
    }
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the trending section
 * @param {HTMLElement} container - Section mount point
 * @param {Array} items - Trending items from API
 * @param {Object} apiClient - TMDB API client
 */
const initTrendingSection = async (container, items, apiClient) => {
    if (!items || items.length === 0) {
        console.warn('[Trending] No items provided');
        return;
    }

    const carousel = select(container, SELECTORS.carousel);
    const template = select(container, SELECTORS.cardTemplate);

    if (!carousel || !template) {
        console.error('[Trending] Required elements not found');
        return;
    }

    renderCards(carousel, items, apiClient, template);
    setupCarouselScrolling(container);
    setupCardClickHandlers(container);

    // Register carousel for hover card events
    registerContainer(carousel);

    console.info(`[Trending] Section initialized with ${items.length} items`);
};


// ============================================================================
// EXPORTS
// ============================================================================

export { initTrendingSection };
