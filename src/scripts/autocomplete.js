
// Function to wait for an element to appear in the DOM
/** @returns {Promise<Element>} */ 
function waitForElement(selector) {
    return new Promise((resolve, reject) => {
        // Check if element already exists
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations) => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

waitForElement('#contenteditable-root[contenteditable="true"]')
    .then(commentField => {
        console.log("Comment field found:", commentField);
        
        commentField.addEventListener('input', async (event) => {
            const cursorPosition = commentField.selectionStart;
            const textBeforeCursor = commentField.innerHTML.substring(0, cursorPosition);
            const match = textBeforeCursor.match(/:([a-zA-Z0-9_]{2,})$/);

            if (match) {
                const query = match[1];
                const response = await chrome.runtime.sendMessage({ type: 'GET_EMOTE_SUGGESTIONS', query: query });
                const suggestions = response.suggestions;
                console.log("Emote suggestions for query", query, ":", suggestions);
                
                const dropdown = document.querySelector('tp-yt-iron-dropdown#dropdown.style-scope.ytd-emoji-input');

                console.log("Dropdown element:", dropdown);

                // Here you would typically show the suggestions in a dropdown UI
                const dropdownContent = dropdown.querySelector('.dropdown-content');
                suggestions.forEach(element => {
                    let suggestionElement = dropdownContent.appendChild(document.createElement('ytd-emoji-suggestion'));
                    suggestionElement.classList.add('style-scope', 'ytd-emoji-input');
                    
                    let item = suggestionElement.appendChild(document.createElement('tp-yt-paper-item'));
                    item.classList.add('style-scope', 'ytd-emoji-suggestion');
                    item.setAttribute('style-target', "host");
                    item.setAttribute('role', "option");
                    item.setAttribute('tabindex', "0");
                    item.setAttribute('aria-disabled', "false");

                    let img = item.appendChild(document.createElement('img'));
                    img.classList.add('style-scope', 'ytd-emoji-suggestion');
                    img.src = element.url;
                    img.alt = `:${element.name}:`;

                    item.appendChild(document.createTextNode(` :${element.name}: `));

                    suggestionElement.addEventListener('click', () => {
                        const beforeEmote = textBeforeCursor.slice(0, match.index);
                        const afterCursor = commentField.innerHTML.substring(cursorPosition);

                        commentField.innerHTML = beforeEmote + `<img src="${element.url}" alt=":${element.name}:" />` + afterCursor;
                        commentField.focus();

                        const newCursorPosition = beforeEmote.length + element.name.length + 2;
                        const range = document.createRange();
                        const sel = window.getSelection();
                        
                        range.setStart(commentField.childNodes[0], newCursorPosition);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    });
                });

            } else {
                // Hide suggestions dropdown if no match
                console.log("No emote trigger found before cursor.");
            }

        });

        commentField.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                // Logic to navigate suggestions would go here
                const dropdown = document.querySelector('tp-yt-iron-dropdown#dropdown.style-scope.ytd-emoji-input');
                console.log("Navigate suggestions in dropdown:", dropdown);
                
            }
        });
    })
    .catch(error => {
        console.error("Failed to find comment field:", error);
    });