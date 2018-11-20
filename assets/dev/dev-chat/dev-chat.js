// Access dev chat on dev build "./dev/dev-chat.html"

// mockStream needs to be imported before Chat to mock the global WebSocket.
import { url, mockStream } from './messages/mockStream';
import tests from './tests';

import emotes from '../../emotes.json';
import settings from './settings.json';
import Chat from '../../chat/js/chat';

document.title = 'Offline Dev Chat - FOR TESTING ONLY';
window.mockStream = mockStream;
window.tests = tests;

console.info( `window.tests object { ${Object.getOwnPropertyNames(tests)} }` );

localStorage.setItem('chat.settings', JSON.stringify(settings));

window.__chat__ = new Chat()
    .withSettings()
    .withUser({username: 'TopTierMemer98', nick: 'TopTierMemer98'})
    .withEmotes(emotes)
    .withGui()
    .withWhispers()
    .connect(url);
