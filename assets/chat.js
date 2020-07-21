import Chat from "./chat/js/chat";
import emotes from "./emotes.json";

const init = async v => {
    const userInfo = async v => await new Promise(res => $.getJSON(`${API_URI}/api/chat/me`).done(res).fail(() => res(null)));
    const history = async v => await new Promise(res => $.getJSON(`${API_URI}/api/chat/history`).done(res).fail(() => res(null)));
    const viewerStates = async v => await new Promise(res => $.getJSON(`${API_URI}/api/chat/viewer-states`).done(res).fail(() => res(null)));

    const promiseSync = await Promise.all([userInfo(), history(), viewerStates()]);
    
    const chat = new Chat();
    window.__chat__ = chat; // I do not know why this is needed but included it if an app depends on it
    await chat.withGui()
    .then(async() => await Promise.all([chat.withUserAndSettings(promiseSync[0]), chat.withEmotes(emotes), chat.withViewerStates(promiseSync[2]), chat.withHistory(promiseSync[1]), chat.withWhispers()]))
    .then(() => chat.connect(WEBSOCKET_URI))
}

init();
