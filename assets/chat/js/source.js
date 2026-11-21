/* global window */

import EventEmitter from "./emitter";
const WebSocket = window["WebSocket"] || window["MozWebSocket"];

// How long a dropped connection may take to come back before the chat shows
// that it is disconnected. Short drops (e.g. Cloudflare recycling websockets)
// are resumed without any visible notice.
const SILENT_RECONNECT_GRACE_MS = 8000;
// A connection that closes sooner than this after opening counts as a failed
// attempt, so a server that accepts and immediately drops connections is
// retried with backoff instead of in a tight loop. A resumed connection stays
// silent until it has been up this long, so dropping again right away stays
// hidden too.
const MIN_STABLE_CONNECTION_MS = 5000;
const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;
const RETRY_JITTER = 0.2;
const MAX_QUEUED_SENDS = 10;

/**
 * Handles the websocket connection, opening, closing, retrying
 * and parsing the standard format from the golang sgg service `$EVENT ${DATA}`
 * extends the EventEmitter so you can bind to the events using source.on(name, fn)
 *
 * When an established connection drops, the source reconnects immediately and
 * asks the server to replay the events it missed (`?since=<last event id>`).
 * `silent` stays true until the new connection has been up for
 * MIN_STABLE_CONNECTION_MS, or SILENT_RECONNECT_GRACE_MS passes without one.
 * While it is true, sends are queued, so the drop has no visible effect.
 *
 * e.g.
 * let s = new ChatSource()
 *
 * s.on('OPEN', ... )           Connection is established, `{ resumed }` is true after a silent reconnect
 * s.on('CLOSE', ... )          Connection is closed
 * s.on('CONNECTING', ... )     A new connection is created, before connect is called
 * s.on('RECONNECTING', ... )   A dropped connection did not come back within the grace period
 * s.on('SOCKETERROR', ... )    When a socket level error occurs
 * s.on('ERR', ... )            When a chat error occurs `ERR 'code'`
 * s.on('DISPATCH', ... )       Any socket.onmessage event
 * s.on('$EVENT', ... )         Custom event sent from the chat server e.g. `NAMES { ... }`
 *
 * s.connect('wss://localhost')
 */
