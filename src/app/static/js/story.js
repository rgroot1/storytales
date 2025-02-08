console.log('Script starting...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
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
        const keywordsInput = document.querySelector('.keywords-input');
        const analyzeBtn = document.getElementById('analyze-btn');
        const artworkForm = document.getElementById('artwork-form');
        
        // Initialize uploaded images array
        let uploadedImages = [];
        
        // Log elements for debugging
        console.log('Upload elements:', {
            uploadBox,
            artworkInput,
            keywordsInput,
            analyzeBtn,
            artworkForm
        });

        if (uploadBox && artworkInput && artworkForm) {
            // Handle drag and drop
            uploadBox.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadBox.classList.add('dragover');
            });

            // Handle click upload
            uploadBox.addEventListener('click', () => {
                artworkInput.click();
            });
            
            artworkInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleFile(file);
                }
            });

            uploadBox.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadBox.classList.remove('dragover');
            });

            uploadBox.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadBox.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) {
                    handleFile(file);
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
                
                const keywordsInput = document.querySelector('.keywords-input');
                const analyzeBtn = document.getElementById('analyze-btn');
                const previewContainer = document.getElementById('artwork-preview-container');
                
                // Validate all required elements
                if (!keywordsInput || !analyzeBtn || !previewContainer) {
                    console.error('Missing UI elements:', {
                        keywordsInput: !!keywordsInput,
                        analyzeBtn: !!analyzeBtn,
                        previewContainer: !!previewContainer
                    });
                    alert('Sorry, there was a problem with the upload interface. Please try again.');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log('File loaded:', e.target.result.substring(0, 50) + '...');
                    // Clear existing images for single image upload
                    uploadedImages = [{
                        file: file,
                        dataUrl: e.target.result
                    }];
                    
                    // Update the upload box with the preview
                    uploadBox.innerHTML = `
                        <div class="upload-content" style="display: none;"></div>
                        <img src="${e.target.result}" class="artwork-preview" alt="Uploaded artwork" style="pointer-events: none;" />
                        <button type="button" class="delete-image">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    
                    keywordsInput.hidden = false;
                    analyzeBtn.hidden = false;
                };
                reader.onerror = (error) => {
                    console.error('Error reading file:', error);
                    alert('Error reading file. Please try again.');
                };
                reader.readAsDataURL(file);
            }

            function updateImagePreviews() {
                const previewContainer = document.getElementById('artwork-preview-container');
                previewContainer.innerHTML = uploadedImages.map((img, index) => `
                    <div class="preview-item">
                        <img src="${img.dataUrl}" class="artwork-preview" />
                        <button type="button" class="delete-image" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('');
            }

            // Handle image deletion
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-image')) {
                    e.preventDefault();
                    console.log('Delete image clicked');
                    
                    // Reset upload box to original state
                    uploadBox.innerHTML = `
                        <div class="upload-content">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drop your artwork here or click to upload</p>
                            <small>Supports: JPG, PNG, GIF (max 5MB)</small>
                        </div>
                    `;
                    
                    // Clear uploaded images array
                    uploadedImages = [];
                    
                    // Hide keywords input and analyze button
                    keywordsInput.hidden = true;
                    analyzeBtn.hidden = true;
                }
            });

            // Cache for API responses
            let analysisCache = new Map();
            
            // Handle form submission
            artworkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (uploadedImages.length === 0) {
                    alert('Please upload at least one artwork image!');
                    return;
                }

                // Generate cache key from image data and keywords
                const cacheKey = JSON.stringify({
                    imageData: uploadedImages[0].dataUrl,
                    keywords: keywordsInput.value
                });
                
                // Check cache first
                if (analysisCache.has(cacheKey)) {
                    console.log('Using cached analysis result');
                    const cachedData = analysisCache.get(cacheKey);
                    showStoryModal(cachedData);
                    return;
                }
                
                // Show loading state
                const originalBtnText = analyzeBtn.textContent;
                analyzeBtn.disabled = true;
                analyzeBtn.textContent = 'Analyzing...';
                
                try {
                    const formData = new FormData(artworkForm);
                    formData.append('artwork', uploadedImages[0].file);
                    formData.append('keywords', keywordsInput.value);
                    
                    const response = await fetch('/story/artwork/analyze', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to analyze artwork');
                    }
                    
                    const data = await response.json();
                    // Cache the successful response
                    analysisCache.set(cacheKey, data);
                    
                    showStoryModal(data);
                    
                } catch (error) {
                    console.error('Error:', error);
                    alert(error.message);
                } finally {
                    analyzeBtn.disabled = false;
                    analyzeBtn.textContent = originalBtnText;
                }
            });
        } else {
            console.error('Missing required upload elements:', {
                uploadBox: !!uploadBox,
                artworkInput: !!artworkInput,
                artworkForm: !!artworkForm
            });
        }
    }

    // Story Modal Logic
    function initStoryModal() {
        const modal = document.getElementById('storyModal');
        // Make first screen active
        document.getElementById('screen-character').classList.add('active');
    }

    // Initialize when DOM loads
    initStoryModal();

    // Initialize modal if it exists
    const storyModal = document.getElementById('storyModal');
    if (storyModal) {
        initStoryModal();
        // Add close button handler
        const closeBtn = storyModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                storyModal.style.display = 'none';
            });
        }
    }

    if (app.debug) {
        app.logger.setLevel('DEBUG');
    }

    return app;
});

