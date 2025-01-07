const source = decodeURIComponent(location.search).replace(/^\?v=/, '');

if (/https:\/\/(media|cdn)\.discordapp\.(net|com)\/attachments.*?\.(mp4|webm|mov)/i.test(source)) {
  const video = document.createElement('video');
  video.src = source;
  video.controls = true;
  video.autoplay = true;
  document.body.appendChild(video);
}
