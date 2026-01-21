/**
 * ============================================================================
 * Hover Card Component
 * ============================================================================
 *
 * Displays detailed movie/TV information on card hover.
 * Uses event delegation and hover intent detection.
 *
 * @module hover-card
 * @author Fawzi
 */

import { select, setText, showElement, hideElement, addClass, removeClass } from '../01_utils/dom-loader.js';


// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
    hoverCard: '[data-element="hover-card"]',
    title: '[data-element="hover-card-title"]',
    rating: '[data-element="hover-card-rating"]',
    year: '[data-element="hover-card-year"]',
    runtime: '[data-element="hover-card-runtime"]',
    genres: '[data-element="hover-card-genres"]',
    overview: '[data-element="hover-card-overview"]',
    castSkeleton: '[data-element="hover-card-cast-skeleton"]',
    cast: '[data-element="hover-card-cast"]',
};

const TIMING = {
    showDelay: 300,
    hideDelay: 150,
};

const CAST_LIMIT = 5;

const PLACEHOLDER_PROFILE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect fill="%231e1e2e" width="40" height="40" rx="20"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="10" x="50%25" y="55%25" text-anchor="middle"%3E?%3C/text%3E%3C/svg%3E';


// ============================================================================
// STATE
// ============================================================================

let hoverCardElement = null;
let apiClient = null;
let genresData = null;

let showTimeout = null;
let hideTimeout = null;
let currentCard = null;
let isVisible = false;


// ============================================================================
// GENRE MAPPING
// ============================================================================

/**
 * Creates a genre ID to name mapping
 * @param {Object} genres - Genres data from API { movie: [...], tv: [...] }
 * @returns {Map<number, string>} Genre ID to name map
 */
const createGenreMap = (genres) => {
    const map = new Map();

    if (genres?.movie) {
        genres.movie.forEach((g) => map.set(g.id, g.name));
    }
    if (genres?.tv) {
        genres.tv.forEach((g) => map.set(g.id, g.name));
    }

    return map;
};


// ============================================================================
// POSITIONING
// ============================================================================

/**
 * Calculates optimal position for hover card
 * @param {HTMLElement} card - The card element being hovered
 * @returns {{ top: number, left: number }}
 */
const calculatePosition = (card) => {
    const cardRect = card.getBoundingClientRect();
    const hoverRect = hoverCardElement.getBoundingClientRect();

    const gap = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left, top;

    // Try positioning to the right
    if (cardRect.right + gap + hoverRect.width <= viewportWidth) {
        left = cardRect.right + gap;
    }
    // Try positioning to the left
    else if (cardRect.left - gap - hoverRect.width >= 0) {
        left = cardRect.left - gap - hoverRect.width;
    }
    // Position below, centered
    else {
        left = Math.max(gap, Math.min(
            cardRect.left + (cardRect.width / 2) - (hoverRect.width / 2),
            viewportWidth - hoverRect.width - gap
        ));
    }

    // Vertical positioning - align with card top, clamped to viewport
    top = cardRect.top;

    // Clamp vertical position
    if (top + hoverRect.height > viewportHeight - gap) {
        top = viewportHeight - hoverRect.height - gap;
    }
    if (top < gap) {
        top = gap;
    }

    return { top, left };
};


// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

/**
 * Renders genre badges
 * @param {Array<number>} genreIds - Array of genre IDs
 * @param {Map<number, string>} genreMap - Genre ID to name map
 */
const renderGenres = (genreIds, genreMap) => {
    const container = select(hoverCardElement, SELECTORS.genres);
    if (!container) return;

    container.innerHTML = '';

    if (!genreIds || genreIds.length === 0) {
        container.innerHTML = '<span class="text-xs text-fz-text-muted">No genres</span>';
        return;
    }

    genreIds.slice(0, 4).forEach((id) => {
        const name = genreMap.get(id);
        if (name) {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-fz-accent/20 text-fz-accent';
            badge.textContent = name;
            container.appendChild(badge);
        }
    });
};

