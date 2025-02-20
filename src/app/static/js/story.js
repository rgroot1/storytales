console.log('Script starting...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking elements:');
    console.log('analyze-btn:', document.getElementById('analyze-btn'));
    console.log('artwork-form:', document.getElementById('artwork-form'));
    console.log('artwork input:', document.getElementById('artwork'));
    
    // More Options button
    const moreOptionsBtn = document.getElementById('tell-more-btn');
    if (moreOptionsBtn) {
        console.log('More Options clicked');
        moreOptionsBtn.addEventListener('click', function() {
            const additionalFields = document.getElementById('additional-fields');
            const button = document.getElementById('tell-more-btn');
            const icon = button.querySelector('i');
            
            if (additionalFields.style.display === 'none') {
                additionalFields.style.display = 'block';
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                additionalFields.style.display = 'none';
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        });
    }

    // Generate Story button
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        console.log('Generate clicked');
        generateBtn.addEventListener('click', async function() {
            console.log('Generate clicked');
            const mainPrompt = document.getElementById('mainPrompt').value.trim();
            const ageGroup = document.getElementById('ageGroup').value;
            
            if (!mainPrompt) {
                alert('Please tell us about your hero\'s adventure!');
                return;
            }
            
            generateBtn.disabled = true;
            let loadingDots = 0;
            const loadingInterval = setInterval(() => {
                loadingDots = (loadingDots + 1) % 4;
                generateBtn.textContent = 'Creating your story' + '.'.repeat(loadingDots);
            }, 500);
            
            try {
                const response = await fetch('/story/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        mainPrompt,
                        ageGroup,
                        moral: document.getElementById('moral')?.value.trim() || '',
                        creature: document.getElementById('creature')?.value.trim() || '',
                        magic: document.getElementById('magic')?.value.trim() || '',
                        vibe: document.getElementById('vibe')?.value.trim() || '',
                        isArtworkFlow: true
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Story generation service not found. Please try again later.');
                    }
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('text/html')) {
                        throw new Error('Received unexpected response. Please try again.');
                    }
                }
                
                // Log if story was from cache
                if (data.cached) {
                    console.log('Retrieved story from cache');
                }
                
                // Hide additional fields if they're open
                const additionalFields = document.getElementById('additional-fields');
                if (additionalFields.style.display === 'block') {
                    const moreOptionsBtn = document.getElementById('tell-more-btn');
                    const icon = moreOptionsBtn.querySelector('i');
                    additionalFields.style.display = 'none';
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
                
                // Show the story
                const storyOutput = document.getElementById('story-output');
                const storyContent = document.getElementById('story-content');
                storyContent.textContent = data.story;
                storyOutput.style.display = 'block';
                
                // Scroll to the story
                storyOutput.scrollIntoView({ behavior: 'smooth' });
                
            } catch (error) {
                alert(error.message);
            } finally {
                clearInterval(loadingInterval);
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Story';
            }
        });
    }

    // Global event delegation for all dynamic buttons
    document.addEventListener('click', function(e) {
        console.log('Click detected on:', e.target);
        
        // Back button handler
        if (e.target.matches('#story-back-btn, #story-back-btn *')) {
            console.log('Back button or its child clicked');
            console.log('Navigating back to homepage');
            window.location.href = '/';
        }
        
        // Create new story button handler
        if (e.target.matches('#create-new-story-btn, #create-new-story-btn *')) {
            console.log('Create new story clicked');
            window.location.href = '/';
        }
    });

    // Feature flags check
    const FEATURES = {
        ARTWORK_UPLOAD: true,
        ARTWORK_ANALYSIS: true
    };

    // Artwork upload handling
    if (FEATURES.ARTWORK_UPLOAD) {
        const uploadBox = document.getElementById('upload-box');
        const artworkInput = document.getElementById('artwork');
        const artworkForm = document.getElementById('artwork-form');
        let uploadedFile = null;

        // Function to ensure analyze button visibility on homepage
        function showAnalyzeButton() {
            const analyzeBtn = document.getElementById('analyze-btn');
            const modal = document.getElementById('storyModal');
            if (analyzeBtn) {
                // Only show if modal is not visible
                if (!modal || modal.style.display !== 'block') {
                    analyzeBtn.hidden = false;
                    analyzeBtn.style.display = 'block';
                    analyzeBtn.textContent = 'Start the Magic! ✨';
                }
            }
        }

        // Handle delete image click
        document.addEventListener('click', function(e) {
            const deleteBtn = e.target.closest('.delete-image');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                // Reset upload box
                uploadBox.innerHTML = `
                    <div class="upload-content">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drop your artwork here or click to upload</p>
                        <small>Supports: JPG, PNG, GIF (max 5MB)</small>
                    </div>
                `;
                
                // Reset file input and related elements
                artworkInput.value = '';
                uploadedFile = null;
                
                // Only hide keywords input
                const keywordsInput = document.querySelector('.keywords-input');
                if (keywordsInput) {
                    keywordsInput.value = '';
                    keywordsInput.hidden = true;
                }
                
                // Ensure analyze button is visible on homepage
                showAnalyzeButton();
            }
        });
        
        // Setup file input click handler
        uploadBox.addEventListener('click', function(e) {
            // Don't trigger file input if clicking delete button
            if (e.target.closest('.delete-image')) return;
            artworkInput.click();
        });
        
        // Setup file input change handler
        artworkInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });
        
        // Handle drag and drop
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('dragover');
        });
        
        uploadBox.addEventListener('dragleave', () => {
            uploadBox.classList.remove('dragover');
        });
        
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('dragover');
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        
        function handleFile(file) {
            console.log('Handling file:', file);
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            
            if (!allowedTypes.includes(file.type)) {
                alert('Please upload a JPG, PNG, or GIF file');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                alert('File too large. Maximum size is 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('File loaded successfully');
                uploadedFile = file;
                
                uploadBox.innerHTML = `
                    <div class="preview-container">
                        <img src="${e.target.result}" class="artwork-preview" alt="Uploaded artwork" />
                        <button type="button" class="delete-image">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                document.querySelector('.keywords-input').hidden = false;
                // Ensure analyze button is visible on homepage
                showAnalyzeButton();
            };
            
            reader.onerror = (error) => {
                console.error('File read error:', error);
                alert('Error reading file. Please try again.');
                showAnalyzeButton();
            };
            
            reader.readAsDataURL(file);
        }
        
        // Handle form submission
        artworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!uploadedFile) {
                alert('Please upload an image first to create a story from your artwork');
                return;
            }
            
            const analyzeBtn = document.getElementById('analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.disabled = true;
                analyzeBtn.textContent = 'Analyzing...';
            }
            
            const formData = new FormData();
            formData.append('artwork', uploadedFile);
            formData.append('keywords', document.querySelector('.keywords-input').value || '');
            
            try {
                const response = await fetch('/story/artwork/analyze', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (!response.ok) {
                    // Handle rate limit error with a more user-friendly message
                    if (data.error && data.error.includes('rate limit')) {
                        throw new Error(
                            'We\'re experiencing high traffic right now. ' +
                            'Please wait a minute before trying again.'
                        );
                    }
                    throw new Error(data.error || 'Failed to analyze artwork');
                }
                
                showAnalysisResults(data);
            } catch (error) {
                console.error('Error:', error);
                // Show error in a more user-friendly way
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = error.message;
                
                // Make sure we're adding to the right place
                const uploadBox = document.getElementById('upload-box');
                const existingError = uploadBox.querySelector('.error-message');
                if (existingError) {
                    existingError.remove();
                }
                
                // Position the error message after the preview if it exists
                const previewContainer = uploadBox.querySelector('.preview-container');
                if (previewContainer) {
                    previewContainer.insertAdjacentElement('afterend', errorMessage);
                } else {
                    uploadBox.appendChild(errorMessage);
                }
                
                // Remove error message after 5 seconds
                setTimeout(() => {
                    errorMessage.remove();
                }, 5000);
            } finally {
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                    analyzeBtn.textContent = 'Start the Magic! ✨';
                }
            }
        });

        // Initial button setup
        showAnalyzeButton();

        // Handle window resize
        window.addEventListener('resize', () => {
            const modal = document.getElementById('storyModal');
            if (!modal || modal.style.display !== 'block') {
                showAnalyzeButton();
            }
        });
    }

    // Initialize analysis trigger flag at page load
    window.analysisTriggered = false;

    // Add this at the end of the file to ensure modal starts closed
    const storyModal = document.getElementById('story-modal');
    if (storyModal) {
        storyModal.style.display = 'none';
    }

    storyModal = document.getElementById('story-modal'); // Initialize here
    closeModal();
});

// Global functions for story modal
function showAnalysisResults(analysisData) {
    console.log('Received analysis data:', analysisData);
    
    // Verify story elements structure
    if (analysisData.analysis && analysisData.analysis.story_elements) {
        console.log('Story elements received:', analysisData.analysis.story_elements);
    } else {
        console.error('Missing story elements in analysis data');
    }
    
    // Store analysis data globally for reuse
    window.currentAnalysisData = analysisData;
    
    // Reset modal state before showing new content
    resetModalState();

    // Hide homepage elements when modal is open
    const keywordsInput = document.querySelector('.keywords-input:not(.modal-content .keywords-input)');
    const analyzeBtn = document.getElementById('analyze-btn');
    if (keywordsInput) keywordsInput.style.display = 'none';
    if (analyzeBtn) analyzeBtn.style.display = 'none';

    // Show modal
    const modal = document.getElementById('storyModal');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    // Setup all interactions after showing modal
    setupModalInteractions();
    setupNavigationHandlers();
    setupSuggestionHandlers();
    setupCreateButton();

    // Update progress bar
    updateStoryProgress('screen-character');

    // Ensure first screen is visible
    const firstScreen = document.getElementById('screen-character');
    if (firstScreen) {
        firstScreen.style.display = 'block';
        firstScreen.classList.remove('hidden');
    }
}

function setupModalInteractions() {
    // Remove any existing event listeners
    const inspireButtons = document.querySelectorAll('.inspire-btn');
    inspireButtons.forEach(btn => {
        btn.removeEventListener('click', handleInspireClick);
    });

    // Add fresh event listeners
    inspireButtons.forEach(btn => {
        btn.addEventListener('click', handleInspireClick);
    });
}

// Separate the click handler function
function handleInspireClick(event) {
    const screen = event.target.closest('.screen');
    const suggestions = screen.querySelector('.suggestions');
    
    if (!suggestions) {
        console.error('No suggestions container found');
        return;
    }

    console.log('Inspire button clicked, screen:', screen.id);
    
    // Toggle suggestion visibility
    if (suggestions.classList.contains('show')) {
        suggestions.classList.remove('show');
        suggestions.style.display = 'none';
    } else {
        suggestions.classList.add('show');
        suggestions.style.display = 'block';
        console.log('Populating suggestions with data:', window.currentAnalysisData);
        populateSuggestions(screen.id, window.currentAnalysisData);
    }
}

function populateSuggestions(screenId, analysisData) {
    console.log('Populating suggestions for screen:', screenId);
    console.log('Analysis data:', analysisData);
    
    const screen = document.getElementById(screenId);
    const suggestionsBox = screen.querySelector('.suggestions');
    const suggestionsContent = screen.querySelector('.suggestions-content');
    
    if (!suggestionsContent) {
        console.error('No suggestions-content container found');
        return;
    }
    
    // Clear existing suggestions
    suggestionsContent.innerHTML = '';
    
    // Get the appropriate suggestions based on screen
    const elements = analysisData.analysis.story_elements;
    let items = [];
    
    switch(screenId) {
        case 'screen-character':
            items = elements.characters || [];
            break;
        case 'screen-setting':
            items = elements.setting || [];
            break;
        case 'screen-theme':
            items = Array.isArray(elements.moral) ? elements.moral : [elements.moral];
            break;
    }
    
    console.log('Items to display:', items);
    
    // Add new suggestions
    if (items && items.length > 0) {
        items.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = item.trim();
                
                // Add click handler to populate input
                div.addEventListener('click', function() {
                    const input = screen.querySelector('.story-input');
                    if (input) {
                        input.value = this.textContent;
                        suggestionsBox.classList.remove('show');
                    }
                });
                
                suggestionsContent.appendChild(div);
            }
        });
        
        // Show suggestions
        suggestionsBox.classList.add('show');
    } else {
        console.log('No items to display');
        suggestionsBox.classList.remove('show');
    }
}

function setupNavigationHandlers() {
    // Track current screen index
    let currentScreenIndex = 0;
    const screens = ['screen-character', 'screen-setting', 'screen-theme', 'screen-review'];

    // Handle next button clicks
    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const currentScreen = this.closest('.screen');
            const nextScreen = currentScreen.nextElementSibling;
            if (nextScreen && nextScreen.classList.contains('screen')) {
                currentScreen.style.display = 'none';
                currentScreen.classList.add('hidden');
                nextScreen.style.display = 'block';
                nextScreen.classList.remove('hidden');
                currentScreenIndex = Math.min(currentScreenIndex + 1, screens.length - 1);
                updateStoryProgress(screens[currentScreenIndex]);

                // Ensure suggestions are hidden when changing screens
                const suggestions = currentScreen.querySelector('.suggestions');
                if (suggestions) {
                    suggestions.classList.remove('show');
                    suggestions.classList.add('hidden');
                    suggestions.style.display = 'none';
                }
            }
        });
    });
    
    // Handle back button clicks
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const currentScreen = this.closest('.screen');
            const previousScreen = currentScreen.previousElementSibling;
            if (previousScreen && previousScreen.classList.contains('screen')) {
                currentScreen.style.display = 'none';
                currentScreen.classList.add('hidden');
                previousScreen.style.display = 'block';
                previousScreen.classList.remove('hidden');
                currentScreenIndex = Math.max(currentScreenIndex - 1, 0);
                updateStoryProgress(screens[currentScreenIndex]);

                // Ensure suggestions are hidden when changing screens
                const suggestions = currentScreen.querySelector('.suggestions');
                if (suggestions) {
                    suggestions.classList.remove('show');
                    suggestions.classList.add('hidden');
                    suggestions.style.display = 'none';
                }
            }
        });
    });

    // Initialize first screen
    document.querySelectorAll('.screen').forEach((screen, index) => {
        if (index === 0) {
            screen.style.display = 'block';
            screen.classList.remove('hidden');
        } else {
            screen.style.display = 'none';
            screen.classList.add('hidden');
        }
    });
}

function setupSuggestionHandlers() {
    // Handle inspire button clicks
    document.querySelectorAll('.inspire-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const screen = this.closest('.screen');
            const suggestions = screen.querySelector('.suggestions');
            
            if (suggestions) {
                suggestions.classList.toggle('hidden');
                
                // Get suggestions based on screen type
                if (window.storyData?.analysis?.story_elements) {
                    const elements = window.storyData.analysis.story_elements;
                    let items = [];
                    
                    if (screen.id === 'screen-character') {
                        items = elements.characters || [];
                    } else if (screen.id === 'screen-setting') {
                        items = [elements['setting/vibe']].filter(Boolean);
                    } else if (screen.id === 'screen-theme') {
                        items = [elements.moral].filter(Boolean);
                    }
                    
                    suggestions.innerHTML = items
                        .map(item => `<div class="suggestion-item">${item.trim()}</div>`)
                        .join('');
                }
            }
        });
    });
    
    // Add event listeners for suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const screen = this.closest('.screen');
            const input = screen.querySelector('.story-input');
            const suggestions = screen.querySelector('.suggestions');
            
            console.log('Suggestion clicked:', this.textContent.trim());
            input.value = this.textContent.trim();
            
            // Show copy feedback in suggestion item only
            const feedback = document.createElement('span');
            feedback.className = 'copy-feedback';
            feedback.textContent = '✓';
            // Remove any existing feedback first
            this.querySelectorAll('.copy-feedback').forEach(el => el.remove());
            this.appendChild(feedback);
            
            // Remove feedback and close suggestions after delay
            setTimeout(() => {
                feedback.remove();
                suggestions.classList.add('hidden');
            }, 500);
        });
    });
}

function setupCloseHandler() {
    // Handle close button click
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        // Remove existing listeners
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const modal = document.getElementById('storyModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                resetStoryForm();
            }
        });
    }
}

function initializeModal() {
    console.log('Initializing modal controls');
    
    // Setup close button
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked');
            const modal = document.getElementById('storyModal');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
    }
    
    // Setup outside click close
    const modal = document.getElementById('storyModal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    });
}

function setupInspireButtons() {
    console.log('Setting up inspire buttons');
    
    // Remove any existing listeners first
    document.querySelectorAll('.inspire-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Setup inspire button clicks
    document.querySelectorAll('.inspire-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const screen = this.closest('.screen');
            const suggestions = screen.querySelector('.suggestions');
            
            if (suggestions) {
                suggestions.classList.toggle('show');
                
                // Get suggestions based on screen type
                if (window.storyData?.analysis?.story_elements) {
                    const elements = window.storyData.analysis.story_elements;
                    let items = [];
                    
                    if (screen.id === 'screen-character') {
                        items = elements.characters || [];
                    } else if (screen.id === 'screen-setting') {
                        items = [elements['setting/vibe']].filter(Boolean);
                    } else if (screen.id === 'screen-theme') {
                        items = [elements.moral].filter(Boolean);
                    }
                    
                    suggestions.innerHTML = items
                        .map(item => `<div class="suggestion-item">${item.trim()}</div>`)
                        .join('');
                    
                    // Add click handlers to new suggestion items
                    suggestions.querySelectorAll('.suggestion-item').forEach(item => {
                        item.addEventListener('click', function(e) {
                            e.stopPropagation();
                            const input = screen.querySelector('.story-input');
                            input.value = this.textContent.trim();
                            
                            const feedback = document.createElement('span');
                            feedback.className = 'copy-feedback';
                            feedback.textContent = '✓';
                            this.appendChild(feedback);
                            
                            setTimeout(() => {
                                feedback.remove();
                                suggestions.classList.add('hidden');
                            }, 500);
                        });
                    });
                }
            }
        });
    });
}

function setupNavigation(analysisData) {
    const nextBtn = document.querySelector('.active .next-btn');
    const skipBtn = document.querySelector('.active .skip-btn');
    const backBtn = document.querySelector('.active .back-btn');
    const currentScreen = document.querySelector('.screen.active');
    
    if (!currentScreen) {
        console.error('No active screen found');
        return;
    }
    
    const screenIndex = Array.from(document.querySelectorAll('.screen'))
                            .indexOf(currentScreen);
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            console.log('Next clicked, going to screen:', screenIndex + 1);
            goToScreen(screenIndex + 1);
        });
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => goToScreen(screenIndex - 1));
    }
    
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            let defaultValue = '';
            const storyElements = analysisData.analysis.story_elements;
            
            // Set default value based on current screen
            if (currentScreen.id === 'screen-character') {
                defaultValue = Array.isArray(storyElements.characters) ? 
                    storyElements.characters[0] : storyElements.characters;
            } else if (currentScreen.id === 'screen-setting') {
                defaultValue = storyElements['setting/vibe']?.split('|')[0] || '';
            } else if (currentScreen.id === 'screen-theme') {
                defaultValue = storyElements.moral?.split('|')[0] || '';
            }
            
            const input = currentScreen.querySelector('.story-input');
            if (input) {
                input.value = defaultValue;
            }
            
            console.log('Skip clicked, going to screen:', screenIndex + 1);
            goToScreen(screenIndex + 1);
        });
    }
}

function selectSuggestion(text, type) {
    const input = document.querySelector('.active .story-input');
    input.value = text;
    document.querySelector('.active .suggestions').classList.add('hidden');
}

function goToScreen(screenNumber) {
    // Update progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${(screenNumber + 1) * 25}%`;
    }
    
    // Get all screens and current active screen
    const screens = document.querySelectorAll('.screen');
    const currentScreen = document.querySelector('.screen.active');
    
    console.log('Moving to screen:', screenNumber, 'Current screen:', currentScreen);
    
    // Hide current screen
    if (currentScreen) {
        currentScreen.classList.remove('active');
        // Remove old event listeners
        const oldInspireBtn = currentScreen.querySelector('.inspire-btn');
        const oldNextBtn = currentScreen.querySelector('.next-btn');
        const oldSkipBtn = currentScreen.querySelector('.skip-btn');
        oldInspireBtn?.replaceWith(oldInspireBtn.cloneNode(true));
        oldNextBtn?.replaceWith(oldNextBtn.cloneNode(true));
        oldSkipBtn?.replaceWith(oldSkipBtn.cloneNode(true));
    }
    
    // Show next screen
    const nextScreen = Array.from(screens)[screenNumber];
    console.log('Next screen:', nextScreen);
    if (nextScreen) {
        nextScreen.classList.add('active');
        // Setup buttons for new screen
        setupInspireButton(window.storyData);
        setupNavigation(window.storyData);
    }
}

// Add close button to modal
function addModalControls() {
    const modal = document.getElementById('storyModal');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '×';
    modal.querySelector('.modal-content').prepend(closeBtn);

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        // Reset screens but keep the uploaded image
        resetScreens();
    });
}

