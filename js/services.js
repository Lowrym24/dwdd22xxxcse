/**
 * Translation App Services
 * Contains service classes for different functionalities:
 * - TranslationService: Handles API calls and caching for translations
 * - SpeechService: Manages speech recognition and synthesis
 * - StorageService: Handles local storage operations
 */

/**
 * Translation Service
 * Handles translation API calls and storage
 */
class TranslationService {
    constructor() {
        this.storageService = new StorageService();
        this.cache = {};
        this.history = this.loadHistoryFromStorage() || [];
    }

    /**
     * Translates text using the external API
     * @param {string} text - Text to translate
     * @param {string} fromLang - Source language code 
     * @param {string} toLang - Target language code
     * @returns {Promise<string>} - Translated text
     */
    async translate(text, fromLang, toLang) {
        if (!text || text.trim() === '') {
            return '';
        }

        // Create a cache key for this specific translation
        const cacheKey = `${text}_${fromLang}_${toLang}`;
        
        // Check if we already have this translation cached
        if (this.cache[cacheKey]) {
            console.log('Using cached translation');
            return this.cache[cacheKey];
        }
        
        try {
            // Call the translation API
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
            const data = await response.json();
            
            if (data.responseData && data.responseData.translatedText) {
                // Store the result in cache
                this.cache[cacheKey] = data.responseData.translatedText;
                return data.responseData.translatedText;
            } else if (data.responseDetails && data.responseDetails.includes("MYMEMORY WARNING")) {
                throw new Error('API quota exceeded');
            } else {
                throw new Error('Translation failed');
            }
        } catch (error) {
            console.error('Translation error:', error);
            throw error;
        }
    }

    /**
     * Saves a translation to history and local storage
     * @param {string} original - Original text
     * @param {string} translated - Translated text
     * @param {string} fromLang - Source language
     * @param {string} toLang - Target language
     * @param {string} customName - Optional custom name for the translation
     * @returns {Object} - Saved history item
     */
    saveTranslation(original, translated, fromLang, toLang, customName = '') {
        if (!original || !translated || original.trim() === '' || translated.trim() === '') {
            return null;
        }
        
        const historyItem = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            original: original,
            translated: translated,
            fromLang: fromLang,
            toLang: toLang,
            customName: customName.trim() || this.generateDefaultName(original),
            isFavorite: false
        };
        
