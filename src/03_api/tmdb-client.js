/**
 * ============================================================================
 * TMDB API Client - Singleton Module with Caching
 * ============================================================================
 *
 * A centralized, cached API client for The Movie Database (TMDB).
 * Implements the Singleton pattern via ES6 module exports.
 *
 * Features:
 * - In-memory cache with TTL (Time-To-Live)
 * - localStorage persistence for session survival
 * - Comprehensive coverage: Movies, TV Series, People
 * - Clean separation of concerns
 *
 * @module tmdb-client
 * @version 1.0.0
 * @author Fawzi-AI / Filmzimmer
 */

// ============================================================================
// SECTION 1: CONFIGURATION
// ============================================================================

/**
 * API Configuration Constants
 * @constant {Object}
 */
const CONFIG = Object.freeze({
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
    DEFAULT_LANGUAGE: 'en-US',
    DEFAULT_REGION: 'US',
});

/**
 * Cache Time-To-Live values in milliseconds
 * @constant {Object}
 */
const CACHE_TTL = Object.freeze({
    CONFIGURATION: 7 * 24 * 60 * 60 * 1000,  // 7 days (rarely changes)
    MOVIE_DETAILS: 24 * 60 * 60 * 1000,       // 24 hours
    TV_DETAILS: 24 * 60 * 60 * 1000,          // 24 hours
    PERSON_DETAILS: 24 * 60 * 60 * 1000,      // 24 hours
    SEARCH_RESULTS: 60 * 60 * 1000,           // 1 hour
    TRENDING: 60 * 60 * 1000,                 // 1 hour
    POPULAR: 60 * 60 * 1000,                  // 1 hour
    CREDITS: 24 * 60 * 60 * 1000,             // 24 hours
    GENRES: 7 * 24 * 60 * 60 * 1000,          // 7 days
});

/**
 * localStorage namespace prefix
 * @constant {string}
 */
const STORAGE_PREFIX = 'filmzimmer:tmdb:';

/**
 * Image size presets available from TMDB
 * @constant {Object}
 */
const IMAGE_SIZES = Object.freeze({
    poster: {
        small: 'w185',
        medium: 'w342',
        large: 'w500',
        original: 'original',
    },
    backdrop: {
        small: 'w300',
        medium: 'w780',
        large: 'w1280',
        original: 'original',
    },
    profile: {
        small: 'w45',
        medium: 'w185',
        large: 'h632',
        original: 'original',
    },
    still: {
        small: 'w92',
        medium: 'w185',
        large: 'w300',
        original: 'original',
    },
});


// ============================================================================
// SECTION 2: STATE MANAGEMENT
// ============================================================================

/**
 * Module-level state (private)
 */
let apiKey = '';
let isInitialized = false;

/**
 * In-memory cache storage
 * @type {Map<string, {data: any, timestamp: number, ttl: number}>}
 */
const memoryCache = new Map();


// ============================================================================
// SECTION 3: CACHE UTILITIES
// ============================================================================

/**
 * Generates a unique cache key from components
 * @param {...string} parts - Key components to join
 * @returns {string} Concatenated cache key
 */
const createCacheKey = (...parts) => parts.filter(Boolean).join(':');

/**
 * Checks if a cache entry is still valid
 * @param {Object} entry - Cache entry with timestamp and ttl
 * @returns {boolean} True if entry is valid
 */
const isCacheValid = (entry) => {
    if (!entry || !entry.timestamp || !entry.ttl) return false;
    return Date.now() - entry.timestamp < entry.ttl;
};

/**
 * Retrieves data from memory cache
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/missing
 */
const getFromMemoryCache = (key) => {
    const entry = memoryCache.get(key);
    if (entry && isCacheValid(entry)) {
        return entry.data;
    }
    if (entry) {
        memoryCache.delete(key);
    }
    return null;
};

/**
 * Stores data in memory cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time-to-live in milliseconds
 */
const setInMemoryCache = (key, data, ttl) => {
    memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
    });
};

/**
 * Retrieves data from localStorage
 * @param {string} key - Cache key (without prefix)
 * @returns {any|null} Parsed data or null if expired/missing
 */