function resetScreens() {
    // Hide all screens except first
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('screen-character').classList.add('active');
    
    // Reset progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = '25%';
    }
    
    // Clear inputs but keep the analysis data
    document.querySelectorAll('.story-input').forEach(input => {
        input.value = '';
    });
}

// Make progress bar clickable
function setupProgressBar() {
    const progressBar = document.querySelector('.progress-bar');
    if (!progressBar) {
        console.error('Progress bar element not found');
        return;
    }
    
    // Add progress line
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = '25%';
    progressBar.appendChild(progressFill);
}

function getCurrentScreenIndex() {
    const currentScreen = document.querySelector('.screen.active');
    return Array.from(document.querySelectorAll('.screen')).indexOf(currentScreen);
}

function updateStoryProgress(currentScreen) {
    const progressBar = document.querySelector('.progress-bar');
    if (!progressBar) return;

    // Map screens to progress states
    const progressMap = {
        'screen-character': 1,
        'screen-setting': 2,
        'screen-theme': 3,
        'screen-review': 4
    };

    const progress = progressMap[currentScreen] || 0;
    progressBar.setAttribute('data-progress', progress);
}

// Handle create story button
function setupCreateButton() {
    const createBtn = document.querySelector('.create-btn');
    console.log('Setting up create button:', createBtn);
    
    if (!createBtn) {
        console.error('Create button not found');
        return;
    }
    
    // Remove any existing listeners
    const newCreateBtn = createBtn.cloneNode(true);
    createBtn.parentNode.replaceChild(newCreateBtn, createBtn);
    
    let isGenerating = false;
    
    newCreateBtn.addEventListener('click', async function(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Create button clicked');
        
        if (isGenerating) {
            console.log('Already generating story...');
            return;
        }
        
        try {
            isGenerating = true;
            newCreateBtn.disabled = true;
            newCreateBtn.textContent = 'Creating...';
            
            // Verify we have the analysis data
            if (!window.currentAnalysisData?.analysis?.story_elements) {
                console.error('Missing analysis data for story generation');
                throw new Error('Story elements not found. Please try again.');
            }

            // Collect all inputs
            const character = document.querySelector('#screen-character .story-input').value.trim();
            const setting = document.querySelector('#screen-setting .story-input').value.trim();
            const theme = document.querySelector('#screen-theme .story-input').value.trim();
            
            console.log('Story inputs:', { character, setting, theme });
            
            if (!character || !setting || !theme) {
                throw new Error('Please fill in all story elements before creating the story');
            }
            
            console.log('Sending story generation request with:', { character, setting, theme });
            
            // Call story generation API
            const response = await fetch('/story/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mainPrompt: `A story about ${character} in ${setting} who ${theme}`,
                    ageGroup: 'preK',
                    isArtworkFlow: true,
                    context: { character, setting, theme }
                })
            });
            
            console.log('Story generation response status:', response.status);
            const data = await response.json();
            console.log('Story generation response:', data);
            console.log('Story generated successfully');
            
            if (!data.success || !data.story) {
                throw new Error(data.error || 'No story content received');
            }
            
            // Handle successful story generation
            showGeneratedStory(data);
            
        } catch (error) {
            console.error('Error in story creation:', error);
            alert(error.message);
        } finally {
            isGenerating = false;
            newCreateBtn.disabled = false;
            newCreateBtn.textContent = 'Create Our Story! 📖';
        }
    });
}

