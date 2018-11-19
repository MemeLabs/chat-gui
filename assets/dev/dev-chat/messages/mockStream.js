
import highlightedMessages from './highlighted.json';
import taggedMessages from './tagged.json';
import { WebSocket, Server } from 'mock-socket';
const { destiny: emotes } = require('../../../emotes.json');
const tagColors = [
    'green',
    'yellow',
    'orange',
    'red',
    'purple',
    'blue',
    'sky',
    'lime',
    'pink',
    'black'
];

window.WebSocket = WebSocket;

const url = 'ws://mockServer:8080';

const server = new Server(url);

/**
 * @param {Array} messages Array of messages to send though the mock-server.
 * @param {String?} name A name for the message stream, null to prevent end of
 *                       stream message.
 * @param {String} type Type of server message.
 */
function sendMessages(messages, name, type = 'MSG') {
    return new Promise((resolve) => {
        let index = 0;

        const sendMessage = function() {
            if (index < messages.length) {
                const message = messages[index];

                server.emit('message', `${type} ${JSON.stringify(message)}`);
                setTimeout(sendMessage, 20);
                index++;
            } else {
                if (name) {
                    const message = {
                        data: `End of message stream: ${name}`
                    };
                    server.emit('message', `BROADCAST ${JSON.stringify(message)}`);
                }
                resolve();
            }
        };

        sendMessage();
    });
}

const mockStream = {
    server,

    sendMessage(nick, message, type = 'MSG') {
        const messageObject = {
            nick,
            data: message
        };
        server.emit('message', `${type} ${JSON.stringify(messageObject)}`);
    },

    highlightedMessages() {
        return sendMessages(highlightedMessages, 'highlightedMessages');
    },

    taggedMessages() {
        return sendMessages(taggedMessages, 'taggedMessages');
    },

    allTagColors() {
        const messages = tagColors
            .map(color => {
                return {
                    nick: `TagColor-${color}`,
                    data: `Message with the ${color} tag color.`
                };
            });

        return sendMessages(messages, 'allTagColors');
    },

    allEmotes() {
        const chunkSize = 7;
        const chunkAmount = Math.floor(emotes.length / chunkSize);

        const messages = new Array(chunkAmount)
            .fill(null)
            .map((_, index) => {
                const offset = chunkSize * index;
                const chunk = emotes.slice(offset, offset + chunkSize);

                return {
                    nick: `AllEmotes${index.toString().padStart(2, 0)}`,
                    data: chunk.join(' ')
                };
            });

        return sendMessages(messages, 'allEmotes');
    },

    whispers() {
        const messages = new Array(13)
            .fill('')
            .map((_, index) => {
                return {
                    nick: `whisperer${index.toString().padStart(2, 0)}`,
                    data: 'we can seeeee youuuu :)'
                };
            });

        sendMessages(messages, 'whispers', 'PRIVMSG');
    },

    whisperSelf(message = 'I see you :)', username = 'whisperer') {
        sendMessages([{
            nick: username,
            data: message
        }], null, 'PRIVMSG');
    },

    combo(amount = 50, emote = 'OverRustle') {
        const messages = new Array(amount)
            .fill('')
            .map((_, index) => {
                return {
                    nick: `Combo-${index}`,
                    data: emote
                };
            });

        return sendMessages(messages, 'combo');
    }
};

server.on('connection', socket => {
    const messages = [
        'Offline chat for development.',
        'Use the mockStream object in console to playback messages.',
        `mockStream: { ${Object.getOwnPropertyNames(mockStream).join(', ')} }`,
        'If there are cases not covered, add them yourself PEPE'
    ].map(data => ({ data }));

    sendMessages(messages, null, 'BROADCAST');
});

export { url, mockStream };
