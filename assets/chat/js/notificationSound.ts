const defaultNotificationSound = "/assets/sounds/notification.wav";

export class AudioContextNotificatinPlayer {
    context: AudioContext;
    audioBuffer?: AudioBuffer;

    constructor() {
        this.context = new AudioContext();
    }

    supported() { return false; }

    loadConfig() {
        this.init(localStorage.getItem("notificationsoundfile"));
    }

    async init(url: string | null) {
        const res = await fetch(url || defaultNotificationSound);
        const data = await res.arrayBuffer();
        this.audioBuffer = await this.context.decodeAudioData(data);
    }

    play() {
        if (this.audioBuffer) {
            const source = this.context.createBufferSource();
            source.buffer = this.audioBuffer;
            source.loop = false;
            source.connect(this.context.destination);
            source.start(0);
        }
    }

    async set(dataUrl: string) {
        await this.init(dataUrl);
        localStorage.setItem("notificationsoundfile", dataUrl);
    }

    reset() {
        this.set("");
    }
}

export class NoopNotificatinPlayer {
    supported() { return false; }
    loadConfig() {}
    async init(url: string | null) {}
    play() {}
    async set(dataUrl: string) {}
    reset() {}
}

const Player = window.AudioContext
? AudioContextNotificatinPlayer
: NoopNotificatinPlayer;

export default new Player();
