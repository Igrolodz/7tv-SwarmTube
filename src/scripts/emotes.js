var emoteSet = [];
var excludedEmotes = [];
var emoteSize = 2;
var enabled = true;

console.log("Content script loaded.");
async function loadEmotes(){
    enabled = await chrome.storage.local.get("enabled");
    if (!enabled || enabled.enabled === undefined) {
        enabled = { enabled: true };
        await chrome.storage.local.set(enabled);
    }
    if (!enabled.enabled) return;

    const response = await chrome.runtime.sendMessage({ type: 'GET_7TV_EMOTES' });
    emoteSet = response.emotes;
    console.log("Loaded emotes:", emoteSet);
    const excluded = await chrome.storage.local.get("excludedEmotes");
    const size = await chrome.storage.local.get("emoteSize");
    emoteSize = size.emoteSize || 2;
    excludedEmotes = excluded.excludedEmotes || [];
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

observer.observe(document.body, { childList: true, subtree: true });


async function processComment(element) {
    processTextNodes(element);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processTextNodes(node) {
    if (node.hasAttribute && node.hasAttribute('data-emotes-processed')) return;
    
    const walk = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let currentNode;
    while (currentNode = walk.nextNode()) {
        textNodes.push(currentNode);
    }

    textNodes.forEach(textNode => {
        let text = textNode.textContent;
        let newHTML = text;
        let hasEmote = false;

        emoteSet.forEach((emote) => {
            if (excludedEmotes.includes(emote.name)) return;
            
            const escapedName = escapeRegExp(emote.name);
            const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
            if (regex.test(newHTML)) {
                hasEmote = true;
                const heightStyle = emoteSize === 1 ? "height: 24px;" : "";
                const imgTag = `<img src="${emote.url}" title="${emote.name}" style="vertical-align: bottom; ${heightStyle}">`;
                newHTML = newHTML.replace(regex, imgTag);
            }
        });

        if (hasEmote) {
            const temp = document.createElement('span');
            temp.innerHTML = newHTML;
            
            const parent = textNode.parentNode;
            while (temp.firstChild) {
                parent.insertBefore(temp.firstChild, textNode);
            }
            parent.removeChild(textNode);
        }
    });
    
    if (node.setAttribute) {
        node.setAttribute('data-emotes-processed', 'true');
    }
}