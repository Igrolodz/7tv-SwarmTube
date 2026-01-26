const CLIENT_ID = 'h2x6fqe7pc2f7qxitb3l5p34kx78bk';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "TWITCH_LOGIN"){
        startTwitchLogin();
    }

    if(msg.type === "GET_7TV_EMOTES"){
        getEmotes().then(emotes => {
            sendResponse({ emotes });
        });
    }

    if(msg.type === "RELOAD_7TV_EMOTES"){
        reloadEmotes().then(() => {
            sendResponse({ success: true });
        });
    }
    if(msg.type === "GET_EMOTE_SUGGESTIONS"){
        getEmoteSuggestions(msg.query, msg.pickerContext).then(suggestions => {
            sendResponse({ suggestions });
        });
    }

    return true;
});

function startTwitchLogin() {
    const redirectUri = chrome.identity.getRedirectURL();

    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=user:read:email`;

    chrome.identity.launchWebAuthFlow(
        {
            url: authUrl,
            interactive: true
        },
        handleAuthRedirect
    );
}

function handleAuthRedirect(redirectUrl) {
    if (!redirectUrl) return;

    const hash = new URL(redirectUrl).hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');

    if (!accessToken) return;

    const expiryTime = Date.now() + 60 * 24 * 60 * 60 * 1000;
    chrome.storage.local.set({
        twitchAccessToken: accessToken,
        twitchTokenExpiry: expiryTime
    });
}

async function getEmotes(){
    const emoteSet = await chrome.storage.local.get(['emoteSet']);
    if(!emoteSet || !emoteSet.emoteSet || Object.keys(emoteSet.emoteSet).length === 0){
        
        await reloadEmotes();
        return mappedEmotes;
    }

    return emoteSet.emoteSet;
}

async function reloadEmotes(){
    const userID = await chrome.storage.local.get("twitchUserID");
    
    if (!userID.twitchUserID) userID.twitchUserID = "85498365"; // Default to Nurstreamer

    const [globalRes, streamerRes] = await Promise.all([
        fetch('https://7tv.io/v3/emote-sets/global'),
        fetch(`https://7tv.io/v3/users/twitch/${userID.twitchUserID}`),
    ]);
    const globalData = await globalRes.json();
    const streamerData = await streamerRes.json();
    
    
    const streamerSetID = streamerData.emote_set_id;
    const setResponse = await fetch(`https://7tv.io/v3/emote-sets/${streamerSetID}`);
    const streamerSetData = await setResponse.json();

    const allEmotes = [
        ...globalData.emotes,
        ...streamerSetData.emotes
    ]

    const emoteSize = await chrome.storage.local.get("emoteSize");
    if (!emoteSize.emoteSize || emoteSize.emoteSize === 1) emoteSize.emoteSize = 2;

    var mappedEmotes = allEmotes.map(e => ({
        name: e.name,
        url: `https:${e.data.host.url}/${emoteSize.emoteSize-1}x.webp`
    }));

    await chrome.storage.local.set({ emoteSet: mappedEmotes });
}

async function getEmoteSuggestions(query, pickerContext = false) {
    const emoteSet = await getEmotes();
    
    const normalizedQuery = normalize(query);
    
    // Fuzzy search time baby
    const scoredEmotes = emoteSet.map(emote => {
        const normalizedName = normalize(emote.name);
        const score = fuzzyScore(normalizedQuery, normalizedName);
        return { ...emote, score };
    });
    
    // Filter out non-matches and sort by score
    const suggestions = scoredEmotes
        .filter(emote => emote.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, pickerContext ? 999 : 25);
    
    return suggestions;
}

function fuzzyScore(query, text) {
    if (!query) return 0;
    if (text.includes(query)) return 100 + (100 - text.indexOf(query));
    
    let score = 0;
    let queryIndex = 0;
    let lastMatchIndex = -1;
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
        if (text[i] === query[queryIndex]) {
            score += 10;
            // Bonus for consecutive matches
            if (lastMatchIndex === i - 1) {
                score += 5;
            }
            // Bonus for matching at start
            if (queryIndex === 0 && i === 0) {
                score += 20;
            }
            lastMatchIndex = i;
            queryIndex++;
        }
    }
    
    return queryIndex === query.length ? score : 0;
}

function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}