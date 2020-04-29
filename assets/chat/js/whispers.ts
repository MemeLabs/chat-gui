/* global sessionStorage, JSON */

interface Message {
    data: string
    entities: any
    nick: string
    timestamp: number
}

interface Thread {
    key: string
    nick: string
    unread: number
    messages: Message[]
}

interface ThreadSummary {
    key: string
    nick: string
    unread: number
}

const parseFallback = <T>(json: string | null, fallback: T): T => {
    if (json === null) {
        return fallback;
    }

    try {
        return JSON.parse(json) as T;
    } catch (e) {
        console.log(e);
        return fallback;
    }
}

class WhisperStore {
    owner: string

    constructor(owner: string) {
        this.owner = owner;
    }

    key(): string {
        return `whispers-${this.owner}`;
    }

    load(): ThreadSummary[] {
        const data = parseFallback<Thread[]>(sessionStorage.getItem(this.key()), []);

        return data.reduce<ThreadSummary[]>((summaries, {key, nick, unread}) => {
            return [...summaries, {key, nick, unread}];
        }, []);
    }

    append(key: string, remoteNick: string, msg: Message) {
        const data = parseFallback<Thread[]>(sessionStorage.getItem(this.key()), []);

        let thread = data.find(t => t.key === key);
        if (!thread) {
            thread = {
                key,
                nick: remoteNick,
                unread: 0,
                messages: [],
            };
            data.push(thread);
        }

        thread.messages.push(msg);
        thread.unread ++;

        sessionStorage.setItem(this.key(), JSON.stringify(data));
    }

    delete(key: string) {
        const data = parseFallback<Thread[]>(sessionStorage.getItem(this.key()), []);
        sessionStorage.setItem(this.key(), JSON.stringify(data.filter(t => t.key !== key)));
    }

    loadThread(key: string): Message[] {
        const data = parseFallback<Thread[]>(sessionStorage.getItem(this.key()), []);

        const thread = data.find(t => t.key === key);
        if (!thread) {
            return [];
        }

        thread.unread = 0;

        sessionStorage.setItem(this.key(), JSON.stringify(data));

        return thread.messages;
    }

    markRead(key: string) {
        const data = parseFallback<Thread[]>(sessionStorage.getItem(this.key()), []);

        const thread = data.find(t => t.key === key);
        if (thread) {
            thread.unread = 0;
        }

        sessionStorage.setItem(this.key(), JSON.stringify(data));
    }
}

export default WhisperStore;