const getFromLocalStorage = (key) => {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        if (!raw) return null;

        const entry = JSON.parse(raw);
        if (isCacheValid(entry)) {
            return entry.data;
        }

        localStorage.removeItem(STORAGE_PREFIX + key);
        return null;
    } catch (error) {
        console.warn(`[TMDB Cache] localStorage read error for key "${key}":`, error);
        return null;
    }
};

/**
 * Stores data in localStorage (async to not block main thread)
 * @param {string} key - Cache key (without prefix)
 * @param {any} data - Data to store
 * @param {number} ttl - Time-to-live in milliseconds
 */
const setInLocalStorage = (key, data, ttl) => {
    setTimeout(() => {
        try {
            const entry = {
                data,
                timestamp: Date.now(),
                ttl,
            };
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
        } catch (error) {
            console.warn(`[TMDB Cache] localStorage write error for key "${key}":`, error);
        }
    }, 0);
};

/**
 * Unified cache getter - checks memory first, then localStorage
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
const getFromCache = (key) => {
    const memoryData = getFromMemoryCache(key);
    if (memoryData !== null) {
        return memoryData;
    }

    const storageData = getFromLocalStorage(key);
    if (storageData !== null) {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        if (raw) {
            const entry = JSON.parse(raw);
            setInMemoryCache(key, storageData, entry.ttl);
        }
        return storageData;
    }

    return null;
};

/**
 * Unified cache setter - writes to both memory and localStorage
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time-to-live in milliseconds
 */
const setInCache = (key, data, ttl) => {
    setInMemoryCache(key, data, ttl);
    setInLocalStorage(key, data, ttl);
};

/**
 * Clears all TMDB cache entries
 * @param {boolean} [memoryOnly=false] - If true, only clears memory cache
 */
const clearAllCache = (memoryOnly = false) => {
    memoryCache.clear();

    if (!memoryOnly) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
};


// ============================================================================
// SECTION 4: HTTP UTILITIES
// ============================================================================

/**
 * Builds a complete API URL with query parameters
 * @param {string} endpoint - API endpoint (e.g., '/movie/123')
 * @param {Object} [params={}] - Additional query parameters
 * @returns {string} Complete URL
 */
const buildUrl = (endpoint, params = {}) => {
    const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);

    url.searchParams.set('api_key', apiKey);

    if (!params.language) {
        url.searchParams.set('language', CONFIG.DEFAULT_LANGUAGE);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
};

/**
 * Performs a fetch request with error handling
 * @param {string} url - Complete URL to fetch
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} On network or API errors
 */
const fetchFromApi = async (url) => {
    const response = await fetch(url);

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.status_message || `HTTP ${response.status}`;
        throw new Error(`[TMDB API Error] ${message}`);
    }

    return response.json();
};

/**
 * Fetches data with caching layer
 * @param {string} cacheKey - Key for cache storage
 * @param {string} endpoint - API endpoint
 * @param {Object} [params={}] - Query parameters
 * @param {number} ttl - Cache TTL in milliseconds
 * @returns {Promise<any>} API response data
 */
const fetchWithCache = async (cacheKey, endpoint, params = {}, ttl) => {
    const cachedData = getFromCache(cacheKey);
    if (cachedData !== null) {
        return cachedData;
    }

    const url = buildUrl(endpoint, params);
    const data = await fetchFromApi(url);

    setInCache(cacheKey, data, ttl);

    return data;
};


// ============================================================================
// SECTION 5: IMAGE URL HELPERS
// ============================================================================

/**
 * Constructs a complete image URL
 * @param {string|null} path - Image path from TMDB (e.g., '/abc123.jpg')
 * @param {string} type - Image type: 'poster', 'backdrop', 'profile', 'still'
 * @param {string} [size='medium'] - Size preset: 'small', 'medium', 'large', 'original'
 * @returns {string|null} Complete image URL or null if no path
 */
