const CLIENT_ID = 'h2x6fqe7pc2f7qxitb3l5p34kx78bk';

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TWICH_LOGIN"){
        startTwitchLogin();
    }
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