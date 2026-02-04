var emoteSet = [];
var excludedSet = [];

/**
 * @type {typeof chrome}
 */
const ext = typeof browser === "undefined" ? chrome : browser;

const REMOVESVGICO = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;

async function getEmotes(){
    emoteSet = await new Promise((resolve) => {
        ext.runtime.sendMessage({ type: "GET_7TV_EMOTES" }, (response) => {
            resolve(response.emotes);
        });
    });
    excludedSet = await ext.storage.local.get("excludedEmotes");
}

async function setList(){
    const emoteTableField = document.getElementById("emote-list");
    
    excludedSet.excludedEmotes.forEach(element => {
        const emoteData = emoteSet.find(emote => emote.name === element);
        if(!emoteData) {
            excludedSet.excludedEmotes = excludedSet.excludedEmotes.filter(name => name !== element);
            ext.storage.local.set({ excludedEmotes: excludedSet.excludedEmotes });
            return;
        }

        const emoteRow = emoteTableField.appendChild(document.createElement("tr"));
        
        const emoteImageCell = emoteRow.appendChild(document.createElement("td"));
        const emoteImg = emoteImageCell.appendChild(document.createElement("img"));
        emoteImageCell.className = "emote-image-cell";
        emoteImg.src = emoteData.url;
        emoteImg.alt = emoteData.name;
        
        const emoteCell = emoteRow.appendChild(document.createElement("td"));
        emoteCell.className = "emote-name-cell";
        emoteCell.innerHTML += `${element}`;

        const emoteRemoveCell = emoteRow.appendChild(document.createElement("td"));
        const emoteRemoveBtn = emoteRemoveCell.appendChild(document.createElement("div"));
        emoteRemoveBtn.className = "emote-remove-btn";
        emoteRemoveBtn.innerHTML = REMOVESVGICO;
        
        emoteRemoveBtn.addEventListener("click", async () => {
            await removeEmote(element);
            emoteTableField.removeChild(emoteRow);
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await getEmotes();
    await setList();
});

async function removeEmote(emoteName){
    excludedSet.excludedEmotes = excludedSet.excludedEmotes.filter(name => name !== emoteName);
    await ext.storage.local.set({ excludedEmotes: excludedSet.excludedEmotes });
}


window.addEventListener("blur", () => {
    window.close();
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        window.close();
    }
});