// Global functions for story modal
function showAnalysisResults(analysisData) {
    console.log('Received analysis data:', analysisData);
    
    if (!analysisData?.analysis?.story_elements) {
        console.error('Missing story elements in analysis data');
        return;
    }

    // Store analysis data globally for use across screens
    window.storyData = analysisData;
    
    // Show modal and make first screen active
    const modal = document.getElementById('storyModal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    modal.style.display = 'block';
    
    // Ensure first screen exists
    const firstScreen = document.getElementById('screen-character');
    if (!firstScreen) {
        console.error('First screen element not found');
        return;
    }
    firstScreen.classList.add('active');
    
    // Initialize all modal controls
    addModalControls();
    setupProgressBar();
    setupInspireButton(analysisData);
    setupNavigation(analysisData);
    setupCreateButton();
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
        suggestions.classList.toggle('hidden');
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

function updateProgressBar(screenIndex) {
    const progressFill = document.querySelector('.progress-fill');
    
    if (progressFill) {
        progressFill.style.width = `${(screenIndex + 1) * 33.33}%`;
    }
}

// Handle create story button
function setupCreateButton() {
    const createBtn = document.querySelector('.create-btn');
    console.log('Setting up create button:', createBtn);
    
    if (!createBtn) return; // Exit if no button found
    
    let isGenerating = false;
    
    createBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // Prevent any form submission
        console.log('Create button clicked, isGenerating:', isGenerating);
        
        if (isGenerating) {
            console.log('Already generating story...');
            return;
        }
        
        try {
            isGenerating = true;
            createBtn.disabled = true;
            createBtn.textContent = 'Creating...';
            
            // Collect all inputs
            const character = document.querySelector('#screen-character .story-input').value.trim();
            const setting = document.querySelector('#screen-setting .story-input').value.trim();
            const theme = document.querySelector('#screen-theme .story-input').value.trim();
            
            console.log('Story inputs collected:', { character, setting, theme });
            
            if (!character || !setting || !theme) {
                throw new Error('Please fill in all story elements before creating the story');
            }
            
            const storyData = {
                mainPrompt: `A story about ${character} in ${setting} who ${theme}`,
                ageGroup: 'preK',
                isArtworkFlow: true,
                context: {
                    character,
                    setting,
                    theme
                }
            };
            
            console.log('Sending story data:', storyData);
            
            const response = await fetch('/story/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(storyData)
            });
            
            console.log('Story generation response status:', response.status);
            const data = await response.json();
            console.log('Story generation response data:', data);
            
            if (!data.success || !data.story) {
                throw new Error(data.error || 'No story content received');
            }
            
            // Handle successful response
            console.log('Story generated:', data);
            showGeneratedStory(data);
            
        } catch (error) {
            console.error('Error generating story:', error);
            alert(error.message);
        } finally {
            isGenerating = false; // Reset flag
            createBtn.disabled = false;
            createBtn.textContent = 'Create Our Story! 📖';
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
    setupProgressBar();
    setupNavigation(data);
    setupCreateButton();
    setupInspireButtons();
    
    // Store data for later use
    window.storyData = data;
}

// Move setupCreateButton outside DOMContentLoaded to make it globally available
window.setupCreateButton = function() {
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
    
    newCreateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('Create button clicked');
        
        if (isGenerating) {
            console.log('Already generating story...');
            return;
        }
        
        try {
            isGenerating = true;
            newCreateBtn.disabled = true;
            newCreateBtn.textContent = 'Creating...';
            
            // Collect all inputs
            const character = document.querySelector('#screen-character .story-input').value.trim();
            const setting = document.querySelector('#screen-setting .story-input').value.trim();
            const theme = document.querySelector('#screen-theme .story-input').value.trim();
            
            console.log('Story inputs:', { character, setting, theme });
            
            if (!character || !setting || !theme) {
                throw new Error('Please fill in all story elements before creating the story');
            }
            
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
            
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate story');
            }
            
            showGeneratedStory(data);
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        } finally {
            isGenerating = false;
            newCreateBtn.disabled = false;
            newCreateBtn.textContent = 'Create Our Story! 📖';
        }
    });
};

