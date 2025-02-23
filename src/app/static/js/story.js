const FEATURES = {
    ARTWORK_UPLOAD: true,
    ARTWORK_ANALYSIS: true
};

console.log('Script starting...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing handlers');
    
    const isArtworkPage = document.querySelector('.artwork-upload-section');
    const isCreatePage = document.querySelector('.story-form');

    console.log('Page type:', { isArtworkPage: !!isArtworkPage, isCreatePage: !!isCreatePage });

    if (isArtworkPage && FEATURES.ARTWORK_UPLOAD) {
        const uploadBox = document.getElementById('upload-box');
        const artworkInput = document.getElementById('artwork');
        const artworkForm = document.getElementById('artwork-form');

        if (uploadBox && artworkInput && artworkForm) {
            // Add the actual handlers here
            uploadBox.addEventListener('click', function(e) {
                if (!e.target.closest('.delete-image')) {
                    artworkInput.click();
                }
            });

            artworkInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                }
            });

            // Form submission handler
            artworkForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const analyzeBtn = document.getElementById('analyze-btn');
                if (analyzeBtn) {
                    analyzeBtn.disabled = true;
                    analyzeBtn.textContent = 'Analyzing...';
                }
                
                try {
                    const formData = new FormData(e.target);
                    const response = await fetch('/story/artwork/analyze', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);

                    showAnalysisResults(data);
                } catch (error) {
                    console.error('Error:', error);
                    alert(error.message);
                } finally {
                    if (analyzeBtn) {
                        analyzeBtn.disabled = false;
                        analyzeBtn.textContent = 'Start the Magic! ✨';
                    }
                }
            });
        }
    } else if (isCreatePage) {
        setupCreateFormHandlers();
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

    // Artwork upload handling
    if (FEATURES.ARTWORK_UPLOAD) {
        const uploadBox = document.getElementById('upload-box');
        const artworkInput = document.getElementById('artwork');
        const artworkForm = document.getElementById('artwork-form');
        let uploadedFile = null;

        // Function to ensure analyze button visibility
        function showAnalyzeButton() {
            const analyzeBtn = document.getElementById('analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.hidden = false;
                analyzeBtn.style.display = 'block';
                analyzeBtn.textContent = 'Start the Magic! ✨';
            }
        }

        // Handle file upload
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
                
                // Show keywords input and analyze button
                document.querySelector('.keywords-input').hidden = false;
                showAnalyzeButton();
            };

            reader.onerror = (error) => {
                console.error('File read error:', error);
                alert('Error reading file. Please try again.');
            };

            reader.readAsDataURL(file);
        }

        // Setup file input click handler
        uploadBox.addEventListener('click', function(e) {
            if (!e.target.closest('.delete-image')) {
                artworkInput.click();
            }
        });

        // Setup file input change handler
        artworkInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });

        // Handle form submission
        artworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!uploadedFile) {
                alert('Please upload an image first');
                return;
            }

            const analyzeBtn = document.getElementById('analyze-btn');
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';

            const formData = new FormData();
            formData.append('artwork', uploadedFile);
            formData.append('keywords', document.querySelector('.keywords-input input').value || '');

            try {
                const response = await fetch('/story/artwork/analyze', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to analyze artwork');
                }

                // Show the modal with analysis results
                showAnalysisResults(data);
            } catch (error) {
                console.error('Error:', error);
                alert(error.message);
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Start the Magic! ✨';
            }
        });

        // Initial setup
        showAnalyzeButton();
    }

    // Initialize analysis trigger flag at page load
    window.analysisTriggered = false;

    // Global handlers that should work on both pages
    setupGlobalHandlers();
});

// ==========================================
// CREATE FROM SCRATCH PATH HANDLERS
// ==========================================
function setupCreateFormHandlers() {
    console.log('Setting up create form handlers');
    
    // More Options button
    const moreOptionsBtn = document.getElementById('tell-more-btn');
    if (moreOptionsBtn) {
        moreOptionsBtn.addEventListener('click', function() {
            const additionalFields = document.getElementById('additional-fields');
            const icon = this.querySelector('i');
            if (additionalFields.style.display === 'none') {
                additionalFields.style.display = 'block';
                icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
            } else {
                additionalFields.style.display = 'none';
                icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
            }
        });
    }

    // Generate Story button - fix payload key names
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get and validate input values
            const mainPrompt = document.querySelector('.main-prompt')?.value?.trim();
            if (!mainPrompt) {
                alert('Please provide a story prompt');
                return;
            }

            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';

            const keywords = document.querySelector('.keywords-input')?.value?.trim() || '';
            const age = document.querySelector('.age-select')?.value || '';

            // Make API call with correct key names
            fetch('/story/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mainPrompt: mainPrompt,  // Changed from prompt to mainPrompt
                    keywords: keywords,
                    ageGroup: age,  // Changed from age to ageGroup
                    isArtworkFlow: false  // Add this flag for server-side context
                })
            })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to generate story');
                }
                return data;
            })
            .then(data => {
                showGeneratedStory(data);
            })
            .catch(error => {
                console.error('Error:', error);
                alert(error.message || 'Failed to generate story. Please try again.');
            })
            .finally(() => {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Story';
            });
        });
    }
}