/**
 * Renders cast members
 * @param {Array<Object>} cast - Array of cast member objects
 */
const renderCast = (cast) => {
    const skeleton = select(hoverCardElement, SELECTORS.castSkeleton);
    const container = select(hoverCardElement, SELECTORS.cast);

    if (!container) return;

    // Hide skeleton, show cast container
    hideElement(skeleton);
    showElement(container);
    removeClass(container, 'hidden');

    container.innerHTML = '';

    if (!cast || cast.length === 0) {
        container.innerHTML = '<span class="text-xs text-fz-text-muted">No cast info</span>';
        return;
    }

    cast.slice(0, CAST_LIMIT).forEach((actor) => {
        const profileUrl = actor.profile_path
            ? apiClient.getProfileUrl(actor.profile_path, 'small')
            : PLACEHOLDER_PROFILE;

        const item = document.createElement('div');
        item.className = 'flex flex-col items-center gap-1 hover-card-cast-item';

        item.innerHTML = `
            <img src="${profileUrl}"
                 alt="${actor.name}"
                 class="w-10 h-10 rounded-full object-cover bg-fz-card">
            <span class="text-xs text-fz-text-muted text-center w-14 truncate">${actor.name.split(' ')[0]}</span>
        `;

        container.appendChild(item);
    });
};

/**
 * Shows loading skeleton for cast
 */
const showCastSkeleton = () => {
    const skeleton = select(hoverCardElement, SELECTORS.castSkeleton);
    const container = select(hoverCardElement, SELECTORS.cast);

    showElement(skeleton);
    removeClass(skeleton, 'hidden');
    hideElement(container);
    addClass(container, 'hidden');
};


// ============================================================================
// DATA EXTRACTION
// ============================================================================

/**
 * Extracts data from card element attributes
 * @param {HTMLElement} card - Card element
 * @returns {Object} Extracted data
 */
const extractCardData = (card) => {
    const genreIdsStr = card.dataset.genreIds;
    let genreIds = [];

    if (genreIdsStr) {
        try {
            genreIds = JSON.parse(genreIdsStr);
        } catch (e) {
            console.warn('[HoverCard] Failed to parse genre IDs:', e);
        }
    }

    return {
        id: parseInt(card.dataset.id, 10),
        type: card.dataset.type || 'movie',
        title: card.dataset.title || 'Unknown',
        year: card.dataset.year || 'N/A',
        rating: card.dataset.rating || 'N/A',
        overview: card.dataset.overview || 'No overview available.',
        genreIds,
    };
};


// ============================================================================
// HOVER CARD DISPLAY
// ============================================================================

/**
 * Shows the hover card with data from the card element
 * @param {HTMLElement} card - Card element being hovered
 */
const showHoverCard = async (card) => {
    if (!hoverCardElement || !genresData) return;

    currentCard = card;
    const data = extractCardData(card);
    const genreMap = createGenreMap(genresData);

    // Phase 1: Render instant data
    setText(select(hoverCardElement, SELECTORS.title), data.title);
    setText(select(hoverCardElement, SELECTORS.rating), data.rating);
    setText(select(hoverCardElement, SELECTORS.year), data.year);
    setText(select(hoverCardElement, SELECTORS.runtime), '...');
    setText(select(hoverCardElement, SELECTORS.overview), data.overview);
    renderGenres(data.genreIds, genreMap);

    // Show cast skeleton
    showCastSkeleton();

    // Position and show card
    hoverCardElement.style.visibility = 'visible';
    hoverCardElement.style.opacity = '0';

    // Calculate position after making visible (for accurate dimensions)
    requestAnimationFrame(() => {
        const { top, left } = calculatePosition(card);
        hoverCardElement.style.top = `${top}px`;
        hoverCardElement.style.left = `${left}px`;

        // Fade in
        requestAnimationFrame(() => {
            hoverCardElement.style.opacity = '1';
            addClass(hoverCardElement, 'hover-card-visible');
            isVisible = true;
        });
    });

    // Phase 2: Fetch details for cast and runtime
    try {
        const details = data.type === 'tv'
            ? await apiClient.getTvDetails(data.id)
            : await apiClient.getMovieDetails(data.id);

        // Check if we're still hovering the same card
        if (currentCard !== card) return;

        // Update runtime/seasons
        const runtimeText = data.type === 'tv'
            ? `${details.number_of_seasons} Season${details.number_of_seasons !== 1 ? 's' : ''}`
            : `${details.runtime || 'N/A'} min`;

        setText(select(hoverCardElement, SELECTORS.runtime), runtimeText);

        // Render cast
        const cast = details.credits?.cast || [];
        renderCast(cast);

    } catch (error) {
        console.warn('[HoverCard] Failed to fetch details:', error);
        setText(select(hoverCardElement, SELECTORS.runtime), 'N/A');
        renderCast([]);
    }
};

