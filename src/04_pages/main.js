/**
 * ============================================================================
 * Main Application Orchestrator
 * ============================================================================
 *
 * This module serves as the application entry point and orchestration layer.
 * It coordinates API initialization, data loading, and section mounting.
 *
 * Responsibilities:
 * - Initialize external services (TMDB API)
 * - Load initial application data
 * - Delegate section rendering to dedicated modules
 * - Expose global application state
 *
 * @module main
 * @author Fawzi
 */

// ============================================================================
// IMPORTS
// ============================================================================

import TMDBClient from '../03_api/tmdb-client.js';
import { loadTemplate, showElement, hideElement } from '../01_utils/dom-loader.js';
import { initHeroSection } from '../02_components/01-hero-section.js';
import { initTrendingSection } from '../02_components/02-trending-section.js';
import { initMoviesSection } from '../02_components/03-movies-section.js';
import { initSeriesSection } from '../02_components/04-series-section.js';
import { initPeopleSection } from '../02_components/05-people-section.js';
import { initHoverCard } from '../02_components/00-hover-card.js';
import { initNavbar } from '../02_components/01_navbar.js';


// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Application configuration constants
 * @constant {Object}
 */
const APP_CONFIG = Object.freeze({
    name: 'Filmzimmer',
    version: '1.0.0',
    tmdbApiKey: 'e4a2397077d9e2b4dda4b52d14c6e96a',

    mountPoints: {
        navbar: '#mount-navbar',
        loading: '#loading-indicator',
        hero: '#mount-hero',
        trending: '#mount-trending',
        movies: '#mount-movies',
        series: '#mount-series',
        people: '#mount-people',
    },

    templatePaths: {
        navbar: './src/02_components/01_navbar.html',
        hero: './src/02_components/01-hero-section.html',
        trending: './src/02_components/02-trending-section.html',
        movies: './src/02_components/03-movies-section.html',
        series: './src/02_components/04-series-section.html',
        people: './src/02_components/05-people-section.html',
        hoverCard: './src/02_components/00-hover-card.html',
    },
});


// ============================================================================
// NAVBAR INITIALIZATION
// ============================================================================

/**
 * Initializes the navbar component
 * Called early in bootstrap to show navbar immediately
 */
const initializeNavbar = async () => {
    try {
        const container = document.querySelector(APP_CONFIG.mountPoints.navbar);
        if (!container) {
            console.warn(`[${APP_CONFIG.name}] Navbar mount point not found`);
            return;
        }

        const template = await loadTemplate(APP_CONFIG.templatePaths.navbar);
        container.innerHTML = template;

        initNavbar(container);

        console.info(`[${APP_CONFIG.name}] Navbar initialized`);

    } catch (error) {
        console.warn(`[${APP_CONFIG.name}] Failed to initialize navbar:`, error);
    }
};


// ============================================================================
// API INITIALIZATION
// ============================================================================

/**
 * Initializes the TMDB API client
 * @returns {boolean} Success status
 */
const initializeApiClient = () => {
    try {
        TMDBClient.initialize(APP_CONFIG.tmdbApiKey);
        console.info(`[${APP_CONFIG.name}] API client initialized`);
        return true;
    } catch (error) {
        console.error(`[${APP_CONFIG.name}] API initialization failed:`, error);
        return false;
    }
};


// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Fetches all required initial data from TMDB API
 * @returns {Promise<Object>} Aggregated data object
 */
const fetchInitialData = async () => {
    console.info(`[${APP_CONFIG.name}] Fetching initial data...`);

    const [
        trendingResponse,
        popularMoviesResponse,
        popularTvResponse,
        topRatedMoviesResponse,
        popularPeopleResponse,
        movieGenresResponse,
        tvGenresResponse,
    ] = await Promise.all([
        TMDBClient.getTrending('all', 'week'),
        TMDBClient.getPopularMovies(),
        TMDBClient.getPopularTvSeries(),
        TMDBClient.getTopRatedMovies(),
        TMDBClient.getPopularPeople(),
        TMDBClient.getMovieGenres(),
        TMDBClient.getTvGenres(),
    ]);

    const data = {
        trending: trendingResponse.results,
        popularMovies: popularMoviesResponse.results,
        popularTv: popularTvResponse.results,
        topRatedMovies: topRatedMoviesResponse.results,
        popularPeople: popularPeopleResponse.results,
        genres: {
            movie: movieGenresResponse,
            tv: tvGenresResponse,
        },
    };

    console.info(`[${APP_CONFIG.name}] Data fetch complete`);
    return data;
};


// ============================================================================
// SECTION ORCHESTRATION
// ============================================================================

/**
 * Loads and initializes all page sections
 * @param {Object} data - Application data from API
 */