function setupSuggestions() {
    // Use event delegation for suggestion clicks
    document.addEventListener('click', function(e) {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (!suggestionItem) return;
        
        const screen = suggestionItem.closest('.screen');
        const input = screen?.querySelector('.story-input');
        if (!input) return;
        
        const originalText = suggestionItem.textContent;
        input.value = originalText;
        
        // Visual feedback for copy
        const feedback = document.createElement('span');
        feedback.className = 'copy-feedback';
        feedback.textContent = '✓ Copied!';
        suggestionItem.appendChild(feedback);
        
        // Auto-copy to clipboard
        navigator.clipboard.writeText(originalText)
            .then(() => {
                setTimeout(() => feedback.remove(), 1000);
            })
            .catch(err => {
                console.error('Failed to copy text:', err);
                feedback.textContent = 'Copy failed';
                feedback.style.color = '#e74c3c';
                setTimeout(() => feedback.remove(), 1000);
            });
    });
}

function resetStoryForm() {
    // Reset all inputs
    document.querySelectorAll('.story-input').forEach(input => {
        input.value = '';
    });
    
    // Hide all suggestions
    document.querySelectorAll('.suggestions').forEach(div => {
        div.classList.add('hidden');
    });
    
    // Go back to first screen
    goToScreen(0);
}

