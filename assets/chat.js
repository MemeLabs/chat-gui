import Chat from "./chat/js/chat";
import emotes from "./emotes.json";

$.when(
    new Promise(resolve =>
        $.getJSON(`${API_URI}/api/chat/me`)
            .done(resolve)
            .fail(() => resolve(null))
    ),
    new Promise(resolve =>
        $.getJSON(`${API_URI}/api/chat/history`)
            .done(resolve)
            .fail(() => resolve(null))
    ),
    new Promise(resolve =>
        $.getJSON(`${API_URI}/api/chat/viewer-states`)
            .done(resolve)
            .fail(() => resolve([]))
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
