class EventEmitter {
    private readonly listeners: Map<string, Array<(...args: unknown[]) => void>>;

    constructor() {
        this.listeners = new Map();
    }

    on(name: string, fn: (...args: unknown[]) => void) {
        this.listeners.has(name) || this.listeners.set(name, []);
        this.listeners.get(name)!.push(fn);
        return this;
    }

    emit(name: string, ...args: unknown[]) {
        const listeners = this.listeners.get(name);
        if (listeners && listeners.length) {
            listeners.forEach(listener => listener(...args));
            return true;
        }
        return false;
    }
}

export default EventEmitter;