function showGeneratedStory(data) {
    console.log('Displaying generated story');
    console.log('Story data received:', data);  // Debug log
    const storyModal = document.getElementById('storyModal');
    const mainInputSection = document.querySelector('.main-input-section');
    
    try {
        if (!mainInputSection) {
            throw new Error('Story display section not found');
        }
        
        // Hide modal
        if (storyModal) {
            storyModal.style.display = 'none';
        }
        
        // Extract story text from the response data structure
        let storyText;
        if (data.analysis && data.analysis.story_elements && data.analysis.story_elements.story) {
            storyText = data.analysis.story_elements.story;
        } else if (data.analysis && data.analysis.story) {
            storyText = data.analysis.story;
        } else if (data.story) {
            storyText = data.story;
        } else if (typeof data === 'string') {
            storyText = data;
        } else {
            console.error('Unexpected data structure:', data);
            throw new Error('No story content found in response');
        }
        
        // Ensure we have a string to work with
        if (!storyText || typeof storyText !== 'string') {
            throw new Error('Invalid story content');
        }
        
        // Create story HTML with data-purpose attributes for better event targeting
        const storyHTML = `
            <div class="generated-story">
                <div class="story-nav">
                    <button class="back-btn" id="story-back-btn" data-purpose="back">
                        <i class="fas fa-arrow-left" data-purpose="back"></i> Back
                    </button>
                </div>
                <h2>Your Story</h2>
                <div class="story-content">
                    ${storyText.split('\n')
                        .filter(para => para.trim())
                        .map(para => `<p>${para.trim()}</p>`)
                        .join('')}
                </div>
                <div class="story-actions">
                    <button class="create-new-btn" id="create-new-story-btn" data-purpose="new-story">
                        <i class="fas fa-plus" data-purpose="new-story"></i> Create Another Story
                    </button>
                </div>
            </div>
        `;
        
        // Update content
        mainInputSection.innerHTML = storyHTML;
        mainInputSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error displaying story:', error, 'Data:', data);
        // Show more detailed error message in development
        const errorMessage = process.env.NODE_ENV === 'development' 
            ? `${error.message} (Data structure: ${JSON.stringify(data, null, 2)})` 
            : error.message;
        alert('Error displaying story. Please try again.');
        if (mainInputSection) {
            mainInputSection.innerHTML = `
                <div class="error-message">
                    ${errorMessage || 'Error displaying story content'}
                </div>
            `
        }
    }
}

