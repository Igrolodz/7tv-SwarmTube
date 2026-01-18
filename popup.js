const toggleBtn = document.getElementById("toggle");
const setNameBtn = document.getElementById("twitch-name-set");
const exEmoteBtn = document.getElementById("excluded-emotes-set");

// Initialize toggle state
chrome.storage.local.get("enabled").then(({ enabled }) => {
    if (enabled) {
        toggleBtn.classList.remove("off");
        toggleBtn.classList.add("on");
    } else {
        toggleBtn.classList.remove("on");
        toggleBtn.classList.add("off");
    }
});

chrome.storage.local.get("twitchName").then(({ twitchName }) => {
    if (twitchName) {
        document.getElementById("twitch-name").value = twitchName;
    }
});

toggleBtn.addEventListener("click", async () => {
    const { enabled } = await chrome.storage.local.get("enabled");
    const newState = !(enabled ?? false);
    
    await chrome.storage.local.set({enabled: newState});

    // Toggle classes
    if (newState) {
        toggleBtn.classList.remove("off");
        toggleBtn.classList.add("on");
    } else {
        toggleBtn.classList.remove("on");
        toggleBtn.classList.add("off");
    }
});

setNameBtn.addEventListener("click", async() => {
    const twitchName = document.getElementById("twitch-name").value;
    await chrome.storage.local.set({twitchName: twitchName});
});

exEmoteBtn.addEventListener("click", async() => {
    const excludedEmote = document.getElementById("excluded-emotes").value;
    const { excludedEmotes = [] } = await chrome.storage.local.get("excludedEmotes");
    
    excludedEmotes.push(excludedEmote);
    await chrome.storage.local.set({excludedEmotes: excludedEmotes});
});