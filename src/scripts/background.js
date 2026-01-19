const CLIENT_ID = 'h2x6fqe7pc2f7qxitb3l5p34kx78bk';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "TWICH_LOGIN"){
        startTwitchLogin();
    }

    if(msg.type === "GET_7TV_EMOTES"){
        getEmotes().then(emotes => {
            sendResponse({ emotes });
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
    if(!emoteSet || Object.keys(emoteSet.emoteSet).length === 0){
        const userID = await chrome.storage.local.get("twitchUserID");
        if (!userID.twitchUserID) return;

        const response = await fetch(`https://7tv.io/v3/users/twitch/${userID.twitchUserID}`);
        const data = await response.json();
        const setID = data.emote_set.id;

        const setResponse = await fetch(`https://7tv.io/v3/emote-sets/${setID}`);
        const setData = await setResponse.json();

        var mappedEmotes = setData.emotes.map(e => ({
            name: e.name,
            url: `https:${e.data.host.url}/2x.webp`
        }));

        await chrome.storage.local.set({ emoteSet: mappedEmotes });

        return mappedEmotes;
    }

    return emoteSet.emoteSet;
}

async function fetch7tvAPI(){

}