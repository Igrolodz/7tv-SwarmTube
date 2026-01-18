const toggleBtn = document.getElementById("toggle");

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

var state = true;
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