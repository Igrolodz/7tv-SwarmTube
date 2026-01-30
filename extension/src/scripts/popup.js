const toggleBtn = document.getElementById("toggle");
const setNameBtn = document.getElementById("twitch-name-set");
const exEmoteBtn = document.getElementById("excluded-emotes-set");
const emoteListBtn = document.getElementById("emote-list");
const emoteSizeInput = document.getElementById("emote-size");
const refreshEmotesBtn = document.getElementById("refresh-emotes");

// Initialize toggle state
chrome.storage.local.get("enabled").then(({ enabled }) => {
    if (!enabled && enabled !== false) {
        enabled = true;
        chrome.storage.local.set({ enabled: true });
    }
    
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

chrome.storage.local.get("emoteSize").then(({ emoteSize }) => {
    if (!emoteSize) {
        emoteSize = 2;
        chrome.storage.local.set({ emoteSize: 2 });
    }
    emoteSizeInput.value = emoteSize;
    const sizeValue = document.getElementById("size-value");
    sizeValue.textContent = `${emoteSize}x`;
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

setNameBtn.addEventListener("click", async () => {
    const { twitchAccessToken, twitchTokenExpiry } = await chrome.storage.local.get(["twitchAccessToken", "twitchTokenExpiry"]);
    
    if (!twitchAccessToken || Date.now() >= twitchTokenExpiry){
        chrome.runtime.sendMessage({ type: "TWITCH_LOGIN" });
        return;
    }

    const twitchName = document.getElementById("twitch-name");
    if (!twitchName.value){
        twitchName.value = "INVALID NAME!";
        setTimeout(() => {
            twitchName.value = "";
        }, 1000);
        return;
    }

    try {
        const response = await fetch(`https://api.twitch.tv/helix/users?login=${twitchName.value}`, {
            method: 'GET',
            headers: {
                'Client-ID': 'h2x6fqe7pc2f7qxitb3l5p34kx78bk',
                'Authorization': `Bearer ${twitchAccessToken}`
            }
        });
        const data = await response.json();
        
        await chrome.storage.local.set({twitchName: twitchName.value, twitchUserID: data.data[0].id});

        twitchName.value = "Saved!";
        setTimeout(() => {
            twitchName.value = "";
        }, 1000);
        
    } catch (error) {
        twitchName.value = "INVALID!";
        console.error(`Error fetching Twitch user: ${error}`);

        setTimeout(() => {
            twitchName.value = "";
        }, 1000);
        return;
    }


});

exEmoteBtn.addEventListener("click", async () => {
    const excludedEmoteField = document.getElementById("excluded-emotes");
    var excludedEmote = excludedEmoteField.value;
    const { excludedEmotes = [] } = await chrome.storage.local.get("excludedEmotes");

    if (!excludedEmote || excludedEmotes.includes(excludedEmote)){
        excludedEmoteField.value = "INVALID OR ALREADY EXCLUDED!";
        setTimeout(() => {
            excludedEmoteField.value = "";
        }, 1000);
        return;
    }

    excludedEmotes.push(excludedEmote);
    await chrome.storage.local.set({excludedEmotes: excludedEmotes});
    
    excludedEmoteField.value = "Saved!";
    setTimeout(() => {
        excludedEmoteField.value = "";
    }, 1000);
});

emoteListBtn.addEventListener("click", async () => {
    chrome.windows.create({
        url: chrome.runtime.getURL("src/templates/excluded.html"),
        type: "popup",
        width: 420,
        height: 600
    });
});

emoteSizeInput.addEventListener("input", async () => {
    const sizeValue = document.getElementById("size-value");
    sizeValue.textContent = `${emoteSizeInput.value}x`;
    await chrome.storage.local.set({emoteSize: parseInt(emoteSizeInput.value)});
});


refreshEmotesBtn.addEventListener("click", async () => {
    refreshEmotesBtn.textContent = "Reloading...";
    var response = await chrome.runtime.sendMessage({ type: "RELOAD_7TV_EMOTES" });
    if (response.success){
        refreshEmotesBtn.textContent = "Success!";
        setTimeout(() => {
            refreshEmotesBtn.textContent = "Reload Emotes";
        }, 2000);
    }
    else{
        refreshEmotesBtn.textContent = "Error!";
        setTimeout(() => {
            refreshEmotesBtn.textContent = "Reload Emotes";
        }, 2000);
    }
});