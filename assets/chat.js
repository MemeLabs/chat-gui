import Chat from './chat/js/chat';
import emotes from './emotes.json';


$.when(
    new Promise(res => $.getJSON(`${API_URI}/api/chat/me`).done(res).fail(() => res(null))),
    new Promise(res => $.getJSON(`${API_URI}/api/chat/history`).done(res).fail(() => res(null)))
).then((userAndSettings, history) =>
    new Chat()
        .withUserAndSettings(userAndSettings)
        .withEmotes(emotes)
        .withGui()
        .withHistory(history)
        .withWhispers()
        .connect(WEBSOCKET_URI)
)