/**
 * Hides the hover card
 */
const hideHoverCard = () => {
    if (!hoverCardElement) return;

    hoverCardElement.style.opacity = '0';
    removeClass(hoverCardElement, 'hover-card-visible');

    setTimeout(() => {
        hoverCardElement.style.visibility = 'hidden';
        isVisible = false;
        currentCard = null;
    }, 150);
};


// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handles mouse entering a card
 * @param {HTMLElement} card - Card element
 */
const handleCardEnter = (card) => {
    clearTimeout(hideTimeout);

    if (currentCard === card && isVisible) return;

    showTimeout = setTimeout(() => {
        showHoverCard(card);
    }, TIMING.showDelay);
};

/**
 * Handles mouse leaving a card
 */
const handleCardLeave = () => {
    clearTimeout(showTimeout);

    hideTimeout = setTimeout(() => {
        hideHoverCard();
    }, TIMING.hideDelay);
};


// ============================================================================
// CONTAINER REGISTRATION
// ============================================================================

/**
 * Registers a container for hover events using event delegation
 * @param {HTMLElement} container - Container element (carousel/grid)
 * @returns {Function} Cleanup function
 */
const registerContainer = (container) => {
    if (!container || !hoverCardElement) {
        console.warn('[HoverCard] Cannot register container - not initialized');
        return () => {};
    }

    const handleMouseOver = (event) => {
        const card = event.target.closest('[data-element="card"]');
        if (card) {
            handleCardEnter(card);
        }
    };

    const handleMouseOut = (event) => {
        const card = event.target.closest('[data-element="card"]');
        if (card) {
            const relatedTarget = event.relatedTarget;
            // Check if we're moving to another element within the same card
            if (relatedTarget && card.contains(relatedTarget)) return;
            handleCardLeave();
        }
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);

    console.info('[HoverCard] Container registered');

    // Return cleanup function
    return () => {
        container.removeEventListener('mouseover', handleMouseOver);
        container.removeEventListener('mouseout', handleMouseOut);
    };
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the hover card system
 * @param {Object} options - Initialization options
 * @param {Object} options.apiClient - TMDB API client instance
 * @param {Object} options.genres - Pre-loaded genres data
 */
const initHoverCard = (options) => {
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        console.info('[HoverCard] Touch device detected - skipping initialization');
        return;
    }

    hoverCardElement = document.querySelector(SELECTORS.hoverCard);

    if (!hoverCardElement) {
        console.error('[HoverCard] Hover card element not found');
        return;
    }

    apiClient = options.apiClient;
    genresData = options.genres;

    console.info('[HoverCard] Initialized');
};

/**
 * Sets the genres data for mapping
 * @param {Object} genres - Genres data { movie: [...], tv: [...] }
 */
const setGenresData = (genres) => {
    genresData = genres;
};


// ============================================================================
// EXPORTS
// ============================================================================

export {
    initHoverCard,
    registerContainer,
    setGenresData,
};