class ChatSource extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.url = null;
        this.retryOnDisconnect = true;
        this.retryAttempts = 0;
        this.retryTimer = null;
        this.openedAt = null;
        this.lastEventId = 0;
        this.silent = false;
        this.silentTimer = null;
        this.stableTimer = null;
        this.sendQueue = [];
    }

    isConnected() {
        return this.socket && this.socket.readyState === this.socket.OPEN;
    }

    // Connect explicitly, at startup or via /connect. Unlike the automatic
    // retries this is never a silent resume, and sends queued for the previous
    // connection are dropped.
    connect(url) {
        this.endSilentReconnect();
        this.dropQueuedSends();
        if (this.url !== null && url !== this.url) {
            // event ids from another server are meaningless here
            this.lastEventId = 0;
        }
        this.url = url;
        this.open();
    }

    open() {
        this.retryAttempts++;
        try {
            if (this.retryTimer !== null) {
                clearTimeout(this.retryTimer);
                this.retryTimer = null;
            }
            if (this.socket !== null) {
                this.socket.onopen = null;
                this.socket.onclose = null;
                this.socket.onerror = null;
                this.socket.onmessage = null;
                this.disconnect();
                // we null the socket, without waiting for the disconnect
                // possible orphaned connections
                this.socket = null;
            }
            this.openedAt = null;
            this.emit("CONNECTING", this.url);
            this.socket = new WebSocket(this.socketUrl());
            this.socket.onopen = e => this.onOpen(e);
            this.socket.onclose = e => this.onClose(e);
            this.socket.onmessage = e => this.onMsg(e);
            this.socket.onerror = e => this.emit("SOCKETERROR", e);
        } catch (e) {
            this.emit("SOCKETERROR", e);
        }
    }

    // The connection url, asking the server to replay events after the last
    // one we received.
    socketUrl() {
        if (this.lastEventId <= 0) {
            return this.url;
        }
        try {
            const url = new URL(this.url, window.location.href);
            url.searchParams.set("since", String(this.lastEventId));
            return url.toString();
        } catch (ignored) {
            return this.url;
        }
    }

    disconnect() {
        if (this.socket && this.socket.readyState !== this.socket.CLOSED)
            this.socket.close();
    }

    onOpen(e) {
        const resumed = this.silent;
        this.openedAt = Date.now();
        this.retryOnDisconnect = true;
        if (resumed) {
            clearTimeout(this.stableTimer);
            this.stableTimer = setTimeout(
                () => this.endSilentReconnect(),
                MIN_STABLE_CONNECTION_MS
            );
        }
        this.emit("OPEN", { event: e, resumed });

        const queued = this.sendQueue;
        this.sendQueue = [];
        queued.forEach(frame => this.socket.send(frame));
    }

    onClose(e) {
        const stable =
            this.openedAt !== null &&
            Date.now() - this.openedAt >= MIN_STABLE_CONNECTION_MS;
        this.openedAt = null;
        clearTimeout(this.stableTimer);
        this.stableTimer = null;
        if (stable) {
            this.retryAttempts = 0;
        }

        let retryMilli = 0;
        if (this.retryOnDisconnect) {
            retryMilli = ChatSource.retryDelay(this.retryAttempts);
            // an unstable drop while already silent keeps the original grace
            // period, so a connection that keeps flapping becomes visible
            if (stable) {
                this.beginSilentReconnect();
            }
            this.retryTimer = setTimeout(() => this.open(), retryMilli);
        } else {
            this.endSilentReconnect();
            this.dropQueuedSends();
        }
        this.emit("CLOSE", { code: e.code || 1006, retryMilli: retryMilli });
    }

    // Reconnect immediately after an established connection drops, then back
    // off exponentially from MIN_RETRY_MS to MAX_RETRY_MS while attempts fail.
    static retryDelay(failedAttempts) {
        if (failedAttempts <= 0) {
            return 0;
        }
        const base = Math.min(
            MAX_RETRY_MS,
            MIN_RETRY_MS * 2 ** (failedAttempts - 1)
        );
        const jitter = 1 + (Math.random() * 2 - 1) * RETRY_JITTER;
        return Math.min(MAX_RETRY_MS, Math.round(base * jitter));
    }

    beginSilentReconnect() {
        clearTimeout(this.silentTimer);
        this.silent = true;
        this.silentTimer = setTimeout(
            () => this.onSilentReconnectTimeout(),
            SILENT_RECONNECT_GRACE_MS
        );
    }

    endSilentReconnect() {
        clearTimeout(this.silentTimer);
        clearTimeout(this.stableTimer);
        this.silentTimer = null;
        this.stableTimer = null;
        this.silent = false;
    }

    onSilentReconnectTimeout() {
        const connected = this.isConnected();
        this.endSilentReconnect();
        // back up but not yet stable: nothing to tell the user
        if (connected) {
            return;
        }
        this.emit("RECONNECTING");
        this.dropQueuedSends();
    }

    dropQueuedSends() {
        const dropped = this.sendQueue.length > 0;
        this.sendQueue = [];
        if (dropped) {
            this.emit("ERR", "notconnected");
        }
    }

    onMsg(e) {
        this.parseAndDispatch(e);
    }

    parseAndDispatch(event) {
        let eventname = event.data.split(" ", 1)[0].toUpperCase();

        let payload = event.data.substring(eventname.length + 1);

        let data = null;
        try {
            data = JSON.parse(payload);
        } catch (ignored) {
            data = payload;
        }
        if (
            data !== null &&
            typeof data === "object" &&
            Number.isSafeInteger(data.id) &&
            data.id > this.lastEventId
        ) {
            this.lastEventId = data.id;
        }
        this.emit("DISPATCH", { data: data, event: eventname }); // Event is used to hook into all dispatched events
        this.emit(eventname, data);
    }

    send(eventname, data) {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        const frame = `${eventname} ${payload}`;
        if (this.isConnected()) {
            this.socket.send(frame);
        } else if (this.silent && this.sendQueue.length < MAX_QUEUED_SENDS) {
            this.sendQueue.push(frame);
        } else {
            this.emit("ERR", "notconnected");
        }
    }
}

export default ChatSource;