const initializeSections = async (data) => {
    console.info(`[${APP_CONFIG.name}] Initializing sections...`);

    const sectionInitializers = [
        {
            name: 'hero',
            mountPoint: APP_CONFIG.mountPoints.hero,
            templatePath: APP_CONFIG.templatePaths.hero,
            initializer: initHeroSection,
            data: data.trending[0],
        },
        {
            name: 'trending',
            mountPoint: APP_CONFIG.mountPoints.trending,
            templatePath: APP_CONFIG.templatePaths.trending,
            initializer: initTrendingSection,
            data: data.trending,
        },
        {
            name: 'movies',
            mountPoint: APP_CONFIG.mountPoints.movies,
            templatePath: APP_CONFIG.templatePaths.movies,
            initializer: initMoviesSection,
            data: data.popularMovies,
        },
        {
            name: 'series',
            mountPoint: APP_CONFIG.mountPoints.series,
            templatePath: APP_CONFIG.templatePaths.series,
            initializer: initSeriesSection,
            data: data.popularTv,
        },
        {
            name: 'people',
            mountPoint: APP_CONFIG.mountPoints.people,
            templatePath: APP_CONFIG.templatePaths.people,
            initializer: initPeopleSection,
            data: data.popularPeople,
        },
    ];

    for (const section of sectionInitializers) {
        try {
            const container = document.querySelector(section.mountPoint);
            if (!container) {
                console.warn(`[${APP_CONFIG.name}] Mount point not found: ${section.mountPoint}`);
                continue;
            }

            const template = await loadTemplate(section.templatePath);
            container.innerHTML = template;

            await section.initializer(container, section.data, TMDBClient);

            showElement(container);
            console.info(`[${APP_CONFIG.name}] Section initialized: ${section.name}`);

        } catch (error) {
            console.error(`[${APP_CONFIG.name}] Failed to initialize section: ${section.name}`, error);
        }
    }
};


// ============================================================================
// APPLICATION STATE
// ============================================================================

/**
 * Exposes application state and utilities for external access
 * @param {Object} data - Loaded application data
 */
const exposeApplicationState = (data) => {
    window.Filmzimmer = Object.freeze({
        data,
        api: TMDBClient,
        config: APP_CONFIG,
        version: APP_CONFIG.version,
    });

    window.dispatchEvent(new CustomEvent('filmzimmer:ready', { detail: data }));
    console.info(`[${APP_CONFIG.name}] Application state exposed at window.Filmzimmer`);
};


// ============================================================================
// HOVER CARD INITIALIZATION
// ============================================================================

/**
 * Initializes the hover card component
 * @param {Object} data - Application data including genres
 */
const initializeHoverCard = async (data) => {
    try {
        const template = await loadTemplate(APP_CONFIG.templatePaths.hoverCard);

        // Append to body (portal pattern)
        const wrapper = document.createElement('div');
        wrapper.innerHTML = template;
        document.body.appendChild(wrapper.firstElementChild);

        // Initialize with API client and genres
        initHoverCard({
            apiClient: TMDBClient,
            genres: data.genres,
        });

        console.info(`[${APP_CONFIG.name}] Hover card initialized`);

    } catch (error) {
        console.warn(`[${APP_CONFIG.name}] Failed to initialize hover card:`, error);
    }
};


// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Displays application error state
 * @param {string} message - Error message
 */
const handleFatalError = (message) => {
    const loadingEl = document.querySelector(APP_CONFIG.mountPoints.loading);
    if (loadingEl) {
        loadingEl.innerHTML = `
            <div class="text-center max-w-md px-4">
                <div class="text-4xl mb-4 text-red-500">!</div>
                <h1 class="text-xl font-semibold text-white mb-2">Application Error</h1>
                <p class="text-fz-text-muted text-sm">${message}</p>
                <button onclick="location.reload()" 
                        class="mt-6 px-6 py-2 bg-fz-accent hover:bg-fz-accent-hover rounded-lg text-white text-sm transition-colors">
                    Reload Application
                </button>
            </div>
        `;
    }
};


// ============================================================================
// BOOTSTRAP
// ============================================================================

/**
 * Application bootstrap sequence
 */
const bootstrap = async () => {
    console.info(`[${APP_CONFIG.name}] Starting v${APP_CONFIG.version}`);

    // Initialize navbar first (shows immediately while data loads)
    await initializeNavbar();

    const apiReady = initializeApiClient();
    if (!apiReady) {
        handleFatalError('Failed to initialize API client. Please check your connection.');
        return;
    }

    try {
        const data = await fetchInitialData();

        hideElement(document.querySelector(APP_CONFIG.mountPoints.loading));

        await initializeHoverCard(data);

        await initializeSections(data);

        exposeApplicationState(data);

        console.info(`[${APP_CONFIG.name}] Application ready`);

    } catch (error) {
        console.error(`[${APP_CONFIG.name}] Bootstrap failed:`, error);
        handleFatalError('Failed to load application data. Please try again.');
    }
};


// ============================================================================
// ENTRY POINT
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}


// ============================================================================
// EXPORTS
// ============================================================================

export { APP_CONFIG };
export default TMDBClient;
