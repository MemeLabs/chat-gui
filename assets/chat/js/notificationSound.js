import { MessageBuilder } from "./messages";

//https://codepen.io/xewl/pen/NjyRJx


var context = new AudioContext();
var source = null;
var audioBuffer = null;

// Converts an ArrayBuffer to base64, by converting to string
// and then using window.btoa' to base64. 
var bufferToBase64 = function (buffer) {
    var bytes = new Uint8Array(buffer);
    var len = buffer.byteLength;
    var binary = "";
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

function resetSound() {
    loadSoundFile("/assets/sounds/notification.wav");
}

var base64ToBuffer = function (buffer) {
    var binary = window.atob(buffer);
    var buffer = new ArrayBuffer(binary.length);
    var bytes = new Uint8Array(buffer);
    for (var i = 0; i < buffer.byteLength; i++) {
        bytes[i] = binary.charCodeAt(i) & 0xFF;
    }
    return buffer;
};

function playSound() {
    // source is global so we can call .stop() later.
    source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = false;
    source.connect(context.destination);
    source.start(0); // Play immediately.
}

function setSound(arrayBuffer) {
    var base64String = bufferToBase64(arrayBuffer);
    var audioFromString = base64ToBuffer(base64String);
    context.decodeAudioData(audioFromString, function (buffer) {
        // audioBuffer is global to reuse the decoded audio later.
        audioBuffer = buffer;
        localStorage.setItem("notificationsoundfile", base64String)
    });
}

// Load file from a URL as an ArrayBuffer.
// Example: loading via xhr2: loadSoundFile('sounds/test.mp3');
function loadSoundFile(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function (e) {
        setSound(this.response); // this.response is an ArrayBuffer.
    };
    xhr.send();
}

export { setSound, resetSound, playSound };