function showStoryModal(data) {
    console.log('Showing story modal with data:', data);
    const storyModal = document.getElementById('storyModal');
    if (!storyModal) {
        console.error('Story modal not found');
        return;
    }
    
    // Show the modal
    storyModal.style.display = 'block';
    
    // Reset to first screen
    goToScreen(0);
    
    // Clear any existing inputs
    document.querySelectorAll('.story-input').forEach(input => {
        input.value = '';
    });
    
    // Setup all modal controls
    setupNavigation(data);
    setupCreateButton();
    setupInspireButtons();
    
    // Store data for later use
    window.storyData = data;
}

function setupInspireButton(analysisData) {
    console.log('Setting up inspire button with data:', analysisData);
    if (!analysisData?.analysis?.story_elements) {
        console.error('Missing story elements for inspire button');
        return;
    }
    
    const inspireBtn = document.querySelector('.active .inspire-btn');
    const suggestions = document.querySelector('.active .suggestions');
    const currentScreen = document.querySelector('.screen.active');
    
    if (!inspireBtn || !suggestions || !currentScreen) {
        console.log('Missing elements:', { inspireBtn, suggestions, currentScreen });
        return;
    }
    
    // Setup click handler
    const newInspireBtn = inspireBtn.cloneNode(true);
    inspireBtn.parentNode.replaceChild(newInspireBtn, inspireBtn);
    
    newInspireBtn.addEventListener('click', () => {
        suggestions.classList.toggle('show');
        if (!suggestions.classList.contains('hidden')) {
            let suggestionItems = [];
            const storyElements = analysisData.analysis.story_elements;
            
            // Get suggestions based on current screen
            if (currentScreen.id === 'screen-character') {
                suggestionItems = storyElements.characters || [];
            } else if (currentScreen.id === 'screen-setting') {
                const settingLine = storyElements['setting/vibe'];
                suggestionItems = settingLine ? settingLine.split('|') : [];
            } else if (currentScreen.id === 'screen-theme') {
                const themeLine = storyElements.moral;
                suggestionItems = themeLine ? themeLine.split('|') : [];
            }
            
            suggestionItems = suggestionItems.map(item => item.trim()).filter(Boolean);
            console.log('Suggestion items:', suggestionItems);
            
            suggestions.innerHTML = suggestionItems.length ? 
                suggestionItems.map(item => `
                    <div class="suggestion-item" onclick="selectSuggestion(this.textContent)">
                        ${item}
                    </div>
                `).join('') :
                '<div class="no-suggestions">No suggestions available</div>';
            
            suggestions.style.maxHeight = '200px';
        }
    });
}

