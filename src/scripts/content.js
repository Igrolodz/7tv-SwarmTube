var emoteSet = [];

async function loadEmotes(){
    const response = await chrome.runtime.sendMessage({ type: 'GET_7TV_EMOTES' });
    emoteSet = response.emotes;
    console.log("Loaded emote set:", emoteSet);
}

loadEmotes();

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { 

                const comments = node.querySelectorAll('#content-text');
                comments.forEach(commentElement => {
                    processComment(commentElement);
                });
            }
        });
    }
});

// Start watching the entire body for changes in the structure
observer.observe(document.body, { childList: true, subtree: true });


async function processComment(element) {
    let text = element.innerText;
    let hasEmote = false;

    console.log("Processing comment:", text);
    emoteSet.forEach((emote) => {
        const regex = new RegExp(`\\b${emote.name}\\b`, 'g');
        if (regex.test(text)) {
            hasEmote = true;
            // Replace text name with an HTML image string
            const imgTag = `<img src="${emote.url}" title="${emote.name}" style="height: 24px; vertical-align: bottom;">`;
            text = text.replace(regex, imgTag);
        }
    });

    if (hasEmote) {
        element.innerHTML = text;
    }
}