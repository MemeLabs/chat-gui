class ChatUser {
    constructor(args = {}) {
        if (typeof args === 'string') {
            this.nick = args;
            this.username = args;
            this.features = [];
        } else {
            this.nick = args.nick || '';
            this.username = args.nick || '';
            this.features = args.features || [];
        }
    }

    hasAnyFeatures(...args) {
        for (const element of args) {
            const stringElement = typeof element !== 'string'
                ? element.toString()
                : element;
            if (this.features.indexOf(stringElement) !== -1) {
                return true;
            }
        }
        return false;
    }

    hasFeature(feature) {
        return this.hasAnyFeatures(feature);
    }
}

export default ChatUser;