// Global modal handlers
function showModal(step) {
    const modal = document.getElementById('storyModal');
    const modalContent = document.getElementById('modalContent');
    const progressBar = document.getElementById('modalProgress');
    
    // Calculate progress percentage based on step
    const totalSteps = 3; // Upload, Analysis, Story
    const progress = (step / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);

    // Show modal if not already visible
    if (!modal.classList.contains('show')) {
        modal.classList.add('show');
        modal.style.display = 'block';
    }

    // Update content based on step
    switch(step) {
        case 1:
            modalContent.innerHTML = `
                <h5>Upload Your Artwork</h5>
                <p>Choose a picture of your artwork to start the story creation!</p>
                <form id="artworkForm">
                    <input type="file" class="form-control" id="artworkInput" name="artwork" accept="image/*" required>
                    <input type="text" class="form-control mt-2" id="keywordsInput" name="keywords" placeholder="Keywords (optional)">
                    <button type="submit" class="btn btn-primary mt-3">Analyze Artwork</button>
                </form>`;
            break;
        case 2:
            modalContent.innerHTML = `
                <h5>Analyzing Your Artwork</h5>
                <p>Our AI is looking at your artwork and thinking of story ideas...</p>
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>`;
            break;
        case 3:
            modalContent.innerHTML = `
                <h5>Creating Your Story</h5>
                <p>Almost done! Writing a special story just for you...</p>
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>`;
            break;
    }
}

