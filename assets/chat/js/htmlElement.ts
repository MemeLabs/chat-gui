
class HtmlElement {
    private static readonly classAttributeName = 'class';

    private readonly attributes = new Map<string, string>();
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
        return value ? value.trim().toLowerCase() : '';
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

        if (name === HtmlElement.classAttributeName) {
            if (!value) {
                return;
            }

            this.classes.clear();
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
        // First, build the class attribute.
        const attributes: string[] = [];
        if (this.classes.size > 0) {
            const classAttribute: string = `class="${Array.from(this.classes).join(' ')}"`;
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