// ==========================================
// ARTWORK PATH HANDLERS
// ==========================================
function showAnalysisResults(analysisData) {
    if (!analysisData) {
        console.error('No analysis data provided');
        return;
    }
    
    // Store analysis data globally for reuse
    window.currentAnalysisData = analysisData;
    
    // Reset modal state before showing new content
    resetModalState();
    
    // Only show modal if we're on the artwork page
    const isArtworkPage = document.querySelector('.artwork-upload-section');
    if (isArtworkPage) {
        const modal = document.getElementById('storyModal');
        if (modal) {
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    // Setup screens and handlers
    setupNavigationHandlers();
    setupSuggestionHandlers();
    setupCreateButton();
    
    // Update progress bar
    updateStoryProgress('screen-character');
}

function setupNavigationHandlers() {
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
                updateStoryProgress(nextScreen.id);
                
                // Hide any open suggestions
                const suggestions = currentScreen.querySelector('.suggestions');
                if (suggestions) {
                    suggestions.style.display = 'none';
                    suggestions.classList.add('hidden');
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
                updateStoryProgress(previousScreen.id);
                
                // Hide any open suggestions
                const suggestions = currentScreen.querySelector('.suggestions');
                if (suggestions) {
                    suggestions.style.display = 'none';
                    suggestions.classList.add('hidden');
                }
            }
        });
    });
}

function setupSuggestionHandlers() {
    document.querySelectorAll('.inspire-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Inspire button clicked');
            
            const screen = this.closest('.screen');
            const suggestions = screen.querySelector('.suggestions');
            
            if (!suggestions) {
                console.error('No suggestions container found');
                return;
            }

            console.log('Current suggestions display:', suggestions.style.display);

            // Populate and show suggestions
            populateSuggestions(screen.id, window.currentAnalysisData);
            suggestions.style.display = 'block';
            console.log('Set suggestions display to block');

            // Add click handlers
            const items = suggestions.querySelectorAll('.suggestion-item');
            console.log('Found suggestion items:', items.length);

            // Use event delegation for all clicks within suggestions
            suggestions.addEventListener('click', function(event) {
                // Handle close button click
                if (event.target.matches('.suggestions-close')) {
                    console.log('Close button clicked');
                    event.preventDefault();
                    event.stopPropagation();
                    suggestions.style.display = 'none';
                }

                // Handle suggestion item click
                if (event.target.matches('.suggestion-item')) {
                    const input = screen.querySelector('.story-input');
                    if (input) {
                        input.value = event.target.textContent;
                        suggestions.style.display = 'none';
                        console.log('Selected suggestion:', event.target.textContent);
                    }
                }
            });
        });
    });
}

function populateSuggestions(screenId, data) {
    console.log('Populating suggestions for:', screenId);
    
    const screen = document.getElementById(screenId);
    const suggestions = screen.querySelector('.suggestions');
    if (!suggestions || !data?.analysis?.story_elements) {
        console.error('Missing data:', { suggestions: !!suggestions, data: !!data });
        return;
    }

    const elements = data.analysis.story_elements;
    let items = [];
    
    switch(screenId) {
        case 'screen-character':
            items = elements.characters || [];
            break;
        case 'screen-setting':
            items = elements.setting ? elements.setting : [];
            break;
        case 'screen-theme':
            items = elements.moral ? elements.moral : [];
            break;
    }

    console.log('Generated items:', items);

    // Simpler structure without suggestions-content
    suggestions.innerHTML = `
        <button class="suggestions-close" aria-label="Close">×</button>
        ${items.map(item => `<div class="suggestion-item">${item}</div>`).join('')}
    `;
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
        modal.classList.remove('show');
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
            storyModal.classList.remove('show');
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
            `;
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
    
    // Show the modal using class
    storyModal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Reset to first screen
    goToScreen(0);
    
    // Clear any existing inputs
    document.querySelectorAll('.story-input').forEach(input => {
        input.value = '';
    });
    
    // Setup all modal controls
    setupNavigation(data);
    setupCreateButton();
    setupInspireButton(data);
    
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