function closeModal() {
    const modal = document.getElementById('storyModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    
    // Wait for modal animation to complete before restoring state
    setTimeout(() => {
        restoreHomepageState();
        // Keep the uploaded image in the upload box
        const uploadBox = document.getElementById('upload-box');
        if (uploadBox && uploadBox.querySelector('.preview-container')) {
            // Keep the preview container visible
            uploadBox.querySelector('.preview-container').style.display = 'block';
        }
        
        // Show the analyze button again
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.style.display = 'block';
            analyzeBtn.hidden = false;
        }
        
        // Reset modal state but keep analysis data
        resetModalState();
    }, 100);
}

function resetModalState() {
    // Reset screens visibility
    document.querySelectorAll('.screen').forEach((screen, index) => {
        if (index === 0) {
            screen.classList.remove('hidden');
            screen.style.display = 'block';
        } else {
            screen.classList.add('hidden');
            screen.style.display = 'none';
        }
    });

    // Reset suggestions
    document.querySelectorAll('.suggestions').forEach(suggestion => {
        suggestion.classList.add('hidden');
        suggestion.classList.remove('show');
    });

    // Reset inputs
    document.querySelectorAll('.story-input').forEach(input => {
        input.value = '';
    });

    // Reset progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = '33%';
    }
}

