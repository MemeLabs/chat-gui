const defaultNotificationSound = "/assets/sounds/notification.wav";

const context = new AudioContext();
let audioBuffer: AudioBuffer;

export async function initSound(url: string) {
    const res = await fetch(url || defaultNotificationSound);
    const data = await res.arrayBuffer();
    audioBuffer = await context.decodeAudioData(data);
}

export function playSound() {
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = false;
    source.connect(context.destination);
    source.start(0);
}

export async function setSound(dataUrl: string) {
    await initSound(dataUrl);
    localStorage.setItem("notificationsoundfile", dataUrl);
}

export const resetSound = () => setSound("");
