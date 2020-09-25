
class HtmlElement {
    private readonly attributes = new Map<string, string>(); // Note that the 'class' attribute is managed separately.
    private readonly classes = new Set<string>();
    private content: string = '';
    private readonly elementType: string;

    constructor(elementType: string) {
        if (!elementType) {
            throw new Error('elementType is required');
        }

        this.elementType = HtmlElement.normalize(elementType);
    }

    static normalize(value: string): string {
        return value.trim().toLowerCase();
    }

    addClass(toAdd: string): void {
        if (!toAdd) {
            return;
        }

        this.classes.add(toAdd);
    }

    setAttribute(name: string, value?: string): void {
        if (!name) {
            return;
        }

        name = HtmlElement.normalize(name);
        value = value ? value : '';

        // 'class' is a special case because addClass() exists.
        if (name === 'class') {
            this.classes.clear();

            if (!value) {
                return;
            }

            const newClasses: string[] = value.split(' ');
            for (const newclass of newClasses) {
                this.addClass(newclass);
            }

            return;
        }

        this.attributes.set(name, value);
    }

    setContent(content: string): void {
        content = content ? content : '';
        this.content = content;
    }

    toString(): string {
        const attributes: string[] = [];

        // First, build the class attribute.
        if (this.classes.size > 0) {
            const classAttribute = `class="${Array.from(this.classes).join(' ')}"`;
            attributes.push(classAttribute);
        }

        // Next, build any non-class attributes.
        for (const attribute of this.attributes) {
            const name: string = attribute[0];
            const value: string = attribute[1];

            let toAdd: string = name;
            if (value) {
                toAdd = `${toAdd}="${value}"`;
            }

            attributes.push(toAdd);
        }

        // Finally, build the HTML element itself.
        let result = attributes.length > 0
            ? `<${this.elementType} ${attributes.join(' ')}>`
            : `<${this.elementType}>`;
        result += this.content;
        result += `</${this.elementType}>`

        return result;
    }
}

export default HtmlElement;