// Function to restore homepage state
function restoreHomepageState() {
    const keywordsInput = document.querySelector('.keywords-input:not(.modal-content .keywords-input)');
    const analyzeBtn = document.getElementById('analyze-btn');
    const uploadBox = document.getElementById('upload-box');
    
    // Check if there's an uploaded image
    const hasUploadedImage = uploadBox.querySelector('.preview-container');
    
    // Show keywords input if there's an uploaded image
    if (keywordsInput) {
        if (hasUploadedImage) {
            keywordsInput.style.display = 'block';
            keywordsInput.hidden = false;
        } else {
            keywordsInput.style.display = 'none';
            keywordsInput.hidden = true;
        }
    }
    
    // Always show analyze button on homepage
    if (analyzeBtn) {
        // Force button visibility
        analyzeBtn.style.display = 'block';
        analyzeBtn.hidden = false;
        // Ensure button is enabled
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Start the Magic! ✨';
    }

    // Force redraw on mobile
    if (window.innerWidth <= 768) {
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force reflow
        document.body.style.display = '';
    }
}

// Close when clicking outside
window.storyModal?.addEventListener('click', (e) => {
    if (e.target === window.storyModal) closeModal();
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    storyModal = document.getElementById('story-modal');
    closeModal();
    restoreHomepageState();
});

// Add touch event for mobile close
document.querySelector('.modal-close')?.addEventListener('touchend', (e) => {
    e.preventDefault();
    closeModal();
});

// Add flow state tracking at the top of the file
let currentFlow = null;

// Update CSS to ensure proper visibility
const style = document.createElement('style');
style.textContent = `
    @media (max-width: 768px) {
        body:not(.modal-open) .analyze-btn {
            display: block !important;
            visibility: visible !important;
        }
    }
`;
document.head.appendChild(style);

// Add event listener for the modal close button
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    }
});

// Add click handler for suggestion close buttons
document.querySelectorAll('.suggestions-close').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const suggestionsBox = this.closest('.suggestions');
        if (suggestionsBox) {
            suggestionsBox.classList.remove('show');
        }
    });
});