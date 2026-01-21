/**
 * ============================================================================
 * People Section Component
 * ============================================================================
 * 
 * Handles the popular people carousel display and interactions.
 * 
 * @module people-section
 * @author Fawzi
 */

import { select, setText, setAttribute } from '../01_utils/dom-loader.js';


// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
    carousel: '[data-element="people-carousel"]',
    scrollLeft: '[data-action="scroll-left"]',
    scrollRight: '[data-action="scroll-right"]',
    cardTemplate: '[data-template="person-card"]',
};

const SCROLL_AMOUNT = 400;

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"%3E%3Crect fill="%2312121a" width="96" height="96"/%3E%3Ccircle cx="48" cy="35" r="15" fill="%2394a3b8"/%3E%3Cellipse cx="48" cy="75" rx="25" ry="18" fill="%2394a3b8"/%3E%3C/svg%3E';


// ============================================================================
// CARD RENDERING
// ============================================================================

/**
 * Creates a person card element from template
 * @param {Object} person - TMDB person data
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template
 * @returns {HTMLElement} Populated card element
 */
const createCardElement = (person, apiClient, template) => {
    const card = template.content.cloneNode(true).firstElementChild;
    
    const name = person.name || 'Unknown';
    const knownFor = person.known_for_department || 'Acting';
    const profileUrl = apiClient.getProfileUrl(person.profile_path, 'medium');
    
    setAttribute(card, 'data-id', person.id);
    
    const profile = select(card, '[data-element="card-profile"]');
    if (profile) {
        profile.src = profileUrl || PLACEHOLDER_IMAGE;
        profile.alt = name;
    }
    
    setText(select(card, '[data-element="card-name"]'), name);
    setText(select(card, '[data-element="card-known-for"]'), knownFor);
    
    return card;
};

/**
 * Renders person cards into the carousel
 * @param {HTMLElement} carousel - Carousel container
 * @param {Array} people - Array of person data
 * @param {Object} apiClient - TMDB API client
 * @param {HTMLTemplateElement} template - Card template
 */
const renderCards = (carousel, people, apiClient, template) => {
    carousel.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    people.forEach((person) => {
        const card = createCardElement(person, apiClient, template);
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
 * Sets up card click handlers using event delegation
 * @param {HTMLElement} container - Section container
 */
const setupEventHandlers = (container) => {
    const carousel = select(container, SELECTORS.carousel);
    
    if (!carousel) return;
    
    carousel.addEventListener('click', (event) => {
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
 * @param {number} id - Person ID
 */
const handleCardClick = (id) => {
    console.info(`[People] Card clicked: person/${id}`);
    
    window.dispatchEvent(new CustomEvent('filmzimmer:view-details', {
        detail: { id, mediaType: 'person' }
    }));
};


// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the people section
 * @param {HTMLElement} container - Section mount point
 * @param {Array} people - Popular people from API
 * @param {Object} apiClient - TMDB API client
 */
const initPeopleSection = async (container, people, apiClient) => {
    if (!people || people.length === 0) {
        console.warn('[People] No people provided');
        return;
    }
    
    const carousel = select(container, SELECTORS.carousel);
    const template = select(container, SELECTORS.cardTemplate);
    
    if (!carousel || !template) {
        console.error('[People] Required elements not found');
        return;
    }
    
    renderCards(carousel, people, apiClient, template);
    setupCarouselScrolling(container);
    setupEventHandlers(container);
    
    console.info(`[People] Section initialized with ${people.length} items`);
};


// ============================================================================
// EXPORTS
// ============================================================================

export { initPeopleSection };