const getImageUrl = (path, type, size = 'medium') => {
    if (!path) return null;

    const sizeConfig = IMAGE_SIZES[type];
    if (!sizeConfig) {
        console.warn(`[TMDB] Unknown image type: ${type}`);
        return null;
    }

    const sizeValue = sizeConfig[size] || sizeConfig.medium;
    return `${CONFIG.IMAGE_BASE_URL}/${sizeValue}${path}`;
};

/**
 * Gets poster image URL
 * @param {string|null} path - Poster path
 * @param {string} [size='medium'] - Size preset
 * @returns {string|null} Poster URL
 */
const getPosterUrl = (path, size = 'medium') => getImageUrl(path, 'poster', size);

/**
 * Gets backdrop image URL
 * @param {string|null} path - Backdrop path
 * @param {string} [size='medium'] - Size preset
 * @returns {string|null} Backdrop URL
 */
const getBackdropUrl = (path, size = 'medium') => getImageUrl(path, 'backdrop', size);

/**
 * Gets profile image URL (for people)
 * @param {string|null} path - Profile path
 * @param {string} [size='medium'] - Size preset
 * @returns {string|null} Profile URL
 */
const getProfileUrl = (path, size = 'medium') => getImageUrl(path, 'profile', size);


// ============================================================================
// SECTION 6: CONFIGURATION & GENRES
// ============================================================================

/**
 * Fetches TMDB API configuration (image base URLs, etc.)
 * @returns {Promise<Object>} Configuration object
 */
const getConfiguration = async () => {
    const cacheKey = createCacheKey('config');
    return fetchWithCache(cacheKey, '/configuration', {}, CACHE_TTL.CONFIGURATION);
};

/**
 * Fetches all movie genres
 * @returns {Promise<Array<{id: number, name: string}>>} Array of genres
 */
const getMovieGenres = async () => {
    const cacheKey = createCacheKey('genres', 'movie');
    const response = await fetchWithCache(cacheKey, '/genre/movie/list', {}, CACHE_TTL.GENRES);
    return response.genres;
};

/**
 * Fetches all TV genres
 * @returns {Promise<Array<{id: number, name: string}>>} Array of genres
 */
const getTvGenres = async () => {
    const cacheKey = createCacheKey('genres', 'tv');
    const response = await fetchWithCache(cacheKey, '/genre/tv/list', {}, CACHE_TTL.GENRES);
    return response.genres;
};


// ============================================================================
// SECTION 7: MOVIE METHODS
// ============================================================================

/**
 * Fetches detailed information about a movie
 * @param {number} movieId - TMDB movie ID
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.appendToResponse] - Additional data to append
 * @returns {Promise<Object>} Movie details
 */
const getMovieDetails = async (movieId, options = {}) => {
    const append = options.appendToResponse || 'credits,videos,images,recommendations,similar';
    const cacheKey = createCacheKey('movie', movieId, append);

    return fetchWithCache(
        cacheKey,
        `/movie/${movieId}`,
        { append_to_response: append },
        CACHE_TTL.MOVIE_DETAILS
    );
};

/**
 * Fetches movie credits (cast and crew)
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<{cast: Array, crew: Array}>} Credits object
 */
const getMovieCredits = async (movieId) => {
    const cacheKey = createCacheKey('movie', movieId, 'credits');
    return fetchWithCache(cacheKey, `/movie/${movieId}/credits`, {}, CACHE_TTL.CREDITS);
};

/**
 * Fetches movie videos (trailers, teasers, etc.)
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<{results: Array}>} Videos object
 */
const getMovieVideos = async (movieId) => {
    const cacheKey = createCacheKey('movie', movieId, 'videos');
    return fetchWithCache(cacheKey, `/movie/${movieId}/videos`, {}, CACHE_TTL.MOVIE_DETAILS);
};

/**
 * Fetches movie images (posters, backdrops)
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<{posters: Array, backdrops: Array}>} Images object
 */
const getMovieImages = async (movieId) => {
    const cacheKey = createCacheKey('movie', movieId, 'images');
    return fetchWithCache(
        cacheKey,
        `/movie/${movieId}/images`,
        { include_image_language: 'en,null' },
        CACHE_TTL.MOVIE_DETAILS
    );
};

/**
 * Fetches similar movies
 * @param {number} movieId - TMDB movie ID
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated similar movies
 */
