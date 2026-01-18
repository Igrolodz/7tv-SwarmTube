const toggleBtn = document.getElementById("toggle");
const setNameBtn = document.getElementById("twitch-name-set");
const exEmoteBtn = document.getElementById("excluded-emotes-set");
const emoteListBtn = document.getElementById("emote-list");

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

setNameBtn.addEventListener("click", async () => {
    const { twitchAccessToken, twitchTokenExpiry } = await chrome.storage.local.get(["twitchAccessToken", "twitchTokenExpiry"]);
    
    if (!twitchAccessToken || Date.now() >= twitchTokenExpiry){
        // Trigger Twitch login
        console.log("Starting Twitch login...");
        chrome.runtime.sendMessage({ type: "TWICH_LOGIN" });
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

exEmoteBtn.addEventListener("click", async() => {
    const excludedEmote = document.getElementById("excluded-emotes").value;
    const { excludedEmotes = [] } = await chrome.storage.local.get("excludedEmotes");

    excludedEmotes.push(excludedEmote);
    await chrome.storage.local.set({excludedEmotes: excludedEmotes});
});

emoteListBtn.addEventListener("click", async() => {
    chrome.windows.create({
        url: chrome.runtime.getURL("excluded.html"),
        type: "popup",
        width: 420,
        height: 600
    });
});