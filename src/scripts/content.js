var emoteSet = [];
var excludedEmotes = [];

async function loadEmotes(){
    var enabled = await chrome.storage.local.get("enabled");
    if (!enabled.enabled) return;

    const response = await chrome.runtime.sendMessage({ type: 'GET_7TV_EMOTES' });
    emoteSet = response.emotes;
    console.log("Loaded emote set:", emoteSet);

    const excluded = await chrome.storage.local.get("excludedEmotes");
    excludedEmotes = excluded.excludedEmotes || [];
    console.log("Loaded excluded emotes:", excludedEmotes);
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
    let text = element.innerText;
    let hasEmote = false;

    console.log("Processing comment:", text);
    
    // Split text to preserve timestamps (e.g., 1:23, 6:07)
    const parts = text.split(/(\d+:\d+(?::\d+)?)/g);
    
    const processedParts = parts.map((part, index) => {
        if (index % 2 === 1) {
            return part;
        }
        
        let processedPart = part;
        emoteSet.forEach((emote) => {
            if (excludedEmotes.includes(emote.name)) return;
            
            const regex = new RegExp(`\\b${emote.name}\\b`, 'g');
            if (regex.test(processedPart)) {
                hasEmote = true;
                const imgTag = `<img src="${emote.url}" title="${emote.name}" style="height: 24px; vertical-align: bottom;">`;
                processedPart = processedPart.replace(regex, imgTag);
            }
        });
        
        return processedPart;
    });

    if (hasEmote) {
        element.innerHTML = processedParts.join('');
    }
}