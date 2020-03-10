import ViewerState from './viewerstate';

interface ICharUserArgs {
    readonly features: readonly string[];
    readonly nick: string;
}

class ChatUser {
    public features: readonly string[] = [];
    public nick: string = '';
    public username: string = '';
    public viewerState: ViewerState = new ViewerState();

    constructor(args?: ICharUserArgs) {
        if (args) {
            this.nick = args.nick || '';
            this.username = args.nick || '';
            this.features = args.features || [];
        }
    }

    public hasFeature(feature: string): boolean {
        return this.hasAnyFeatures(feature);
    }

    private hasAnyFeatures(...args: string[]): boolean {
        for (const element of args) {
            if (this.features.indexOf(element) !== -1) {
                return true;
            }
        }
        return false;
    }
}

export default ChatUser;
