const fnv1a = (input: string) => {
  let hash = 2166136261;
  for (let i = 0, len = input.length; i < len; i ++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

const createRng = (seed: string) => {
  let n = 0;
  return () => fnv1a(`${n ++}${seed}`) / 0xffffffff;
};

const generateColor = (rng: () => number) => {
  const h = Math.round(rng() * 360);
  const s = Math.round(rng() * 80 + 20);
  const l = Math.round(rng() * 50 + 20);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const UNSAFE_CHARS = /[^a-zA-Z0-9 _\-\/\(\)]/g;
const sanitize = (str: string) => str.replace(UNSAFE_CHARS, '');

interface IChannel {
  readonly channel: string;
  readonly service: string;
  readonly path: string;
}

class ViewerState {
  public channel: IChannel | null = null;

  constructor(channel: IChannel | null = null) {
      this.channel = channel;
  }

  getColor() {
    if (!this.channel) {
      return '#292929';
    }
    return generateColor(this.getRng());
  }

  getRng() {
    if (!this.channel) {
      return createRng('default');
    }
    return createRng(this.channel.channel + this.channel.service);
  }

  getTitle() {
    if (!this.channel) {
      return '';
    }
    const {channel, service, path} = this.channel;
    const title = `${service}/${channel}`;
    return sanitize(path ? `${path} (${title})` : title);
  }
}

export default ViewerState;
