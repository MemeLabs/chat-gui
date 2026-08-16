const ALLOWED_HOSTS = ['cdn.discordapp.com', 'media.discordapp.net'];
const ALLOWED_EXTENSIONS = /\.(mp4|webm|mov)$/i;

// Parse the URL rather than pattern matching the raw string: a test() anywhere
// in the input accepts https://evil.com/#https://cdn.discordapp.com/a.mp4 and
// then loads evil.com, since it is the whole string that reaches video.src.
function parseAttachmentUrl (raw) {
    let url;
    try {
        url = new URL(raw);
    } catch (err) {
        return null;
    }
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.includes(url.hostname)) {
        return null;
    }
    // Match against pathname so Discord's signed ?ex=&is=&hm= params are ignored.
    if (!url.pathname.startsWith('/attachments/') || !ALLOWED_EXTENSIONS.test(url.pathname)) {
        return null;
    }
    return url;
}

const source = decodeURIComponent(location.search).replace(/^\?v=/, '');
const url = parseAttachmentUrl(source);

if (url) {
    const video = document.createElement('video');
    video.src = url.href;
    video.controls = true;
    video.autoplay = true;
    document.body.appendChild(video);
}
