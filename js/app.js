/**
 * Translation App
 * Main application logic for the translator app
 */

// Initialize services when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize services
    const translationService = new TranslationService();
    const speechService = new SpeechService();
    const storageService = new StorageService();
    
    // DOM Elements
    const recordButton = document.getElementById('recordButton');
    const stopButton = document.getElementById('stopButton');
    const translatedText = document.getElementById('translatedText');
    const translationOutput = document.getElementById('translationOutput');
    const translateBtn = document.getElementById('translateBtn');
    const saveTranslationBtn = document.getElementById('saveTranslationBtn');
    const speakOriginalBtn = document.getElementById('speakOriginalBtn');
    const speakTranslatedBtn = document.getElementById('speakTranslatedBtn');
    const copyOriginalBtn = document.getElementById('copyOriginalBtn');
    const copyTranslatedBtn = document.getElementById('copyTranslatedBtn');
    const clearOriginalBtn = document.getElementById('clearOriginalBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingDialog = document.getElementById('recordingDialog');
    const continueRecording = document.getElementById('continueRecording');
    const clearAndRecord = document.getElementById('clearAndRecord');
    const copyDialog = document.getElementById('copyDialog');
    const errorDialog = document.getElementById('errorDialog');
    const closeErrorDialog = document.getElementById('closeErrorDialog');
    const speechLanguageSelect = document.getElementById('speechLanguageSelect');
    const translationLanguageSelect = document.getElementById('translationLanguageSelect');
    const historyToggleButton = document.getElementById('historyToggleButton');
    const historyToggle = document.getElementById('historyToggle');
    const historyPanel = document.getElementById('historyPanel');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyList = document.getElementById('historyList');
    const historySearchInput = document.getElementById('historySearchInput');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const subscriptionDialog = document.getElementById('subscriptionDialog');
    const closeSubscriptionDialog = document.getElementById('closeSubscriptionDialog');
    const skipSubscription = document.getElementById('skipSubscription');
    const currentTime = document.getElementById('currentTime');
    // Save translation name dialog elements
    const saveNameDialog = document.getElementById('saveNameDialog');
    const translationNameInput = document.getElementById('translationNameInput');
    const confirmSaveNameBtn = document.getElementById('confirmSaveNameBtn');
    const cancelSaveNameBtn = document.getElementById('cancelSaveNameBtn');
    
    /**
     * Set up speech recognition with handlers
     */
    function setupSpeechRecognition() {
        const handlers = {
            onResult: function(event) {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        // استخدام نص التعرف مباشرة بدون إضافة مسافات
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript) {
                    // نضيف النص مباشرة بدون إضافة أي مسافات أو سطور جديدة
                    const currentText = translatedText.value;
                    
                    // إضافة النص المتعرف عليه مباشرة دون إضافة أي مسافة أو سطر جديد
                    translatedText.value = currentText + finalTranscript;
                    
                    // Trigger translation
                    handleTextInput();
                }
            },
            onStart: function() {
                recordingIndicator.classList.remove('hidden');
                recordingStatus.textContent = 'جاري التسجيل...';
            },
            onEnd: function() {
                recordingIndicator.classList.add('hidden');
                stopButton.classList.add('hidden');
                recordButton.classList.remove('hidden');
            },
            onError: function(event) {
                console.error('Speech recognition error', event.error);
                recordingIndicator.classList.add('hidden');
                stopButton.classList.add('hidden');
                recordButton.classList.remove('hidden');
                
                // Show error message depending on the error
                if (event.error === 'no-speech') {
                    showErrorMessage('لم يتم اكتشاف أي صوت. الرجاء المحاولة مرة أخرى.');
                } else if (event.error === 'not-allowed') {
                    showErrorMessage('تم منع الوصول إلى الميكروفون. الرجاء السماح بالوصول من إعدادات المتصفح.');
                } else {
                    showErrorMessage('حدث خطأ في التعرف على الصوت. الرجاء المحاولة مرة أخرى.');
                }
            }
        };
        
        return speechService.setupRecognition(handlers);
    }
    
    /**
     * Handle record button click
     */
    function handleRecordButtonClick() {
        if (!speechService.isSpeechRecognitionSupported()) {
            showErrorMessage('متصفحك لا يدعم التعرف على الصوت.');
            return;
        }
        
        if (translatedText.value.trim() !== '') {
            recordingDialog.classList.remove('hidden');
        } else {
            startRecording();
        }
    }
    
    /**
     * Start speech recognition
     */
    function startRecording() {
        speechService.startRecognition(speechLanguageSelect.value);
        recordButton.classList.add('hidden');
        stopButton.classList.remove('hidden');
    }
    
    /**
     * Stop speech recognition
     */
    function stopRecording() {
        speechService.stopRecognition();
    }
    
    /**
     * Handle text input changes
     */
    function handleTextInput() {
        const text = translatedText.value;
        if (text.trim() === '') {
            translationOutput.value = '';
            return;
        }
        
        translateCurrentText();
    }
    
    /**
     * Translate the current text in the input field
     */
    function translateCurrentText() {
        const text = translatedText.value;
        const fromLang = speechLanguageSelect.value.split('-')[0];
        const toLang = translationLanguageSelect.value;
        
        loadingIndicator.classList.remove('hidden');
        
        translateText(text, fromLang, toLang)
            .then(() => {
                loadingIndicator.classList.add('hidden');
            })
            .catch(error => {
                loadingIndicator.classList.add('hidden');
                if (error.message === 'API quota exceeded') {
                    showErrorDialog();
                } else {
                    showErrorMessage('حدث خطأ أثناء الترجمة. الرجاء المحاولة مرة أخرى لاحقًا.');
                }
            });
    }
    
    /**
     * Translate text from one language to another
     * @param {string} text - Text to translate
     * @param {string} fromLang - Source language code
     * @param {string} toLang - Target language code
     */
    async function translateText(text, fromLang, toLang) {
        try {
            const translatedText = await translationService.translate(text, fromLang, toLang);
            // Preserve the original formatting for the translated text
            translationOutput.value = translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            throw error;
        }
    }
    
    /**
     * Save the current translation to history
     */
    function saveCurrentTranslation() {
        const original = translatedText.value.trim();
        const translated = translationOutput.value.trim();
        
        if (!original || !translated) {
            showErrorMessage('لا يمكن حفظ ترجمة فارغة.');
            return;
        }
        
        // Show the name dialog to let user name the translation
        translationNameInput.value = '';
        saveNameDialog.classList.remove('hidden');
    }
    
    /**
     * Complete saving translation with the provided name
     * @param {string} customName - Optional custom name for the translation
     */
    function completeSaveTranslation(customName = '') {
        const original = translatedText.value.trim();
        const translated = translationOutput.value.trim();
        const fromLang = speechLanguageSelect.value.split('-')[0];
        const toLang = translationLanguageSelect.value;
        
        const historyItem = translationService.saveTranslation(
            original, 
            translated, 
            fromLang, 
            toLang,
            customName
        );
        
        if (historyItem) {
            showErrorMessage('تم حفظ الترجمة بنجاح!', 'success');
            // Refresh history list if it's currently visible
            if (!historyPanel.classList.contains('hidden')) {
                loadTranslationHistory();
            }
        }
    }
    
    /**
     * Copy text to clipboard
     * @param {HTMLElement} element - Element containing text to copy
     */
    function copyToClipboard(element) {
        element.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        
        // Show copy confirmation
        copyDialog.classList.remove('hidden');
        setTimeout(() => {
            copyDialog.classList.add('hidden');
        }, 1500);
    }
    
    /**
     * Show error dialog
     */
    function showErrorDialog() {
        errorDialog.classList.remove('hidden');
    }
    
    /**
     * Show error message
     * @param {string} message - Error message to show
     */
    function showErrorMessage(message, type = 'error') {
        // This could be enhanced to show a toast notification
        console.log(`${type === 'error' ? 'Error' : 'Success'}: ${message}`);
        alert(message);
    }
    
    /**
     * Load and render translation history
     */
    function loadTranslationHistory() {
        const historyItems = translationService.getHistory();
        renderHistoryItems(historyItems);
    }
    
    /**
     * Handle history search
     * @param {Event} e - Input event
     */
    function handleHistorySearch(e) {
        const searchQuery = e.target.value.trim();
        const filteredItems = translationService.getHistory(searchQuery);
        renderHistoryItems(filteredItems, searchQuery);
    }
    
    /**
     * Render history items in the history panel
     * @param {Array} historyItems - Array of history items
     * @param {string} searchQuery - Optional search query for highlighting
     */
    function renderHistoryItems(historyItems = [], searchQuery = '') {
        if (!historyList) return;
        
        if (historyItems.length === 0) {
            historyList.innerHTML = '<div class="p-4 text-gray-500 text-center">لا توجد ترجمات سابقة</div>';
            return;
        }
        
        historyList.innerHTML = '';
        
        historyItems.forEach(item => {
            // Create the history item container
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item bg-white p-3 mb-2 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer';
            
            // Create favorite button
            const favoriteBtn = document.createElement('button');
            favoriteBtn.className = `favorite-btn text-lg mb-1 ${item.isFavorite ? 'active' : ''}`;
            favoriteBtn.innerHTML = `<i class="fas fa-star ${item.isFavorite ? 'text-yellow-400' : 'text-gray-300'}"></i>`;
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newStatus = translationService.toggleFavorite(item.id);
                favoriteBtn.className = `favorite-btn text-lg mb-1 ${newStatus ? 'active' : ''}`;
                favoriteBtn.innerHTML = `<i class="fas fa-star ${newStatus ? 'text-yellow-400' : 'text-gray-300'}"></i>`;
            });
            
            // Create custom name element if available
            let customNameElement;
            if (item.customName) {
                customNameElement = document.createElement('div');
                customNameElement.className = 'text-sm font-bold mb-1 text-indigo-600';
                customNameElement.textContent = item.customName;
            }
            
            // Format and display languages
            const langDisplay = document.createElement('div');
            langDisplay.className = 'text-xs text-gray-500 mb-1';
            langDisplay.textContent = `${getLangName(item.fromLang)} → ${getLangName(item.toLang)}`;
            
            // Format timestamp
            const timestamp = document.createElement('div');
            timestamp.className = 'text-xs text-gray-400 mb-2';
            timestamp.textContent = formatTimestamp(item.timestamp);
            
            // Original text
            const originalText = document.createElement('div');
            originalText.className = 'text-sm font-bold mb-1';
            originalText.innerHTML = highlightText(item.original, searchQuery);
            
            // Translated text
            const translatedText = document.createElement('div');
            translatedText.className = 'text-sm text-gray-700';
            translatedText.innerHTML = highlightText(item.translated, searchQuery);
            
            // Action buttons container
            const actionButtons = document.createElement('div');
            actionButtons.className = 'flex justify-end mt-2 space-x-2 rtl:space-x-reverse';
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-500 hover:text-red-700';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                translationService.removeHistoryItem(item.id);
                historyItem.remove();
                
                // Check if we need to show the empty message
                if (translationService.getHistory().length === 0) {
                    historyList.innerHTML = '<div class="p-4 text-gray-500 text-center">لا توجد ترجمات سابقة</div>';
                }
            });
            
            // Add all elements to the history item
            historyItem.appendChild(favoriteBtn);
            // Add custom name if available
            if (customNameElement) {
                historyItem.appendChild(customNameElement);
            }
            historyItem.appendChild(langDisplay);
            historyItem.appendChild(timestamp);
            historyItem.appendChild(originalText);
            historyItem.appendChild(translatedText);
            
            actionButtons.appendChild(deleteBtn);
            historyItem.appendChild(actionButtons);
            
            // Add click handler to load this translation into the main form
            historyItem.addEventListener('click', () => {
                translatedText.value = item.original;
                translationOutput.value = item.translated;
                
                // Set the language selectors to match this translation
                const fromLangFull = getLangCodeFull(item.fromLang);
                const toLang = item.toLang;
                
                if (fromLangFull) {
                    for (let i = 0; i < speechLanguageSelect.options.length; i++) {
                        if (speechLanguageSelect.options[i].value.startsWith(item.fromLang)) {
                            speechLanguageSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                
                for (let i = 0; i < translationLanguageSelect.options.length; i++) {
                    if (translationLanguageSelect.options[i].value === toLang) {
                        translationLanguageSelect.selectedIndex = i;
                        break;
                    }
                }
                
                // Close the history panel
                closeHistoryPanel();
            });
            
            historyList.appendChild(historyItem);
        });
    }
    
    /**
     * Toggle history panel visibility
     */
    function toggleHistoryPanel() {
        const isVisible = !historyPanel.classList.contains('hidden');
        
        if (isVisible) {
            closeHistoryPanel();
        } else {
            historyPanel.classList.remove('hidden');
            loadTranslationHistory();
            
            // For mobile: add active class for animation
            document.querySelector('.history-panel-container').classList.add('active');
        }
    }
    
    /**
     * Close history panel
     */
    function closeHistoryPanel() {
        // For mobile: remove active class for animation
        const panel = document.querySelector('.history-panel-container');
        panel.classList.remove('active');
        
        // Add slight delay before hiding to allow animation to complete
        setTimeout(() => {
            historyPanel.classList.add('hidden');
        }, 300);
    }
    
    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} - Formatted date
     */
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            // Today, show time only
            return `اليوم ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            // Yesterday
            return `الأمس ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            // Within the last week
            const daysAgo = `منذ ${diffDays} أيام`;
            return `${daysAgo} ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            // Older than a week, show full date
            return date.toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
    
    /**
     * Update current time display
     */
    function updateCurrentTime() {
        if (currentTime) {
            const now = new Date();
            currentTime.textContent = now.toLocaleTimeString('ar-EG', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
        }
    }
    
    /**
     * Check if subscription dialog should be shown
     */
    function checkSubscriptionDialog() {
        // Only show if not seen before
        if (!storageService.hasSeenSubscriptionDialog()) {
            setTimeout(() => {
                subscriptionDialog.classList.remove('hidden');
                updateCurrentTime();
                // Update time every second
                const timerInterval = setInterval(updateCurrentTime, 1000);
                
                // Clear interval when dialog is closed
                closeSubscriptionDialog.addEventListener('click', () => {
                    clearInterval(timerInterval);
                });
                
                skipSubscription.addEventListener('click', () => {
                    clearInterval(timerInterval);
                });
            }, 3000); // Show after 3 seconds
        }
    }
    
    /**
     * Dismiss subscription dialog and mark as seen
     */
    function dismissSubscriptionDialog() {
        subscriptionDialog.classList.add('hidden');
        storageService.markSubscriptionDialogSeen();
    }
    
    /**
     * Helper function to get language name from code
     * @param {string} code - Language code
     * @returns {string} - Language name
     */
    function getLangName(code) {
        const langMap = {
            'ar': 'العربية',
            'en': 'الإنجليزية',
            'fr': 'الفرنسية',
            'es': 'الإسبانية',
            'de': 'الألمانية'
        };
        
        return langMap[code] || code;
    }
    
    /**
     * Helper function to get full language code
     * @param {string} shortCode - Short language code (e.g., 'en')
     * @returns {string} - Full language code (e.g., 'en-US')
     */
    function getLangCodeFull(shortCode) {
        const langMap = {
            'ar': 'ar-SA',
            'en': 'en-US',
            'fr': 'fr-FR',
            'es': 'es-ES',
            'de': 'de-DE'
        };
        
        return langMap[shortCode] || null;
    }
    
    /**
     * Helper function to highlight search terms in text
     * @param {string} text - Text to highlight
     * @param {string} query - Search query
     * @returns {string} - Text with highlighted query
     */
    function highlightText(text, query) {
        if (!query) return text;
        
        const escapedQuery = escapeRegExp(query);
        const regex = new RegExp(escapedQuery, 'gi');
        
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Speech recognition
        if (setupSpeechRecognition()) {
            recordButton.addEventListener('click', handleRecordButtonClick);
            stopButton.addEventListener('click', stopRecording);
            
            continueRecording.addEventListener('click', () => {
                recordingDialog.classList.add('hidden');
                startRecording();
            });
            
            clearAndRecord.addEventListener('click', () => {
                translatedText.value = '';
                translationOutput.value = '';
                recordingDialog.classList.add('hidden');
                startRecording();
            });
        } else {
            recordButton.disabled = true;
            recordButton.title = 'التعرف على الصوت غير مدعوم';
            recordButton.classList.add('opacity-50');
        }
        
        // Translation
        translatedText.addEventListener('input', handleTextInput);
        translateBtn.addEventListener('click', translateCurrentText);
        
        // Save translation
        saveTranslationBtn.addEventListener('click', saveCurrentTranslation);
        
        // Text-to-speech
        speakOriginalBtn.addEventListener('click', () => {
            const text = translatedText.value;
            if (text.trim() !== '') {
                speechService.speak(text, speechLanguageSelect.value);
            }
        });
        
        speakTranslatedBtn.addEventListener('click', () => {
            const text = translationOutput.value;
            if (text.trim() !== '') {
                const langCode = translationLanguageSelect.value;
                const fullLangCode = getLangCodeFull(langCode);
                speechService.speak(text, fullLangCode || langCode);
            }
        });
        
        // Copy functionality
        copyOriginalBtn.addEventListener('click', () => copyToClipboard(translatedText));
        copyTranslatedBtn.addEventListener('click', () => copyToClipboard(translationOutput));
        
        // Clear functionality
        clearOriginalBtn.addEventListener('click', () => {
            translatedText.value = '';
            translationOutput.value = '';
        });
        
        // Error dialog
        closeErrorDialog.addEventListener('click', () => {
            errorDialog.classList.add('hidden');
        });
        
        // Language change handlers
        speechLanguageSelect.addEventListener('change', () => {
            if (translatedText.value.trim() !== '') {
                translateCurrentText();
            }
        });
        
        translationLanguageSelect.addEventListener('change', () => {
            if (translatedText.value.trim() !== '') {
                translateCurrentText();
            }
        });
        
        // History panel
        historyToggleButton.addEventListener('click', toggleHistoryPanel);
        historyToggle.addEventListener('click', toggleHistoryPanel);
        closeHistoryBtn.addEventListener('click', closeHistoryPanel);
        historySearchInput.addEventListener('input', handleHistorySearch);
        
        clearHistoryBtn.addEventListener('click', () => {
            // Show confirmation dialog before clearing
            if (confirm('هل أنت متأكد من أنك تريد مسح جميع سجل الترجمة؟ الملاحظة: لن يتم حذف العناصر المفضلة.')) {
                translationService.clearHistory();
                loadTranslationHistory();
            }
        });
        
        // Subscription dialog
        closeSubscriptionDialog.addEventListener('click', dismissSubscriptionDialog);
        skipSubscription.addEventListener('click', dismissSubscriptionDialog);
        
        // Save name dialog
        confirmSaveNameBtn.addEventListener('click', () => {
            const customName = translationNameInput.value.trim();
            saveNameDialog.classList.add('hidden');
            completeSaveTranslation(customName);
        });
        
        cancelSaveNameBtn.addEventListener('click', () => {
            saveNameDialog.classList.add('hidden');
        });
        
        // Handle Enter key in the name input
        translationNameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const customName = translationNameInput.value.trim();
                saveNameDialog.classList.add('hidden');
                completeSaveTranslation(customName);
            } else if (e.key === 'Escape') {
                saveNameDialog.classList.add('hidden');
            }
        });
        
        // Close dialogs when clicking outside
        document.addEventListener('click', (e) => {
            // For recording dialog
            if (!recordingDialog.classList.contains('hidden') && 
                !recordingDialog.contains(e.target) &&
                e.target !== recordButton) {
                recordingDialog.classList.add('hidden');
            }
            
            // For save name dialog - don't close on outside click to prevent accidental loss
        });
    }
    
    /**
     * Escape special characters in a string for use in a regular expression
     * @param {string} string - String to escape
     * @returns {string} - Escaped string
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Initialize the app
    setupEventListeners();
    checkSubscriptionDialog();
});