const getSimilarMovies = async (movieId, page = 1) => {
    const cacheKey = createCacheKey('movie', movieId, 'similar', page);
    return fetchWithCache(cacheKey, `/movie/${movieId}/similar`, { page }, CACHE_TTL.MOVIE_DETAILS);
};

/**
 * Fetches movie recommendations
 * @param {number} movieId - TMDB movie ID
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated recommendations
 */
const getMovieRecommendations = async (movieId, page = 1) => {
    const cacheKey = createCacheKey('movie', movieId, 'recommendations', page);
    return fetchWithCache(cacheKey, `/movie/${movieId}/recommendations`, { page }, CACHE_TTL.MOVIE_DETAILS);
};

/**
 * Fetches popular movies
 * @param {number} [page=1] - Page number
 * @param {string} [region] - ISO 3166-1 region code
 * @returns {Promise<Object>} Paginated popular movies
 */
const getPopularMovies = async (page = 1, region = CONFIG.DEFAULT_REGION) => {
    const cacheKey = createCacheKey('movies', 'popular', page, region);
    return fetchWithCache(cacheKey, '/movie/popular', { page, region }, CACHE_TTL.POPULAR);
};

/**
 * Fetches top rated movies
 * @param {number} [page=1] - Page number
 * @param {string} [region] - ISO 3166-1 region code
 * @returns {Promise<Object>} Paginated top rated movies
 */
const getTopRatedMovies = async (page = 1, region = CONFIG.DEFAULT_REGION) => {
    const cacheKey = createCacheKey('movies', 'top_rated', page, region);
    return fetchWithCache(cacheKey, '/movie/top_rated', { page, region }, CACHE_TTL.POPULAR);
};

/**
 * Fetches now playing movies
 * @param {number} [page=1] - Page number
 * @param {string} [region] - ISO 3166-1 region code
 * @returns {Promise<Object>} Paginated now playing movies
 */
const getNowPlayingMovies = async (page = 1, region = CONFIG.DEFAULT_REGION) => {
    const cacheKey = createCacheKey('movies', 'now_playing', page, region);
    return fetchWithCache(cacheKey, '/movie/now_playing', { page, region }, CACHE_TTL.POPULAR);
};

/**
 * Fetches upcoming movies
 * @param {number} [page=1] - Page number
 * @param {string} [region] - ISO 3166-1 region code
 * @returns {Promise<Object>} Paginated upcoming movies
 */
const getUpcomingMovies = async (page = 1, region = CONFIG.DEFAULT_REGION) => {
    const cacheKey = createCacheKey('movies', 'upcoming', page, region);
    return fetchWithCache(cacheKey, '/movie/upcoming', { page, region }, CACHE_TTL.POPULAR);
};


// ============================================================================
// SECTION 8: TV SERIES METHODS
// ============================================================================

/**
 * Fetches detailed information about a TV series
 * @param {number} seriesId - TMDB TV series ID
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.appendToResponse] - Additional data to append
 * @returns {Promise<Object>} TV series details
 */
const getTvDetails = async (seriesId, options = {}) => {
    const append = options.appendToResponse || 'credits,videos,images,recommendations,similar';
    const cacheKey = createCacheKey('tv', seriesId, append);

    return fetchWithCache(
        cacheKey,
        `/tv/${seriesId}`,
        { append_to_response: append },
        CACHE_TTL.TV_DETAILS
    );
};

/**
 * Fetches TV series credits (cast and crew)
 * @param {number} seriesId - TMDB TV series ID
 * @returns {Promise<{cast: Array, crew: Array}>} Credits object
 */
const getTvCredits = async (seriesId) => {
    const cacheKey = createCacheKey('tv', seriesId, 'credits');
    return fetchWithCache(cacheKey, `/tv/${seriesId}/credits`, {}, CACHE_TTL.CREDITS);
};

/**
 * Fetches TV series aggregate credits (all seasons combined)
 * @param {number} seriesId - TMDB TV series ID
 * @returns {Promise<{cast: Array, crew: Array}>} Aggregate credits object
 */
