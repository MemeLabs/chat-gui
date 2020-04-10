import Chat from "./chat/js/chat";
import emotes from "./emotes.json";

$.when(
    new Promise(res =>
        $.getJSON(`${API_URI}/api/chat/me`)
            .done(res)
            .fail(() => res(null))
    ),
    new Promise(res =>
        $.getJSON(`${API_URI}/api/chat/history`)
            .done(res)
            .fail(() => res(null))
    ),
    new Promise(res =>
        $.getJSON(`${API_URI}/api/chat/viewer-states`)
            .done(res)
            .fail(() => res([]))
    )
).then(
    (userAndSettings, history, viewerStates) =>
        (window.__chat__ = new Chat()
            .withUserAndSettings(userAndSettings)
            .withEmotes(emotes)
            .withGui()
            .withViewerStates(viewerStates)
            .withHistory(history)
            .withWhispers()
            .connect(WEBSOCKET_URI))
);
