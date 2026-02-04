// fuck Youtube DOM. Shit so complicated I had to start doing comments 💀

// Track initialized comment fields to avoid duplicate setup
const initializedFields = new WeakSet();

// Function to initialize a single comment field
function initializeCommentField(commentField) {
    if (initializedFields.has(commentField)) {
        return;
    }
    initializedFields.add(commentField);
    let activeIndex = -1;
    let currentSuggestions = [];

    const dropdown = document.querySelector('tp-yt-iron-dropdown#dropdown.style-scope.ytd-emoji-input');

    commentField.addEventListener('input', async (event) => {
        
        // Get cursor position
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(commentField);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        const cursorPosition = preCaretRange.toString().length;
        
        const textBeforeCursor = commentField.textContent.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/:([a-zA-Z0-9_]{2,})$/);

        if (match) {
            const query = match[1];
            const response = await ext.runtime.sendMessage({ type: 'GET_EMOTE_SUGGESTIONS', query: query });
            const suggestions = response.suggestions;                

            dropdown.style.display = "";
            
            // Clear all suggestions (native and custom)
            const dropdownContent = dropdown.querySelector('.dropdown-content');
            dropdownContent.innerHTML = '';
            
            currentSuggestions = [];
            
            // Position dropdown at cursor and style
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Styling for dropdown
                dropdown.style.position = 'fixed';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.top = (rect.bottom + 5) + 'px';
                dropdown.style.zIndex = '9999';
                dropdown.style.maxHeight = '200px';
                dropdown.style.width = '300px';
                dropdown.style.overflowY = 'auto';

                dropdownContent.style.maxHeight = '200px';
                dropdownContent.style.maxWidth = '';
                dropdownContent.style.width = '300px';
                dropdownContent.style.overflowY = 'auto';
            }

            // custom suggestrions
            suggestions.forEach((element, index) => {
                let suggestionElement = dropdownContent.appendChild(document.createElement('ytd-emoji-suggestion'));
                suggestionElement.classList.add('style-scope', 'ytd-emoji-input');
                currentSuggestions.push({ element: suggestionElement, data: element });
                
                let item = suggestionElement.appendChild(document.createElement('tp-yt-paper-item'));
                item.classList.add('style-scope', 'ytd-emoji-suggestion');
                item.setAttribute('style-target', "host");
                item.setAttribute('role', "option");
                item.setAttribute('tabindex', "0");
                item.setAttribute('aria-disabled', "false");

                let img = item.appendChild(document.createElement('img'));
                img.src = element.url;
                img.alt = `:${element.name}:`;
                img.style.maxHeight = "64px";
                img.style.maxWidth = "";

                item.appendChild(document.createTextNode(` ${element.name} `));

                suggestionElement.addEventListener('click', () => {
                    const beforeEmote = textBeforeCursor.slice(0, match.index);
                    const afterCursor = commentField.textContent.substring(match.index + match[0].length);

                    commentField.textContent = beforeEmote + element.name + afterCursor;
                    commentField.focus();

                    const newCursorPosition = beforeEmote.length + element.name.length + 2;
                    const range = document.createRange();
                    const sel = window.getSelection();
                    
                    range.setStart(commentField.childNodes[0], newCursorPosition);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                });

                activeIndex = 0;
                currentSuggestions[activeIndex].element.setAttribute('active', '');
            });

        } else {
            // Hide suggestions dropdown if no match
            dropdown.style.display = "none";
            currentSuggestions = [];
            activeIndex = -1;
        }

    });

    commentField.addEventListener('keydown', (e) => {
        const dropdown = document.querySelector('tp-yt-iron-dropdown#dropdown.style-scope.ytd-emoji-input');
        
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && currentSuggestions.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove active attribute from ALL elements in dropdown
            if (dropdown) {
                const allEmotes = dropdown.querySelectorAll('ytd-emoji-suggestion');
                allEmotes.forEach(el => el.removeAttribute('active'));
            }
            
            // Update active index
            if (e.key === 'ArrowDown') {
                activeIndex = (activeIndex + 1) % currentSuggestions.length;
            } else if (e.key === 'ArrowUp') {
                activeIndex = activeIndex <= 0 ? currentSuggestions.length - 1 : activeIndex - 1;
            }
            
            // Set active attribute on new active element
            currentSuggestions[activeIndex].element.setAttribute('active', '');
            
            // Scroll the active element into view
            currentSuggestions[activeIndex].element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        } else if ((e.key === 'Enter' || e.key === 'Tab') && activeIndex >= 0 && activeIndex < currentSuggestions.length) {
            e.preventDefault();
            e.stopPropagation();
            
            // Select the active suggestion
            const selectedEmote = currentSuggestions[activeIndex].data;
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(commentField);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            const cursorPosition = preCaretRange.toString().length;
            
            const textBeforeCursor = commentField.textContent.substring(0, cursorPosition);
            const match = textBeforeCursor.match(/:([a-zA-Z0-9_]{2,})$/);
            
            if (match) {
                const beforeEmote = textBeforeCursor.slice(0, match.index);
                const afterCursor = commentField.textContent.substring(match.index + match[0].length);

                commentField.textContent = beforeEmote + selectedEmote.name + afterCursor +" ";
                commentField.focus();

                const newCursorPosition = beforeEmote.length + selectedEmote.name.length + 1;
                const range = document.createRange();
                const sel = window.getSelection();
                
                range.setStart(commentField.childNodes[0], newCursorPosition);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                
                // Clear suggestions
                currentSuggestions = [];
                activeIndex = -1;
                dropdown.style.display = "none";
            }
        }
    });

    // Hide dropdown when clicking outside or losing focus
    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (!selection.rangeCount || !dropdown) return;
        
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // Check if selection is outside the comment field
        const isInsideCommentField = commentField.contains(container) || commentField === container;
        
        if (!isInsideCommentField && currentSuggestions.length > 0) {
            dropdown.style.display = "none";
            currentSuggestions = [];
            activeIndex = -1;
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown) return;
        
        const isClickInside = commentField.contains(e.target) || dropdown.contains(e.target);
        
        if (!isClickInside && currentSuggestions.length > 0) {
            dropdown.style.display = "none";
            currentSuggestions = [];
            activeIndex = -1;
        }
    });
}

// Continuously monitor for new comment fields
const commentFieldObserver = new MutationObserver((mutations) => {
    const commentFields = document.querySelectorAll('#contenteditable-root[contenteditable="true"]');
    commentFields.forEach(field => {
        initializeCommentField(field);
    });
});

commentFieldObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Initialize any existing fields
const existingFields = document.querySelectorAll('#contenteditable-root[contenteditable="true"]');
existingFields.forEach(field => {
    initializeCommentField(field);
});