const getTvAggregateCredits = async (seriesId) => {
    const cacheKey = createCacheKey('tv', seriesId, 'aggregate_credits');
    return fetchWithCache(cacheKey, `/tv/${seriesId}/aggregate_credits`, {}, CACHE_TTL.CREDITS);
};

/**
 * Fetches TV series videos
 * @param {number} seriesId - TMDB TV series ID
 * @returns {Promise<{results: Array}>} Videos object
 */
const getTvVideos = async (seriesId) => {
    const cacheKey = createCacheKey('tv', seriesId, 'videos');
    return fetchWithCache(cacheKey, `/tv/${seriesId}/videos`, {}, CACHE_TTL.TV_DETAILS);
};

/**
 * Fetches TV series images
 * @param {number} seriesId - TMDB TV series ID
 * @returns {Promise<{posters: Array, backdrops: Array}>} Images object
 */
const getTvImages = async (seriesId) => {
    const cacheKey = createCacheKey('tv', seriesId, 'images');
    return fetchWithCache(
        cacheKey,
        `/tv/${seriesId}/images`,
        { include_image_language: 'en,null' },
        CACHE_TTL.TV_DETAILS
    );
};

/**
 * Fetches details for a specific TV season
 * @param {number} seriesId - TMDB TV series ID
 * @param {number} seasonNumber - Season number
 * @returns {Promise<Object>} Season details including episodes
 */
const getTvSeasonDetails = async (seriesId, seasonNumber) => {
    const cacheKey = createCacheKey('tv', seriesId, 'season', seasonNumber);
    return fetchWithCache(
        cacheKey,
        `/tv/${seriesId}/season/${seasonNumber}`,
        { append_to_response: 'credits,images' },
        CACHE_TTL.TV_DETAILS
    );
};

/**
 * Fetches details for a specific TV episode
 * @param {number} seriesId - TMDB TV series ID
 * @param {number} seasonNumber - Season number
 * @param {number} episodeNumber - Episode number
 * @returns {Promise<Object>} Episode details
 */
const getTvEpisodeDetails = async (seriesId, seasonNumber, episodeNumber) => {
    const cacheKey = createCacheKey('tv', seriesId, 'season', seasonNumber, 'episode', episodeNumber);
    return fetchWithCache(
        cacheKey,
        `/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`,
        { append_to_response: 'credits,images' },
        CACHE_TTL.TV_DETAILS
    );
};

/**
 * Fetches similar TV series
 * @param {number} seriesId - TMDB TV series ID
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated similar series
 */
const getSimilarTvSeries = async (seriesId, page = 1) => {
    const cacheKey = createCacheKey('tv', seriesId, 'similar', page);
    return fetchWithCache(cacheKey, `/tv/${seriesId}/similar`, { page }, CACHE_TTL.TV_DETAILS);
};

/**
 * Fetches TV series recommendations
 * @param {number} seriesId - TMDB TV series ID
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated recommendations
 */
const getTvRecommendations = async (seriesId, page = 1) => {
    const cacheKey = createCacheKey('tv', seriesId, 'recommendations', page);
    return fetchWithCache(cacheKey, `/tv/${seriesId}/recommendations`, { page }, CACHE_TTL.TV_DETAILS);
};

/**
 * Fetches popular TV series
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated popular TV series
 */
const getPopularTvSeries = async (page = 1) => {
    const cacheKey = createCacheKey('tv', 'popular', page);
    return fetchWithCache(cacheKey, '/tv/popular', { page }, CACHE_TTL.POPULAR);
};

/**
 * Fetches top rated TV series
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated top rated TV series
 */
const getTopRatedTvSeries = async (page = 1) => {
    const cacheKey = createCacheKey('tv', 'top_rated', page);
    return fetchWithCache(cacheKey, '/tv/top_rated', { page }, CACHE_TTL.POPULAR);
};

/**
 * Fetches TV series airing today
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated airing today TV series
 */
const getTvAiringToday = async (page = 1) => {
    const cacheKey = createCacheKey('tv', 'airing_today', page);
    return fetchWithCache(cacheKey, '/tv/airing_today', { page }, CACHE_TTL.POPULAR);
};

