
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

export default class MockStream {
    constructor(config) {
        const { username } = config;

        this.url = url;
        this.server = new Server(url);

        this.server.on('connection', socket => {
            const ownProperties = [
                ...Object.getOwnPropertyNames(MockStream.prototype).slice(1),
                ...Object.getOwnPropertyNames(this)
            ];

            // Add some usernames for autocomplete testing
            const joinMessages = [
                'PepoMan',
                'PepoDuder',
                'CozyPan',
                'CoDirectionalFan',
                'CoolKikker',
                'CoolCool'
            ].map(username => ({ username, nick: username }));

            this.sendMessages(joinMessages, null, 'JOIN');

            const openingMessages = [
                'Offline chat for development.',
                'Use the mockStream object in console to playback messages.',
                `mockStream: { ${ownProperties.join(', ')} }`,
                'If there are cases not covered, add them yourself PEPE'
            ].map(data => ({ data }));

            this.sendMessages(openingMessages, null, 'BROADCAST');

            socket.on('message', message => {
                const [eventname, payload] = message.split(' ');

                let data = null;
                try {
                    data = JSON.parse(payload);
                } catch (ignored) {
                    data = payload;
                }

                if (eventname === 'MSG') {
                    data.nick = username;
                    this.server.emit('message', `MSG ${JSON.stringify(data)}`);
                }
            });
        });
    }

    /**
     * @param {Array} messages Array of messages to send though the mock-server.
     * @param {String?} name A name for the message stream, null to prevent end of
     *                       stream message.
     * @param {String} type Type of server message.
     */
    sendMessages(messages, name, type = 'MSG') {
        return new Promise((resolve) => {
            let index = 0;

            const sendMessage = () => {
                if (index < messages.length) {
                    const message = messages[index];

                    this.server.emit('message', `${type} ${JSON.stringify(message)}`);
                    setTimeout(sendMessage, 20);
                    index++;
                } else {
                    if (name) {
                        const message = {
                            data: `End of message stream: ${name}`
                        };
                        this.server.emit('message', `BROADCAST ${JSON.stringify(message)}`);
                    }
                    resolve();
                }
            };

            sendMessage();
        });
    }

    sendMessage(nick, message, type = 'MSG') {
        const messageObject = {
            nick,
            data: message
        };
        this.server.emit('message', `${type} ${JSON.stringify(messageObject)}`);
    }

    highlightedMessages() {
        return this.sendMessages(highlightedMessages, 'highlightedMessages');
    }

    taggedMessages() {
        return this.sendMessages(taggedMessages, 'taggedMessages');
    }

    allTagColors() {
        const messages = tagColors
            .map(color => {
                return {
                    nick: `TagColor-${color}`,
                    data: `Message with the ${color} tag color.`
                };
            });

        return this.sendMessages(messages, 'allTagColors');
    }

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

        return this.sendMessages(messages, 'allEmotes');
    }

    whispers() {
        const messages = new Array(13)
            .fill('')
            .map((_, index) => {
                return {
                    nick: `whisperer${index.toString().padStart(2, 0)}`,
                    data: 'we can seeeee youuuu :)'
                };
            });

        this.sendMessages(messages, 'whispers', 'PRIVMSG');
    }

    whisperSelf(message = 'I see you :)', username = 'whisperer') {
        this.sendMessages([{
            nick: username,
            data: message
        }], null, 'PRIVMSG');
    }

    combo(amount = 50, emote = 'OverRustle') {
        const messages = new Array(amount)
            .fill('')
            .map((_, index) => {
                return {
                    nick: `Combo-${index}`,
                    data: emote
                };
            });

        return this.sendMessages(messages, 'combo');
    }
}
