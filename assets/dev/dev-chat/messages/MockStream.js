import highlightedMessages from "./highlighted.json";
import taggedMessages from "./tagged.json";
import viewerstates from "./viewerstates.json"
import { WebSocket, Server } from "mock-socket";
const { default: emotes } = require("../../../emotes.json");
const tagColors = [
    "green",
    "yellow",
    "orange",
    "red",
    "purple",
    "blue",
    "sky",
    "lime",
    "pink",
    "black"
];

window.WebSocket = WebSocket;

const url = "ws://mockServer:8080";

export default class MockStream {
    constructor(config) {
        const { username } = config;

        this.url = url;
        this.server = new Server(url);

        this.server.on("connection", socket => {
            const ownProperties = [
                ...Object.getOwnPropertyNames(MockStream.prototype).slice(1),
                ...Object.getOwnPropertyNames(this)
            ];

            // Add some usernames for autocomplete testing
            const joinMessages = [
                "PepoMan",
                "PepoDuder",
                "CozyPan",
                "CoDirectionalFan",
                "CoolKikker",
                "CoolCool"
            ].map(username => ({ username, nick: username }));

            this.sendMessages(joinMessages, null, "JOIN");

            const openingMessages = [
                "Offline chat for development.",
                "Use the mockStream object in console to playback messages.",
                `mockStream: { ${ownProperties.join(", ")} }`,
                "If there are cases not covered, add them yourself PEPE"
            ].map(data => ({ data }));

            this.sendMessages(openingMessages, null, "BROADCAST");

            socket.on("message", message => {
                const eventname = message.split(" ", 1)[0].toUpperCase();
                const payload = message.substring(eventname.length + 1);

                let data = null;
                try {
                    data = JSON.parse(payload);
                } catch (ignored) {
                    data = payload;
                }

                if (eventname === "MSG") {
                    data.nick = username;
                    this.server.emit("message", `MSG ${JSON.stringify(data)}`);
                }
                else if (eventname === "MSGREPLY") {
                    data.nick = username;
                    this.server.emit("MSGREPLY", `MSGREPLY ${JSON.stringify(data)}`);
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
    sendMessages(messages, name, type = "MSG") {
        return new Promise(resolve => {
            let index = 0;

            const sendMessage = () => {
                if (index < messages.length) {
                    const message = messages[index];

                    this.server.emit(
                        "message",
                        `${type} ${JSON.stringify(message)}`
                    );
                    setTimeout(sendMessage, 20);
                    index++;
                } else {
                    if (name) {
                        const message = {
                            data: `End of message stream: ${name}`
                        };
                        this.server.emit(
                            "message",
                            `BROADCAST ${JSON.stringify(message)}`
                        );
                    }
                    resolve();
                }
            };

            sendMessage();
        });
    }

    sendReply(nick, target, message, prevMessage, prevmId, messageId) {
        const messageObject = {
            nick: nick,
            target: target,
            data: message,
            prev: prevMessage,
            prevMessageId: prevmId,
            messageId: messageId
        };
        this.server.emit("message", `MSGREPLY ${JSON.stringify(messageObject)}`);
    }

    sendMessage(nick, message, type = "MSG") {
        const messageObject = {
            nick,
            data: message
        };
        this.server.emit("message", `${type} ${JSON.stringify(messageObject)}`);
    }

    highlightedMessages() {
        return this.sendMessages(highlightedMessages, "highlightedMessages");
    }

    taggedMessages() {
        return this.sendMessages(taggedMessages, "taggedMessages");
    }

    viewerstateMessages() {
        return this.sendMessages(viewerstates['messages'], "viewerstateMessages");
    }

    allTagColors() {
        const messages = tagColors.map(color => {
            return {
                nick: `TagColor-${color}`,
                data: `Message with the ${color} tag color.`
            };
        });

        return this.sendMessages(messages, "allTagColors");
    }

    allEmotes() {
        const chunkSize = 7;
        const chunkAmount = Math.floor(emotes.length / chunkSize);

        const messages = new Array(chunkAmount).fill(null).map((_, index) => {
            const offset = chunkSize * index;
            const chunk = emotes.slice(offset, offset + chunkSize);

            return {
                nick: `AllEmotes${index.toString().padStart(2, 0)}`,
                data: chunk.join(" ")
            };
        });

        return this.sendMessages(messages, "allEmotes");
    }

    whispers() {
        const messages = new Array(13).fill("").map((_, index) => {
            return {
                nick: `whisperer${index.toString().padStart(2, 0)}`,
                data: "we can seeeee youuuu :)"
            };
        });

        this.sendMessages(messages, "whispers", "PRIVMSG");
    }

    whisperSelf(message = "I see you :)", username = "whisperer") {
        this.sendMessages(
            [
                {
                    nick: username,
                    data: message
                }
            ],
            null,
            "PRIVMSG"
        );
    }

    combo(amount = 50, emote = "OverRustle") {
        const messages = new Array(amount).fill("").map((_, index) => {
            return {
                nick: `Combo-${index}`,
                data: emote
            };
        });

        return this.sendMessages(messages, "combo");
    }
    conversation() {
        const user1 = "Ghostface";
        const user2 = "FrostedJimmy";

        // Fake convo between 2 people to display replies
        this.sendMessage(
            user1,
            "Yall see the speed boost after DRS on Strims!?"
        );

        this.sendReply(
            user2,
            user1,
            "Strims’ DRS was wild, like 10 km/h gain down the straight! But Memlabs’ DRS felt even quicker, no?",
            "Yall see the speed boost after DRS on Strims!?",
            "0001",
            "0002"
        );

        this.sendReply(
            user1,
            user2,
            "Memlabs’ DRS is nuts, prob hitting 12 km/h extra. Their rear wing flap opens wider, I bet. Strims still owns the corners though.",
            "Strims’ DRS was wild, like 10 km/h gain down the straight! But Memlabs’ DRS felt even quicker, no?",
            "0002",
            "0003"
        );

        this.sendReply(
            user2,
            user1,
            "True, Strims’ cornering is unreal—those high-downforce wings grip like glue in Turn 9. Memlabs slides a bit there.",
            "Memlabs’ DRS is nuts, prob hitting 12 km/h extra. Their rear wing flap opens wider, I bet. Strims still owns the corners though.",
            "0003",
            "0004"
        );

        this.sendReply(
            user1,
            user2,
            "Yeah, Strims nails corners with that downforce, but Memlabs’ DRS speed on the straight might clinch the win next time!",
            "True, Strims’ cornering is unreal—those high-downforce wings grip like glue in Turn 9. Memlabs slides a bit there.",
            "0004",
            "0005"
        );
    }
}