/**
 * Fetches TV series currently on the air
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated on the air TV series
 */
const getTvOnTheAir = async (page = 1) => {
    const cacheKey = createCacheKey('tv', 'on_the_air', page);
    return fetchWithCache(cacheKey, '/tv/on_the_air', { page }, CACHE_TTL.POPULAR);
};


// ============================================================================
// SECTION 9: PEOPLE METHODS
// ============================================================================

/**
 * Fetches detailed information about a person
 * @param {number} personId - TMDB person ID
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.appendToResponse] - Additional data to append
 * @returns {Promise<Object>} Person details
 */
const getPersonDetails = async (personId, options = {}) => {
    const append = options.appendToResponse || 'combined_credits,images,external_ids';
    const cacheKey = createCacheKey('person', personId, append);

    return fetchWithCache(
        cacheKey,
        `/person/${personId}`,
        { append_to_response: append },
        CACHE_TTL.PERSON_DETAILS
    );
};

/**
 * Fetches a person's movie credits
 * @param {number} personId - TMDB person ID
 * @returns {Promise<{cast: Array, crew: Array}>} Movie credits
 */
const getPersonMovieCredits = async (personId) => {
    const cacheKey = createCacheKey('person', personId, 'movie_credits');
    return fetchWithCache(cacheKey, `/person/${personId}/movie_credits`, {}, CACHE_TTL.CREDITS);
};

/**
 * Fetches a person's TV credits
 * @param {number} personId - TMDB person ID
 * @returns {Promise<{cast: Array, crew: Array}>} TV credits
 */
const getPersonTvCredits = async (personId) => {
    const cacheKey = createCacheKey('person', personId, 'tv_credits');
    return fetchWithCache(cacheKey, `/person/${personId}/tv_credits`, {}, CACHE_TTL.CREDITS);
};

/**
 * Fetches a person's combined (movie + TV) credits
 * @param {number} personId - TMDB person ID
 * @returns {Promise<{cast: Array, crew: Array}>} Combined credits
 */
const getPersonCombinedCredits = async (personId) => {
    const cacheKey = createCacheKey('person', personId, 'combined_credits');
    return fetchWithCache(cacheKey, `/person/${personId}/combined_credits`, {}, CACHE_TTL.CREDITS);
};

/**
 * Fetches a person's images
 * @param {number} personId - TMDB person ID
 * @returns {Promise<{profiles: Array}>} Images object
 */
const getPersonImages = async (personId) => {
    const cacheKey = createCacheKey('person', personId, 'images');
    return fetchWithCache(cacheKey, `/person/${personId}/images`, {}, CACHE_TTL.PERSON_DETAILS);
};

/**
 * Fetches popular people
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated popular people
 */
const getPopularPeople = async (page = 1) => {
    const cacheKey = createCacheKey('people', 'popular', page);
    return fetchWithCache(cacheKey, '/person/popular', { page }, CACHE_TTL.POPULAR);
};


// ============================================================================
// SECTION 10: SEARCH METHODS
// ============================================================================

/**
 * Searches for movies
 * @param {string} query - Search query
 * @param {Object} [options={}] - Search options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.year] - Filter by release year
 * @param {string} [options.region] - ISO 3166-1 region code
 * @returns {Promise<Object>} Paginated search results
 */
const searchMovies = async (query, options = {}) => {
    const { page = 1, year, region } = options;
    const cacheKey = createCacheKey('search', 'movie', query.toLowerCase(), page, year, region);

    return fetchWithCache(
        cacheKey,
        '/search/movie',
        { query, page, year, region },
        CACHE_TTL.SEARCH_RESULTS
    );
};

/**
 * Searches for TV series
 * @param {string} query - Search query
 * @param {Object} [options={}] - Search options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.firstAirDateYear] - Filter by first air date year
 * @returns {Promise<Object>} Paginated search results
 */
const searchTvSeries = async (query, options = {}) => {
    const { page = 1, firstAirDateYear } = options;
    const cacheKey = createCacheKey('search', 'tv', query.toLowerCase(), page, firstAirDateYear);

    return fetchWithCache(
        cacheKey,
        '/search/tv',
        { query, page, first_air_date_year: firstAirDateYear },
        CACHE_TTL.SEARCH_RESULTS
    );
};

