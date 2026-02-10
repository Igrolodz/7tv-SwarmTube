const CLIENT_ID = 'h2x6fqe7pc2f7qxitb3l5p34kx78bk'; // Twitch Client ID for API calls

/** @type {typeof chrome} */
const ext =  typeof browser === "undefined" ? chrome : browser;

ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
    const redirectUri = ext.identity.getRedirectURL();
    console.log('Redirect URI:', redirectUri); // Debug: Check this value!

    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=user:read:email`;

    ext.identity.launchWebAuthFlow(
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
    ext.storage.local.set({
        twitchAccessToken: accessToken,
        twitchTokenExpiry: expiryTime
    });
}

async function getEmotes(){
    const emoteSet = await ext.storage.local.get(['emoteSet']);
    if(!emoteSet || !emoteSet.emoteSet || Object.keys(emoteSet.emoteSet).length === 0){
        return await reloadEmotes();
    }

    return emoteSet.emoteSet;
}

async function reloadEmotes(){
    const userID = await ext.storage.local.get("twitchUserID");
    if (!userID.twitchUserID) userID.twitchUserID = "85498365"; // Default to Nurstreamer

    const [globalRes, streamerRes] = await Promise.all([
        fetch('https://7tv.io/v3/emote-sets/global'),
        fetch(`https://7tv.io/v3/users/twitch/${userID.twitchUserID}`)
    ]);

    // 7TV stuff
    const globalData = await globalRes.json();
    const streamerData = await streamerRes.json();
    
    const streamerSetID = streamerData.emote_set_id;
    const setResponse = await fetch(`https://7tv.io/v3/emote-sets/${streamerSetID}`);
    const streamerSetData = await setResponse.json();
    
    const all7TVEmotes = [
        ...globalData.emotes,
        ...streamerSetData.emotes,
    ];
    
    // Twitch stuff
    const twitchEnabled = await ext.storage.local.get("twitchEnabled");
    var allTwitchEmotes = [];
    
    if (twitchEnabled.twitchEnabled){
        const twitchAccessToken = await ext.storage.local.get("twitchAccessToken");
        if (!twitchAccessToken.twitchAccessToken) {
            startTwitchLogin();
            return;
        }

        const [twitchChannelRes, twitchGlobalRes] = await Promise.all([
            fetch(`https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${userID.twitchUserID}`, {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${twitchAccessToken.twitchAccessToken}`
                }
            }),
            fetch(`https://api.twitch.tv/helix/chat/emotes/global`, {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${twitchAccessToken.twitchAccessToken}`
                }
            })
        ]);
    
        const twitchChannelData = await twitchChannelRes.json();
        const twitchGlobalData = await twitchGlobalRes.json();
    
        allTwitchEmotes = [
            ...twitchChannelData.data,
            ...twitchGlobalData.data,
        ];
    }
    
    // Exceptional emotes of superiority
    const specialEmotes = [
        {
            name: "NeuroJAM",
            id: "emotesv2_16862a2d50724c34b78499f3c094ce47"
        },
        {
            name: "EvilJAM",
            id: "emotesv2_c3134ab06c334403a7691d3ef58441d1"
        },
        {
            name: "ShouldiCelebrate",
            id: "emotesv2_3cef4c51d4aa45be822ee327f97650a0"
        }
    ];
    allTwitchEmotes.push(...specialEmotes);

    
    const emoteSize = await ext.storage.local.get("emoteSize");
    if (!emoteSize.emoteSize || emoteSize.emoteSize === 1) emoteSize.emoteSize = 2;

    const mappedEmotes = all7TVEmotes.map(e => ({
        name: e.name,
        url: `https:${e.data.host.url}/${emoteSize.emoteSize-1}x.webp`
    }));

    const twitchMappedEmotes = allTwitchEmotes.map(e => ({
        name: e.name,
        url: `https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/default/dark/${emoteSize.emoteSize-1}.0`
    }));

    const allMappedEmotes = [...mappedEmotes, ...twitchMappedEmotes];

    await ext.storage.local.set({ emoteSet: allMappedEmotes });
    return allMappedEmotes;
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