/**
 * ============================================================================
 * AI Bridge API Module
 * ============================================================================
 *
 * Provides communication with the Oskar AI chatbot backend.
 *
 * @module ai-bridge
 * @author Fawzi
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * API configuration constants
 * @constant {Object}
 */
const API_CONFIG = Object.freeze({
    BASE_URL: 'http://localhost:8000',
    ENDPOINT: '/chat',
    TIMEOUT_MS: 30000,
});


// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Sends a message to the Oskar chatbot and returns the response
 * @param {string} message - User message to send (1-1000 characters)
 * @returns {Promise<string>} Bot response or error message
 */
const sendMessage = async (message) => {
    // Input validation
    if (!message || typeof message !== 'string') {
        return 'Please enter a message.';
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0) {
        return 'Please enter a message.';
    }

    if (trimmedMessage.length > 1000) {
        return 'Message is too long. Please keep it under 1000 characters.';
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: trimmedMessage }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[AI Bridge] HTTP error: ${response.status}`);
            return 'Sorry, I encountered an error. Please try again.';
        }

        const data = await response.json();
        return data.response || 'Sorry, I did not receive a valid response.';

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            console.error('[AI Bridge] Request timed out');
            return 'Request timed out. Please try again.';
        }

        console.error('[AI Bridge] Request failed:', error);
        return 'Sorry, I could not connect to the server. Please check your connection.';
    }
};


// ============================================================================
// EXPORTS
// ============================================================================

export { sendMessage, API_CONFIG };