/**
 * Searches for people
 * @param {string} query - Search query
 * @param {Object} [options={}] - Search options
 * @param {number} [options.page=1] - Page number
 * @returns {Promise<Object>} Paginated search results
 */
const searchPeople = async (query, options = {}) => {
    const { page = 1 } = options;
    const cacheKey = createCacheKey('search', 'person', query.toLowerCase(), page);

    return fetchWithCache(
        cacheKey,
        '/search/person',
        { query, page },
        CACHE_TTL.SEARCH_RESULTS
    );
};

/**
 * Performs a multi-search across movies, TV, and people
 * @param {string} query - Search query
 * @param {Object} [options={}] - Search options
 * @param {number} [options.page=1] - Page number
 * @returns {Promise<Object>} Paginated multi-search results
 */
const searchMulti = async (query, options = {}) => {
    const { page = 1 } = options;
    const cacheKey = createCacheKey('search', 'multi', query.toLowerCase(), page);

    return fetchWithCache(
        cacheKey,
        '/search/multi',
        { query, page },
        CACHE_TTL.SEARCH_RESULTS
    );
};


// ============================================================================
// SECTION 11: TRENDING & DISCOVER
// ============================================================================

/**
 * Fetches trending content
 * @param {string} [mediaType='all'] - Media type: 'all', 'movie', 'tv', 'person'
 * @param {string} [timeWindow='week'] - Time window: 'day' or 'week'
 * @param {number} [page=1] - Page number
 * @returns {Promise<Object>} Paginated trending content
 */
const getTrending = async (mediaType = 'all', timeWindow = 'week', page = 1) => {
    const cacheKey = createCacheKey('trending', mediaType, timeWindow, page);
    return fetchWithCache(
        cacheKey,
        `/trending/${mediaType}/${timeWindow}`,
        { page },
        CACHE_TTL.TRENDING
    );
};

/**
 * Discovers movies with filters
 * @param {Object} [filters={}] - Discovery filters
 * @param {number} [filters.page=1] - Page number
 * @param {string} [filters.sortBy='popularity.desc'] - Sort order
 * @param {string} [filters.withGenres] - Comma-separated genre IDs
 * @param {number} [filters.year] - Release year
 * @param {number} [filters.voteAverageGte] - Minimum vote average
 * @param {number} [filters.voteAverageLte] - Maximum vote average
 * @returns {Promise<Object>} Paginated discovery results
 */
const discoverMovies = async (filters = {}) => {
    const {
        page = 1,
        sortBy = 'popularity.desc',
        withGenres,
        year,
        voteAverageGte,
        voteAverageLte,
    } = filters;

    const params = {
        page,
        sort_by: sortBy,
        with_genres: withGenres,
        year,
        'vote_average.gte': voteAverageGte,
        'vote_average.lte': voteAverageLte,
    };

    const cacheKey = createCacheKey('discover', 'movie', JSON.stringify(params));
    return fetchWithCache(cacheKey, '/discover/movie', params, CACHE_TTL.POPULAR);
};

/**
 * Discovers TV series with filters
 * @param {Object} [filters={}] - Discovery filters
 * @param {number} [filters.page=1] - Page number
 * @param {string} [filters.sortBy='popularity.desc'] - Sort order
 * @param {string} [filters.withGenres] - Comma-separated genre IDs
 * @param {number} [filters.firstAirDateYear] - First air date year
 * @param {number} [filters.voteAverageGte] - Minimum vote average
 * @returns {Promise<Object>} Paginated discovery results
 */
const discoverTvSeries = async (filters = {}) => {
    const {
        page = 1,
        sortBy = 'popularity.desc',
        withGenres,
        firstAirDateYear,
        voteAverageGte,
    } = filters;

    const params = {
        page,
        sort_by: sortBy,
        with_genres: withGenres,
        first_air_date_year: firstAirDateYear,
        'vote_average.gte': voteAverageGte,
    };

    const cacheKey = createCacheKey('discover', 'tv', JSON.stringify(params));
    return fetchWithCache(cacheKey, '/discover/tv', params, CACHE_TTL.POPULAR);
};