        this.history.unshift(historyItem);
        this.saveHistoryToStorage();
        return historyItem;
    }
    
    /**
     * Generates a default name for translations based on the content
     * @param {string} text - Original text to derive name from
     * @returns {string} - Generated name
     */
    generateDefaultName(text) {
        // Take first 30 characters as default name
        const trimmedText = text.trim();
        if (trimmedText.length <= 30) {
            return trimmedText;
        }
        return trimmedText.substring(0, 27) + '...';
    }

    /**
     * Toggles favorite status for a history item
     * @param {string} id - Item ID to toggle
     * @returns {boolean} - New favorite status
     */
    toggleFavorite(id) {
        const item = this.history.find(item => item.id === id);
        if (item) {
            item.isFavorite = !item.isFavorite;
            this.saveHistoryToStorage();
            return item.isFavorite;
        }
        return false;
    }

    /**
     * Gets translation history with optional search filter
     * @param {string} searchQuery - Optional search query
     * @returns {Array} - Filtered history items
     */
    getHistory(searchQuery = '') {
        if (!searchQuery) return this.history;
        
        const lowerQuery = searchQuery.toLowerCase();
        return this.history.filter(item => 
            item.original.toLowerCase().includes(lowerQuery) || 
            item.translated.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Clears all history except favorites
     */
    clearHistory() {
        this.history = this.history.filter(item => item.isFavorite);
        this.saveHistoryToStorage();
    }

    /**
     * Removes a specific history item
     * @param {string} id - ID of item to remove
     */
    removeHistoryItem(id) {
        this.history = this.history.filter(item => item.id !== id);
        this.saveHistoryToStorage();
    }

    /**
     * Saves history to local storage
     */
    saveHistoryToStorage() {
        this.storageService.setItem('history', this.history);
    }

    /**
     * Loads history from local storage
     * @returns {Array|null} - History items or null if not found
     */
    loadHistoryFromStorage() {
        return this.storageService.getItem('history');
    }

    /**
     * Clears the local translation cache
     */
    clearCache() {
        this.cache = {};
    }
}

/**
 * Speech Service
 * Handles speech recognition and synthesis
 */
class SpeechService {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isRecording = false;
        
        // Set up recognition if available
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        }
    }

    /**
     * Sets up speech recognition with handlers
     * @param {Object} handlers - Event handlers
     */
    setupRecognition(handlers = {}) {
        if (!this.recognition) {
            console.error('Speech recognition not supported');
            return false;
        }
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        if (handlers.onResult) {
            this.recognition.onresult = handlers.onResult;
        }
        
        if (handlers.onEnd) {
            this.recognition.onend = handlers.onEnd;
        }
        
        if (handlers.onError) {
            this.recognition.onerror = handlers.onError;
        }
        
        if (handlers.onStart) {
            this.recognition.onstart = handlers.onStart;
        }
        
        return true;
    }

    /**
     * Starts speech recognition
     * @param {string} language - Language code
     */
    startRecognition(language) {
        if (!this.recognition) return false;
        
        this.recognition.lang = language;
        this.recognition.start();
        this.isRecording = true;
        return true;
    }

    /**
     * Stops speech recognition
     */
    stopRecognition() {
        if (!this.recognition) return false;
        
        this.recognition.stop();
        this.isRecording = false;
        return true;
    }

    /**
     * Speaks the provided text
     * @param {string} text - Text to speak
     * @param {string} language - Language code
     */
    speak(text, language) {
        if (!this.synthesis) {
            console.error('Speech synthesis not supported');
            return false;
        }
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        // If no text is provided, just return
        if (!text || text.trim() === '') return false;
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Attempt to load voices
        this.loadVoicesPromise()
            .then(voices => {
                // Map the language code to a two-letter code for matching
                const langCode = language.split('-')[0];
                this.setVoiceAndSpeak(utterance, voices, langCode, text);
            })
            .catch(err => {
                console.error('Error loading voices:', err);
                // Fallback to just using the language code
                utterance.lang = language;
                this.synthesis.speak(utterance);
            });
            
        return true;
    }

    /**
     * Helper function to load voices asynchronously
     * @returns {Promise<SpeechSynthesisVoice[]>} - Promise resolving to array of voices
     */
    loadVoicesPromise() {
        return new Promise((resolve, reject) => {
            // Check if voices are already loaded
            let voices = this.synthesis.getVoices();
            
            if (voices.length > 0) {
                resolve(voices);
                return;
            }
            
            // If not, wait for the voiceschanged event
            this.synthesis.onvoiceschanged = () => {
                voices = this.synthesis.getVoices();
                if (voices.length > 0) {
                    resolve(voices);
                } else {
                    reject(new Error('No voices available'));
                }
            };
            
            // Set a timeout in case voices never load
            setTimeout(() => {
                voices = this.synthesis.getVoices();
                if (voices.length > 0) {
                    resolve(voices);
                } else {
                    reject(new Error('Timeout loading voices'));
                }
            }, 1000);
        });
    }

    /**
     * Helper function to set voice and speak
     * @param {SpeechSynthesisUtterance} utterance - The utterance object
     * @param {SpeechSynthesisVoice[]} voices - Available voices
     * @param {string} langCode - Language code to match (e.g. 'ar')
     * @param {string} text - Text to speak
     */
    setVoiceAndSpeak(utterance, voices, langCode, text) {
        // Try to find a matching voice
        const matchingVoices = voices.filter(voice => voice.lang.startsWith(langCode));
        
        if (matchingVoices.length > 0) {
            // Use the first matching voice
            utterance.voice = matchingVoices[0];
        } else {
            // If no matching voice, just set the language code
            utterance.lang = langCode;
        }
        
        // Adjust rate slightly for better clarity
        utterance.rate = 0.9;
        
        // Speak the text
        this.synthesis.speak(utterance);
        
        console.log(`Speaking in ${langCode} with voice ${utterance.voice ? utterance.voice.name : 'default'}`);
    }

    /**
     * Checks if speech recognition is supported
     * @returns {boolean} - True if supported
     */
    isSpeechRecognitionSupported() {
        return this.recognition !== null;
    }

    /**
     * Checks if speech synthesis is supported
     * @returns {boolean} - True if supported
     */
    isSpeechSynthesisSupported() {
        return this.synthesis !== null;
    }
}

/**
 * Storage Service
 * Handles local storage for persistent data
 */
class StorageService {
    constructor(prefix = 'translator_') {
        this.prefix = prefix;
    }

    /**
     * Sets an item in local storage
     * @param {string} key - The key to store under
     * @param {any} value - The value to store
     */
    setItem(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(this.prefix + key, serializedValue);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    /**
     * Gets an item from local storage
     * @param {string} key - The key to retrieve
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {any} - The retrieved value or default
     */
    getItem(key, defaultValue = null) {
        try {
            const serializedValue = localStorage.getItem(this.prefix + key);
            if (serializedValue === null) {
                return defaultValue;
            }
            return JSON.parse(serializedValue);
        } catch (error) {
            console.error('Error retrieving from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Removes an item from local storage
     * @param {string} key - The key to remove
     */
    removeItem(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    /**
     * Checks if user has dismissed the subscription dialog
     * @returns {boolean} - True if dismissed
     */
    hasSeenSubscriptionDialog() {
        return this.getItem('subscription_seen', false);
    }

    /**
     * Marks the subscription dialog as seen
     */
    markSubscriptionDialogSeen() {
        this.setItem('subscription_seen', true);
    }
}