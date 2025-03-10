const FEATURES = {
    ARTWORK_UPLOAD: true,
    ARTWORK_ANALYSIS: true,
    SIMPLIFIED_ARTWORK_FLOW: true  // v2.0: Feature flag for simplified artwork flow
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
        let uploadedFile = null;
        let isHandlingFile = false;  // Add flag to prevent double handling

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
            if (isHandlingFile) {
                console.log('Already handling a file, skipping');
                return;
            }

            console.log('Handling file:', file);
            isHandlingFile = true;

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            
            if (!allowedTypes.includes(file.type)) {
                alert('Please upload a JPG, PNG, or GIF file');
                isHandlingFile = false;
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                alert('File too large. Maximum size is 5MB');
                isHandlingFile = false;
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('File loaded successfully');
                uploadedFile = file;
                
                // Update upload box content
                if (uploadBox) {
                    uploadBox.innerHTML = `
                        <div class="preview-container">
                            <img src="${e.target.result}" class="artwork-preview" alt="Uploaded artwork" />
                            <button type="button" class="delete-image">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }
                
                // Show keywords input and analyze button
                const keywordsInput = document.querySelector('.keywords-input');
                if (keywordsInput) {
                    keywordsInput.hidden = false;
                }
                showAnalyzeButton();
                isHandlingFile = false;
            };

            reader.onerror = (error) => {
                console.error('File read error:', error);
                alert('Error reading file. Please try again.');
                isHandlingFile = false;
            };

            reader.readAsDataURL(file);
        }

        if (uploadBox && artworkInput) {
            // Setup file input click handler
            uploadBox.addEventListener('click', function(e) {
                console.log('Upload box clicked');
                if (!e.target.closest('.delete-image')) {
                    e.preventDefault();
                    e.stopPropagation();
                    artworkInput.click();
                }
            });

            // Setup file input change handler
            artworkInput.addEventListener('change', function(e) {
                console.log('File input changed');
                if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                }
            });

            // Setup keywords character counter
            const keywordsInput = document.querySelector('.keywords-input input');
            const keywordsCounter = document.getElementById('keywords-count');
            if (keywordsInput && keywordsCounter) {
                keywordsInput.addEventListener('input', function() {
                    const length = this.value.length;
                    keywordsCounter.textContent = length;
                    
                    // Add warning class when approaching limit
                    const counterContainer = keywordsCounter.parentElement;
                    if (length >= 90) {
                        counterContainer.classList.add('limit-reached');
                    } else {
                        counterContainer.classList.remove('limit-reached');
                    }
                    
                    // Show warning when limit is reached
                    if (length === 100) {
                        showNotification('Maximum character limit reached for keywords', 'warning');
                    }
                });
            }

            // Setup delete button handler
            uploadBox.addEventListener('click', function(e) {
                const deleteBtn = e.target.closest('.delete-image');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Reset file input value so same file can be uploaded again
                    artworkInput.value = '';
                    uploadedFile = null;
                    
                    // Clear the cached analysis results
                    lastAnalysisResult = null;
                    
                    // Reset upload box UI
                    uploadBox.innerHTML = `
                        <div class="upload-content">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drop your artwork here or click to upload</p>
                            <small>Supports: JPG, PNG, GIF (max 5MB)</small>
                        </div>
                    `;
                    
                    // Reset keywords input
                    const keywordsInput = document.querySelector('.keywords-input');
                    if (keywordsInput) {
                        keywordsInput.hidden = true;
                        keywordsInput.querySelector('input').value = '';
                    }
                    
                    // Reset handling flag
                    isHandlingFile = false;
                }
            });

            // Add drag and drop handlers
            uploadBox.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('File being dragged over upload box');
                this.classList.add('dragover');
            });

            uploadBox.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('File drag left upload box');
                this.classList.remove('dragover');
            });

            uploadBox.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('File dropped');
                
                this.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files && files[0]) {
                    handleFile(files[0]);
                }
            });
        }

        // Handle form submission
        if (artworkForm) {
            artworkForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Form submitted');
                
                if (!uploadedFile) {
                    alert('Please upload an image first');
                    return;
                }

                const analyzeBtn = document.getElementById('analyze-btn');
                if (analyzeBtn) {
                    analyzeBtn.disabled = true;
                    analyzeBtn.textContent = 'Analyzing...';
                }

                try {
                    // Check if we have cached results for this image
                    if (lastAnalysisResult) {
                        console.log('Using cached analysis results');
                        showAnalysisResults(lastAnalysisResult);
                        if (analyzeBtn) {
                            analyzeBtn.disabled = false;
                            analyzeBtn.textContent = 'Start the Magic! ✨';
                        }
                        return;
                    }

                    const formData = new FormData();
                    formData.append('artwork', uploadedFile);
                    formData.append('keywords', document.querySelector('.keywords-input input')?.value || '');

                    const response = await fetch('/story/artwork/analyze', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to analyze artwork');
                    }

                    // Store the result for caching
                    lastAnalysisResult = data;
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
        console.log('On create page, setting up handlers');
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

    // Initialize analysis trigger flag at page load
    window.analysisTriggered = false;

    // Add basic implementations of the missing functions
    // Function to handle global UI interactions
    function setupGlobalHandlers() {
        console.log('Setting up global handlers');
        // This function was previously missing - add basic implementation
    }
    
    // Function to set up modal-related handlers
    function setupModalHandlers() {
        console.log('Setting up modal handlers');
        // This function was previously missing - add basic implementation
    }
    
    // Call the functions now that they're defined
    setupGlobalHandlers();
    setupModalHandlers();

    // Search for event handler setup for the "More Details" button
    const tellMoreBtn = document.getElementById('tell-more-btn');
    const additionalFields = document.getElementById('additional-fields');

    if (tellMoreBtn) {
        tellMoreBtn.addEventListener('click', function() {
            additionalFields.classList.toggle('show');
            const icon = this.querySelector('i');
            if (additionalFields.classList.contains('show')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        });
    }
});

// ==========================================
// CREATE FROM SCRATCH PATH HANDLERS
// ==========================================
function setupCreateFormHandlers() {
    console.log('Setting up create form handlers');
    
    // More Options button
    const moreOptionsBtn = document.getElementById('tell-more-btn');
    console.log('Found more options button:', !!moreOptionsBtn);
    
    if (moreOptionsBtn) {
        // Remove any existing listeners first
        const newMoreOptionsBtn = moreOptionsBtn.cloneNode(true);
        moreOptionsBtn.parentNode.replaceChild(newMoreOptionsBtn, moreOptionsBtn);
        
        newMoreOptionsBtn.addEventListener('click', function(e) {
            console.log('More options button clicked');
            const additionalFields = document.getElementById('additional-fields');
            console.log('Additional fields element:', !!additionalFields);
            console.log('Current display state:', additionalFields.style.display);
            
            additionalFields.classList.toggle('show');
            const icon = this.querySelector('i');
            
            if (additionalFields.classList.contains('show')) {
                icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                additionalFields.style.display = 'block';  // Force display block
            } else {
                icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                additionalFields.style.display = 'none';   // Force display none
            }
            
            console.log('New display state:', additionalFields.style.display);
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
    
    console.log('Analysis data:', analysisData);
    
    window.currentAnalysisData = analysisData;
    resetModalState();
    
    const isArtworkPage = document.querySelector('.artwork-upload-section');
    if (isArtworkPage) {
        const modal = document.getElementById('storyModal');
        if (modal) {
            // Show the modal
            console.log('Showing modal');
            modal.classList.add('show');
            document.body.classList.add('modal-open');

            // Add a small delay to ensure modal is visible before manipulating content
            setTimeout(() => {
                console.log('Modal visibility check:', {
                    modalDisplay: window.getComputedStyle(modal).display,
                    modalVisibility: window.getComputedStyle(modal).visibility,
                    modalOpacity: window.getComputedStyle(modal).opacity
                });
                
                // Check if we should use the simplified flow
                if (FEATURES.SIMPLIFIED_ARTWORK_FLOW) {
                    console.log('Using simplified artwork flow');
                    
                    // Hide all screens first
                    document.querySelectorAll('.screen').forEach(screen => {
                        console.log('Hiding screen:', screen.id);
                        screen.style.display = 'none';
                        screen.classList.remove('active');
                    });
                    
                    // Show the simplified screen
                    const simplifiedScreen = document.getElementById('simplified-story-screen');
                    console.log('Simplified screen element:', simplifiedScreen);
                    
                    if (simplifiedScreen) {
                        console.log('Setting simplified screen display to flex');
                        simplifiedScreen.style.display = 'flex';
                        simplifiedScreen.classList.add('active');
                        
                        // Pre-fill the story elements with random suggestions
                        prefillStoryElements(analysisData);
                        
                        // Setup button handlers
                        setupSimplifiedFlowHandlers(analysisData);
                    } else {
                        console.error('Could not find simplified-story-screen element!');
                    }
                    
                    // Hide progress bar for simplified flow
                    const progressBar = document.querySelector('.progress-bar');
                    if (progressBar) {
                        progressBar.style.display = 'none';
                    }
                } else {
                    // Legacy multi-screen flow
                    // Remove any existing kudos screens first
                    const modalContent = modal.querySelector('.modal-content');
                    modalContent.querySelectorAll('.screen-kudos').forEach(screen => screen.remove());
                    
                    // Extract comments from the response
                    const comments = analysisData.comments || analysisData.analysis?.comments || [];
                    
                    // Create kudos screen
                    const kudosScreen = createKudosScreen(comments);
                    
                    // Insert kudos screen before the first existing screen
                    const firstScreen = modalContent.querySelector('.screen');
                    if (firstScreen) {
                        modalContent.insertBefore(kudosScreen, firstScreen);
                    } else {
                        modalContent.appendChild(kudosScreen);
                    }
                    
                    // Show kudos screen first, hide others
                    document.querySelectorAll('.screen').forEach(screen => {
                        screen.style.display = 'none';
                        screen.classList.remove('active');
                    });
                    kudosScreen.style.display = 'block';
                    kudosScreen.classList.add('active');
                    
                    // Setup legacy navigation handlers
                    setupNavigationHandlers();
                    setupSuggestionHandlers();
                    setupCreateButton();
                    
                    // Start with kudos screen in progress bar
                    updateStoryProgress('screen-kudos');
                }
                
                // Setup modal close handlers
                setupModalCloseHandlers(modal);
            }, 100);
        }
    }
}

// Function to pre-fill story elements with random suggestions from the analysis
function prefillStoryElements(analysisData) {
    console.log('Pre-filling story elements with suggestions');
    
    // Default fallback content in case of API failure
    const defaultStoryElements = {
        characters: ["Shadow the grey cat", "Sparkle the friendly dragon", "Max the brave puppy", "Lily the curious rabbit"],
        setting: ["A sunny garden", "A magical forest", "A cozy treehouse", "A secret cave"],
        moral: "A story about friendship and helping others"
    };
    
    // Default fallback comments
    const defaultComments = [
        "Wow, you did a great job cutting out all the shapes!",
        "I love the colors you used in your artwork!",
        "Your drawing shows so much creativity and imagination!"
    ];
    
    // Extract story elements from the analysis data or use defaults if not available
    let storyElements = {};
    let comments = [];
    
    try {
        // Check if we have valid analysis data
        if (analysisData && analysisData.analysis) {
            if (analysisData.analysis.story_elements) {
                storyElements = analysisData.analysis.story_elements;
                console.log('Using API-provided story elements:', storyElements);
            }
            
            if (analysisData.analysis.comments && analysisData.analysis.comments.length > 0) {
                comments = analysisData.analysis.comments;
                console.log('Using API-provided comments:', comments);
            } else if (analysisData.comments && analysisData.comments.length > 0) {
                comments = analysisData.comments;
                console.log('Using API-provided comments (legacy format):', comments);
            }
        }
        
        // Use defaults if data is missing
        if (Object.keys(storyElements).length === 0) {
            storyElements = defaultStoryElements;
            console.log('API data missing, using default story elements');
            showNotification('Using default story elements due to API limitations', 'info');
        }
        
        if (comments.length === 0) {
            comments = defaultComments;
            console.log('API comments missing, using default comments');
        }
    } catch (error) {
        // Use defaults if there's an error
        storyElements = defaultStoryElements;
        comments = defaultComments;
        console.error('Error processing API data:', error);
        showNotification('Using default story elements due to an error', 'warning');
    }
    
    // Update the kudo message with a random comment from the API
    const kudoMessage = document.getElementById('kudo-message');
    if (kudoMessage && comments.length > 0) {
        const randomComment = comments[Math.floor(Math.random() * comments.length)];
        kudoMessage.textContent = randomComment;
    }
    
    // Get the input fields
    const characterInput = document.getElementById('character');
    const settingInput = document.getElementById('setting');
    const themeInput = document.getElementById('theme');
    
    // Randomly select and pre-fill character
    if (storyElements.characters && storyElements.characters.length > 0) {
        const randomCharacter = storyElements.characters[Math.floor(Math.random() * storyElements.characters.length)];
        if (characterInput) characterInput.value = randomCharacter;
    } else if (characterInput) {
        characterInput.value = defaultStoryElements.characters[0];
    }
    
    // Randomly select and pre-fill setting
    if (storyElements.setting && storyElements.setting.length > 0) {
        const randomSetting = storyElements.setting[Math.floor(Math.random() * storyElements.setting.length)];
        if (settingInput) settingInput.value = randomSetting;
    } else if (settingInput) {
        settingInput.value = defaultStoryElements.setting[0];
    }
    
    // Pre-fill theme/moral
    if (storyElements.moral) {
        // Handle both string and array formats for moral
        const moral = Array.isArray(storyElements.moral) 
            ? storyElements.moral[Math.floor(Math.random() * storyElements.moral.length)]
            : storyElements.moral;
            
        if (themeInput) themeInput.value = moral;
    } else if (themeInput) {
        themeInput.value = defaultStoryElements.moral;
    }
    
    // Store the used suggestions to avoid duplicates when showing other options
    window.usedSuggestions = {
        characters: characterInput ? [characterInput.value] : [],
        setting: settingInput ? [settingInput.value] : [],
        moral: themeInput ? [themeInput.value] : []
    };
    
    // Store all available suggestions for reference
    window.allSuggestions = {
        characters: storyElements.characters || defaultStoryElements.characters,
        setting: storyElements.setting || defaultStoryElements.setting,
        moral: Array.isArray(storyElements.moral) ? storyElements.moral : [storyElements.moral || defaultStoryElements.moral]
    };
}

// Function to show other story element options
function showOtherOptions(analysisData) {
    console.log('Showing other story element options');
    
    // Get the input fields
    const characterInput = document.getElementById('character');
    const settingInput = document.getElementById('setting');
    const themeInput = document.getElementById('theme');
    
    // Initialize used suggestions if not already done
    if (!window.usedSuggestions) {
        window.usedSuggestions = {
            characters: [],
            setting: [],
            moral: []
        };
    }
    
    // Initialize all suggestions if not already done
    if (!window.allSuggestions) {
        // Default fallback content
        window.allSuggestions = {
            characters: ["Shadow the grey cat", "Sparkle the friendly dragon", "Max the brave puppy", "Lily the curious rabbit"],
            setting: ["A sunny garden", "A magical forest", "A cozy treehouse", "A secret cave"],
            moral: ["A story about friendship and helping others"]
        };
    }
    
    // Check if we've used all available suggestions
    const allCharactersUsed = window.usedSuggestions.characters.length >= window.allSuggestions.characters.length;
    const allSettingsUsed = window.usedSuggestions.setting.length >= window.allSuggestions.setting.length;
    const allMoralsUsed = window.usedSuggestions.moral.length >= window.allSuggestions.moral.length;
    
    if (allCharactersUsed && allSettingsUsed && allMoralsUsed) {
        // We've used all available suggestions
        showNotification("You've seen all available suggestions! Feel free to edit the text directly.", 'info');
        return;
    }
    
    // Find unused character suggestion
    if (!allCharactersUsed && window.allSuggestions.characters.length > 0) {
        const unusedCharacters = window.allSuggestions.characters.filter(
            char => !window.usedSuggestions.characters.includes(char)
        );
        
        if (unusedCharacters.length > 0) {
            const randomCharacter = unusedCharacters[Math.floor(Math.random() * unusedCharacters.length)];
            if (characterInput) {
                characterInput.value = randomCharacter;
                window.usedSuggestions.characters.push(randomCharacter);
            }
        }
    }
    
    // Find unused setting suggestion
    if (!allSettingsUsed && window.allSuggestions.setting.length > 0) {
        const unusedSettings = window.allSuggestions.setting.filter(
            setting => !window.usedSuggestions.setting.includes(setting)
        );
        
        if (unusedSettings.length > 0) {
            const randomSetting = unusedSettings[Math.floor(Math.random() * unusedSettings.length)];
            if (settingInput) {
                settingInput.value = randomSetting;
                window.usedSuggestions.setting.push(randomSetting);
            }
        }
    }
    
    // For moral/theme, we might not have multiple options, so just keep the existing one
    // or try to find a variation if possible
    if (!allMoralsUsed && window.allSuggestions.moral.length > 0) {
        const unusedMorals = window.allSuggestions.moral.filter(
            moral => !window.usedSuggestions.moral.includes(moral)
        );
        
        if (unusedMorals.length > 0) {
            const randomMoral = unusedMorals[Math.floor(Math.random() * unusedMorals.length)];
            if (themeInput) {
                themeInput.value = randomMoral;
                window.usedSuggestions.moral.push(randomMoral);
            }
        }
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.story-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'story-notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content and type
    notification.textContent = message;
    notification.className = `story-notification ${type}`;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Function to setup handlers for the simplified flow
function setupSimplifiedFlowHandlers(analysisData) {
    console.log('Setting up simplified flow handlers');
    
    // Setup character count handlers
    setupCharacterCounters();
    
    // "Looks good" button handler
    const looksGoodBtn = document.getElementById('looks-good-btn');
    if (looksGoodBtn) {
        looksGoodBtn.addEventListener('click', async function() {
            console.log('Looks good button clicked');
            
            // Disable the button while generating
            looksGoodBtn.disabled = true;
            looksGoodBtn.textContent = 'Creating...';
            
            try {
                // Get the story elements
                const character = document.getElementById('character').value.trim();
                const setting = document.getElementById('setting').value.trim();
                const theme = document.getElementById('theme').value.trim();
                
                console.log('Story inputs:', { character, setting, theme });
                
                if (!character || !setting || !theme) {
                    // Use notification instead of alert
                    showNotification('Please fill in all story elements before creating the story', 'error');
                    throw new Error('Please fill in all story elements before creating the story');
                }
                
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
                
                if (!data.success && !data.story) {
                    // Use notification instead of alert
                    showNotification(data.error || 'No story content received', 'error');
                    throw new Error(data.error || 'No story content received');
                }
                
                // Handle successful story generation
                showGeneratedStory(data);
                
            } catch (error) {
                console.error('Error in story creation:', error);
                // Don't show alert, we're using notifications now
            } finally {
                looksGoodBtn.disabled = false;
                looksGoodBtn.textContent = 'Looks good';
            }
        });
    }
    
    // "Show me other options" button handler
    const otherOptionsBtn = document.getElementById('other-options-btn');
    if (otherOptionsBtn) {
        otherOptionsBtn.addEventListener('click', function() {
            console.log('Show other options button clicked');
            showOtherOptions(analysisData);
        });
    }
}

// Function to setup character counters for input fields
function setupCharacterCounters() {
    const inputFields = [
        { input: 'character', counter: 'character-count' },
        { input: 'setting', counter: 'setting-count' },
        { input: 'theme', counter: 'theme-count' }
    ];
    
    inputFields.forEach(field => {
        const inputElement = document.getElementById(field.input);
        const counterElement = document.getElementById(field.counter);
        
        if (inputElement && counterElement) {
            // Update counter on initial load
            counterElement.textContent = inputElement.value.length;
            
            // Update counter on input
            inputElement.addEventListener('input', function() {
                const length = this.value.length;
                counterElement.textContent = length;
                
                // Add warning class when approaching limit
                const counterContainer = counterElement.parentElement;
                if (length >= 90) {
                    counterContainer.classList.add('limit-reached');
                } else {
                    counterContainer.classList.remove('limit-reached');
                }
                
                // Show warning when limit is reached
                if (length === 100) {
                    showNotification(`Maximum character limit reached for ${field.input}`, 'warning');
                }
            });
        }
    });
}

// Helper function to setup modal close handlers
function setupModalCloseHandlers(modal) {
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            resetModalState();
        });
    }

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            resetModalState();
        }
    });
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
    const screens = [
        'screen-kudos',
        'screen-character',
        'screen-setting',
        'screen-theme',
        'screen-review'
    ];
    
    // Only show progress bar for non-kudos screens
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        if (screenNumber === 0) {
            progressBar.style.display = 'none';
        } else {
            progressBar.style.display = 'block';
            progressBar.style.width = `${(screenNumber) * 25}%`; // 25% per screen (4 screens, excluding kudos)
        }
    }
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screens[screenNumber]);
    if (targetScreen) {
        console.log('Showing screen:', screens[screenNumber]);
        targetScreen.style.display = 'block';
        targetScreen.classList.add('active');
        updateStoryProgress(screens[screenNumber]);
        
        // Setup inspire button for the new screen if needed
        if (screenNumber > 0 && screenNumber < 4) { // Skip kudos and review screens
            setupInspireButton(window.currentAnalysisData);
        }
    } else {
        console.error('Target screen not found:', screens[screenNumber]);
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

    // Map screens to progress states (excluding kudos screen)
    const progressMap = {
        'screen-character': 1,
        'screen-setting': 2,
        'screen-theme': 3,
        'screen-review': 4
    };

    // Hide progress bar on kudos screen, show on others
    if (currentScreen === 'screen-kudos') {
        progressBar.style.display = 'none';
    } else {
        progressBar.style.display = 'block';
        const progress = progressMap[currentScreen] || 0;
        progressBar.setAttribute('data-progress', progress);
    }
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
        // Toggle show class instead of hidden
        suggestions.classList.toggle('show');
        suggestions.classList.toggle('hidden');
        
        if (suggestions.classList.contains('show')) {
            let suggestionItems = [];
            const storyElements = analysisData.analysis.story_elements;
            
            // Get suggestions based on current screen
            if (currentScreen.id === 'screen-character') {
                suggestionItems = storyElements.characters || [];
            } else if (currentScreen.id === 'screen-setting') {
                suggestionItems = storyElements.setting || [];
            } else if (currentScreen.id === 'screen-theme') {
                suggestionItems = Array.isArray(storyElements.moral) ? 
                    storyElements.moral : 
                    storyElements.moral.split('|');
            }
            
            suggestionItems = suggestionItems.map(item => item.trim()).filter(Boolean);
            console.log('Suggestion items:', suggestionItems);
            
            suggestions.innerHTML = suggestionItems.length ? 
                suggestionItems.map(item => `
                    <div class="suggestion-item" onclick="selectSuggestion('${item}')">
                        ${item}
                    </div>
                `).join('') :
                '<div class="no-suggestions">No suggestions available</div>';
        }
    });
}

function resetModalState() {
    if (FEATURES.SIMPLIFIED_ARTWORK_FLOW) {
        // For simplified flow, only reset legacy screens
        document.querySelectorAll('.legacy-screen').forEach((screen) => {
            screen.classList.add('hidden');
            screen.style.display = 'none';
        });
        
        // Don't hide the simplified screen
        const simplifiedScreen = document.getElementById('simplified-story-screen');
        if (simplifiedScreen) {
            simplifiedScreen.classList.remove('hidden');
        }
    } else {
        // Legacy behavior - reset all screens visibility
        document.querySelectorAll('.screen').forEach((screen) => {
            // All screens start hidden
            screen.classList.add('hidden');
            screen.style.display = 'none';
        });
    }

    // Reset suggestions
    document.querySelectorAll('.suggestions').forEach(suggestion => {
        suggestion.classList.add('hidden');
        suggestion.classList.remove('show');
    });

    // Reset inputs
    document.querySelectorAll('.story-input').forEach(input => {
        input.value = '';
    });
    
    // Reset progress bar to 20% (first of 5 screens)
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = '20%';
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

// Add this function to create the kudos screen
function createKudosScreen(comments) {
    const kudosScreen = document.createElement('div');
    kudosScreen.className = 'screen screen-kudos';
    kudosScreen.id = 'screen-kudos';
    
    const heading = document.createElement('h2');
    heading.textContent = 'Awesome Artwork!';
    kudosScreen.appendChild(heading);
    
    const kudosContent = document.createElement('div');
    kudosContent.className = 'kudos-content';
    
    // Handle comments array and select random comment
    let selectedComment;
    if (Array.isArray(comments) && comments.length > 0) {
        selectedComment = comments[Math.floor(Math.random() * comments.length)];
    } else if (typeof comments === 'string' && comments.length > 0) {
        const commentArray = comments.split('.').filter(comment => comment.trim());
        selectedComment = commentArray[Math.floor(Math.random() * commentArray.length)];
    }
    
    const kudosMessage = document.createElement('p');
    kudosMessage.className = 'kudos-message';
    
    if (selectedComment) {
        selectedComment = selectedComment.trim();
        if (!selectedComment.endsWith('.')) {
            selectedComment += '.';
        }
        kudosMessage.textContent = selectedComment;
    } else {
        kudosMessage.textContent = "Your drawing is amazing! Let's create a story about it!";
    }
    kudosContent.appendChild(kudosMessage);
    
    const kudosIcon = document.createElement('div');
    kudosIcon.className = 'kudos-icon';
    kudosIcon.innerHTML = '⭐';
    kudosContent.appendChild(kudosIcon);
    
    kudosScreen.appendChild(kudosContent);
    
    // Add button row for consistent layout
    const buttonRow = document.createElement('div');
    buttonRow.className = 'button-row';
    
    // Add next button using consistent class
    const nextBtn = document.createElement('button');
    nextBtn.className = 'next-btn'; // Remove extra classes to be consistent
    nextBtn.textContent = 'Next';
    nextBtn.onclick = () => goToScreen(1);
    
    buttonRow.appendChild(nextBtn);
    kudosScreen.appendChild(buttonRow);
    
    return kudosScreen;
}

// Store the last analysis result for caching
let lastAnalysisResult = null;