function setupInspireButtons() {
    // Remove existing event listeners
    document.removeEventListener('click', handleInspireClick);
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('click', handleSuggestionClick);
    
    // Handle inspire button clicks with named function for proper cleanup
    function handleInspireClick(e) {
        const inspireBtn = e.target.closest('.inspire-btn');
        if (inspireBtn) {
            console.log('Inspire button clicked');
            e.stopPropagation();
            const screen = inspireBtn.closest('.screen');
            const suggestions = screen.querySelector('.suggestions');
            
            if (!suggestions) {
                console.error('No suggestions element found');
                return;
            }
            
            // Close all other suggestion boxes first
            document.querySelectorAll('.suggestions').forEach(box => {
                if (box !== suggestions) {
                    box.classList.add('hidden');
                    box.closest('.screen').style.paddingBottom = '6rem';
                }
            });
            
            // Force show suggestions
            suggestions.classList.remove('hidden');
            
            // Adjust screen padding based on suggestions visibility
            screen.style.paddingBottom = '12rem';
            
            console.log('Suggestions visibility toggled:', !suggestions.classList.contains('hidden'));
            
            // Only populate suggestions if we're showing them
            if (window.storyData?.analysis?.story_elements) {
                // Get suggestions from stored analysis data
                const screenId = screen.id;
                let suggestionItems = [];
                
                const elements = window.storyData.analysis.story_elements;
                switch(screenId) {
                    case 'screen-character':
                        suggestionItems = elements.characters || [];
                        break;
                    case 'screen-setting':
                        // Split setting/vibe if it contains multiple suggestions
                        const settingVibe = elements['setting/vibe'];
                        suggestionItems = settingVibe ? settingVibe.split('|').map(s => s.trim()) : [];
                        break;
                    case 'screen-theme':
                        // Split moral if it contains multiple suggestions
                        const moral = elements.moral;
                        suggestionItems = moral ? moral.split('|').map(s => s.trim()) : [];
                        break;
                }
                
                console.log('Screen:', screenId, 'Suggestions:', suggestionItems);
                
                // Update suggestions content
                if (suggestionItems.length > 0) {
                    suggestions.innerHTML = suggestionItems
                        .map(item => `<div class="suggestion-item">${item}</div>`)
                        .join('');
                    console.log('Suggestions populated:', suggestionItems);
                } else {
                    suggestions.innerHTML = '<div class="no-suggestions">No suggestions available</div>';
                }
            }
        }
    }
    
    // Handle clicks outside to close suggestions
    function handleOutsideClick(e) {
        // Close suggestions if clicking outside of suggestions and inspire button
        const isInspireBtn = e.target.closest('.inspire-btn');
        const isSuggestionItem = e.target.closest('.suggestion-item');
        
        if (!isInspireBtn && !isSuggestionItem && !e.target.closest('.suggestions')) {
            document.querySelectorAll('.suggestions').forEach(box => {
                box.classList.add('hidden');
                box.closest('.screen').style.paddingBottom = '6rem';
            });
        }
    }
    
    // Handle suggestion item clicks
    function handleSuggestionClick(e) {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            e.stopPropagation();
            const screen = suggestionItem.closest('.screen');
            const input = screen.querySelector('.story-input');
            const suggestions = screen.querySelector('.suggestions');
            
            // Get only the text content, excluding any feedback symbols
            const suggestionText = suggestionItem.childNodes[0].textContent.trim();
            input.value = suggestionText;
            
            // Show copy feedback
            const feedback = document.createElement('span');
            feedback.className = 'copy-feedback';
            feedback.textContent = '✓';
            suggestionItem.appendChild(feedback);
            
            // Remove feedback and close suggestions after a delay
            setTimeout(() => {
                feedback.remove();
                suggestions.classList.add('hidden');
                screen.style.paddingBottom = '6rem';
            }, 500);
        }
    }
    
    // Add event listeners
    document.addEventListener('click', handleInspireClick);
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('click', handleSuggestionClick);
}