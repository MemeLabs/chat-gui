// Access dev chat on dev build "./dev/dev-chat.html"

// mockStream needs to be imported before Chat to mock the global WebSocket.
import MockStream from "./messages/MockStream";
import tests from "./tests";

import emotes from "../../emotes.json";
import settings from "./settings.json";
import Chat from "../../chat/js/chat";

document.title = "Offline Dev Chat - FOR TESTING ONLY";

const username = "TopTierMemer98";
const mockStream = new MockStream({ username });

window.mockStream = mockStream;
window.tests = tests;

console.info(`window.tests object { ${Object.getOwnPropertyNames(tests)} }`);

localStorage.setItem("chat.settings", JSON.stringify(settings));

window.__chat__ = new Chat()
    .withSettings()
    .withUser({ username, nick: username })
    .withEmotes(emotes)
    .withGui()
    .withWhispers()
    .connect(mockStream.url);
