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
const GENRE_LIMIT = 4;
const VIEWPORT_GAP = 8;

const PLACEHOLDER_PROFILE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect fill="%231e1e2e" width="40" height="40" rx="20"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="10" x="50%25" y="55%25" text-anchor="middle"%3E?%3C/text%3E%3C/svg%3E';


// ============================================================================
// STATE
// ============================================================================

let hoverCardElement = null;
let apiClient = null;
let genreMap = null;

// Cached DOM element references
let elements = {};

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
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left, top;

    // Try positioning to the right
    if (cardRect.right + VIEWPORT_GAP + hoverRect.width <= viewportWidth) {
        left = cardRect.right + VIEWPORT_GAP;
    }
    // Try positioning to the left
    else if (cardRect.left - VIEWPORT_GAP - hoverRect.width >= 0) {
        left = cardRect.left - VIEWPORT_GAP - hoverRect.width;
    }
    // Position below, centered
    else {
        left = Math.max(VIEWPORT_GAP, Math.min(
            cardRect.left + (cardRect.width / 2) - (hoverRect.width / 2),
            viewportWidth - hoverRect.width - VIEWPORT_GAP
        ));
    }

    // Vertical positioning - align with card top, clamped to viewport
    top = cardRect.top;

    // Clamp vertical position
    if (top + hoverRect.height > viewportHeight - VIEWPORT_GAP) {
        top = viewportHeight - hoverRect.height - VIEWPORT_GAP;
    }
    if (top < VIEWPORT_GAP) {
        top = VIEWPORT_GAP;
    }

    return { top, left };
};


// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

/**
 * Renders genre badges
 * @param {Array<number>} genreIds - Array of genre IDs
 */
const renderGenres = (genreIds) => {
    if (!elements.genres) return;

    elements.genres.innerHTML = '';

    if (!genreIds || genreIds.length === 0) {
        elements.genres.innerHTML = '<span class="text-xs text-fz-text-muted">No genres</span>';
        return;
    }

    genreIds.slice(0, GENRE_LIMIT).forEach((id) => {
        const name = genreMap.get(id);
        if (name) {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 text-xs font-medium rounded-full bg-fz-accent/20 text-fz-accent';
            badge.textContent = name;
            elements.genres.appendChild(badge);
        }
    });
};

/**
 * Renders cast members
 * @param {Array<Object>} cast - Array of cast member objects
 */
const renderCast = (cast) => {
    if (!elements.cast) return;

    // Hide skeleton, show cast container
    hideElement(elements.castSkeleton);
    showElement(elements.cast);

    elements.cast.innerHTML = '';

    if (!cast || cast.length === 0) {
        elements.cast.innerHTML = '<span class="text-xs text-fz-text-muted">No cast info</span>';
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
            <span class="text-xs text-fz-text-muted text-center w-12 truncate">${actor.name.split(' ')[0]}</span>
        `;

        elements.cast.appendChild(item);
    });
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
    if (!hoverCardElement || !genreMap) return;

    currentCard = card;
    const data = extractCardData(card);

    // Phase 1: Render instant data using cached element references
    setText(elements.title, data.title);
    setText(elements.rating, data.rating);
    setText(elements.year, data.year);
    setText(elements.runtime, '...');
    setText(elements.overview, data.overview);
    renderGenres(data.genreIds);

    // Show cast skeleton, hide cast
    showElement(elements.castSkeleton);
    hideElement(elements.cast);

    // Position and show card
    hoverCardElement.style.visibility = 'visible';
    hoverCardElement.style.opacity = '0';

    // Calculate position after making visible (for accurate dimensions)
    requestAnimationFrame(() => {
        const { top, left } = calculatePosition(card);
        hoverCardElement.style.top = `${top}px`;
        hoverCardElement.style.left = `${left}px`;
        hoverCardElement.style.opacity = '1';
        addClass(hoverCardElement, 'hover-card-visible');
        isVisible = true;
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

        setText(elements.runtime, runtimeText);

        // Render cast
        const cast = details.credits?.cast || [];
        renderCast(cast);

    } catch (error) {
        console.warn('[HoverCard] Failed to fetch details:', error);
        setText(elements.runtime, 'N/A');
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
 * Detects if the device is primarily touch-based (mobile/tablet)
 * Uses CSS media queries for accurate detection
 * @returns {boolean} True if device is primarily touch-based
 */
const isTouchPrimaryDevice = () => {
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasNoHover = window.matchMedia('(hover: none)').matches;
    return hasCoarsePointer && hasNoHover;
};

/**
 * Initializes the hover card system
 * @param {Object} options - Initialization options
 * @param {Object} options.apiClient - TMDB API client instance
 * @param {Object} options.genres - Pre-loaded genres data
 */
const initHoverCard = (options) => {
    // Skip on touch-primary devices (mobile/tablets)
    // Hybrid devices (touchscreen laptops, WSL2) still use hover cards
    if (isTouchPrimaryDevice()) {
        console.info('[HoverCard] Touch-primary device detected - skipping initialization');
        return;
    }

    hoverCardElement = document.querySelector(SELECTORS.hoverCard);

    if (!hoverCardElement) {
        console.error('[HoverCard] Hover card element not found');
        return;
    }

    // Cache DOM element references
    elements = {
        title: select(hoverCardElement, SELECTORS.title),
        rating: select(hoverCardElement, SELECTORS.rating),
        year: select(hoverCardElement, SELECTORS.year),
        runtime: select(hoverCardElement, SELECTORS.runtime),
        overview: select(hoverCardElement, SELECTORS.overview),
        genres: select(hoverCardElement, SELECTORS.genres),
        castSkeleton: select(hoverCardElement, SELECTORS.castSkeleton),
        cast: select(hoverCardElement, SELECTORS.cast),
    };

    apiClient = options.apiClient;

    // Cache genre map once at initialization
    genreMap = createGenreMap(options.genres);

    console.info('[HoverCard] Initialized');
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    initHoverCard,
    registerContainer,
};
