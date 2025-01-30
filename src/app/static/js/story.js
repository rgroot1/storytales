console.log('Script starting...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    // More Options button
    const moreOptionsBtn = document.getElementById('tell-more-btn');
    console.log('More Options button:', moreOptionsBtn);
    moreOptionsBtn.addEventListener('click', function() {
        console.log('More Options clicked');
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

    // Generate Story button
    const generateBtn = document.getElementById('generate-btn');
    console.log('Generate button:', generateBtn);
    generateBtn.addEventListener('click', async function() {
        console.log('Generate clicked');
        const mainPrompt = document.getElementById('mainPrompt').value.trim();
        const ageGroup = document.getElementById('ageGroup').value;
        
        if (!mainPrompt) {
            alert('Please tell us about your hero\'s adventure!');
            return;
        }
        
        generateBtn.disabled = true;
        generateBtn.textContent = 'Creating your story...';
        
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
                    vibe: document.getElementById('vibe')?.value.trim() || ''
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate story');
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
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Story';
        }
    });
}); 