// ============================================================================
// SECTION 12: INITIALIZATION & EXPORT
// ============================================================================

/**
 * Initializes the TMDB client with an API key
 * Must be called before using any other methods
 * @param {string} key - Your TMDB API key
 * @throws {Error} If API key is not provided
 */
const initialize = (key) => {
    if (!key || typeof key !== 'string') {
        throw new Error('[TMDB Client] API key is required for initialization');
    }

    apiKey = key;
    isInitialized = true;

    console.log('[TMDB Client] Initialized successfully');
};

/**
 * Checks if the client has been initialized
 * @returns {boolean} True if initialized
 */
const isReady = () => isInitialized;

/**
 * Gets cache statistics for debugging
 * @returns {Object} Cache statistics
 */
const getCacheStats = () => ({
    memoryCacheSize: memoryCache.size,
    memoryCacheKeys: Array.from(memoryCache.keys()),
});


// ============================================================================
// SECTION 13: PUBLIC API (FROZEN SINGLETON)
// ============================================================================

/**
 * TMDB Client Public API
 * Exported as a frozen object to prevent accidental modification
 */
const TMDBClient = Object.freeze({
    // Initialization
    initialize,
    isReady,

    // Configuration & Genres
    getConfiguration,
    getMovieGenres,
    getTvGenres,

    // Movies
    getMovieDetails,
    getMovieCredits,
    getMovieVideos,
    getMovieImages,
    getSimilarMovies,
    getMovieRecommendations,
    getPopularMovies,
    getTopRatedMovies,
    getNowPlayingMovies,
    getUpcomingMovies,

    // TV Series
    getTvDetails,
    getTvCredits,
    getTvAggregateCredits,
    getTvVideos,
    getTvImages,
    getTvSeasonDetails,
    getTvEpisodeDetails,
    getSimilarTvSeries,
    getTvRecommendations,
    getPopularTvSeries,
    getTopRatedTvSeries,
    getTvAiringToday,
    getTvOnTheAir,

    // People
    getPersonDetails,
    getPersonMovieCredits,
    getPersonTvCredits,
    getPersonCombinedCredits,
    getPersonImages,
    getPopularPeople,

    // Search
    searchMovies,
    searchTvSeries,
    searchPeople,
    searchMulti,

    // Trending & Discover
    getTrending,
    discoverMovies,
    discoverTvSeries,

    // Image Helpers
    getImageUrl,
    getPosterUrl,
    getBackdropUrl,
    getProfileUrl,
    IMAGE_SIZES,

    // Cache Management
    clearAllCache,
    getCacheStats,
});


// ============================================================================
// SECTION 14: MODULE EXPORT
// ============================================================================

export default TMDBClient;

export {
    initialize,
    isReady,
    getConfiguration,
    getMovieGenres,
    getTvGenres,
    getMovieDetails,
    getMovieCredits,
    getMovieVideos,
    getMovieImages,
    getSimilarMovies,
    getMovieRecommendations,
    getPopularMovies,
    getTopRatedMovies,
    getNowPlayingMovies,
    getUpcomingMovies,
    getTvDetails,
    getTvCredits,
    getTvAggregateCredits,
    getTvVideos,
    getTvImages,
    getTvSeasonDetails,
    getTvEpisodeDetails,
    getSimilarTvSeries,
    getTvRecommendations,
    getPopularTvSeries,
    getTopRatedTvSeries,
    getTvAiringToday,
    getTvOnTheAir,
    getPersonDetails,
    getPersonMovieCredits,
    getPersonTvCredits,
    getPersonCombinedCredits,
    getPersonImages,
    getPopularPeople,
    searchMovies,
    searchTvSeries,
    searchPeople,
    searchMulti,
    getTrending,
    discoverMovies,
    discoverTvSeries,
    getImageUrl,
    getPosterUrl,
    getBackdropUrl,
    getProfileUrl,
    IMAGE_SIZES,
    clearAllCache,
    getCacheStats,
};