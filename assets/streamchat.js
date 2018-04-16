import Chat from './chat/js/chat';
import emotes from './emotes.json';


window.__chat__ = new Chat()
    .withEmotes(emotes)
    .withGui()
    .connect(WEBSOCKET_URI)
    ;
