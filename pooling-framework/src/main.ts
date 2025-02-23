function assert<T>(value: T | false | null | undefined | 0 | ""): value is T {
    if (!value) {
        throw new Error("Assertion failed");
    }

    return true;
}

type ValidElement = HTMLElement | SVGElement;
type StyleObject<U extends ValidElement> = (U extends HTMLElement ? keyof HTMLElement["style"] : keyof SVGElement["style"]);

type RenderFn<E extends ValidElement = ValidElement> = (e: UIRoot<E>) => void;

class UIRoot<E extends ValidElement = ValidElement> {
    readonly root: E;
    readonly type: string;

    readonly childBuilders: UIRoot<ValidElement>[] = [];
    currentChildIdx = -1;
    maxChildCount = 0;

    readonly stateArray: [supplier: () => unknown, unknown][] = [];
    currentStateIdx = -1;
    maxStateCount = 0;

    constructor(root: E, type: string) {
        this.root = root;
        this.type = type;
    }

    throwForReferentialIntegrity(errorMessage: string): never {
        throw new Error(`${errorMessage}. Otherwise, we can't guarantee referential integrity between renders.`);
    }

    begin() {
        if (this.maxChildCount === 0) {
            this.maxChildCount = this.currentChildIdx + 1;
            this.maxChildCount = this.currentChildIdx + 1;
        } else if (this.maxChildCount !== this.currentChildIdx + 1) {
            this.throwForReferentialIntegrity("Your immediate mode component should be rendering the same number of elements under another element every render");
        }
        this.currentChildIdx = -1;

        if (this.maxStateCount === 0) {
            this.maxStateCount = this.currentStateIdx + 1;
            this.maxStateCount = this.currentStateIdx + 1;
        } else if (this.maxStateCount !== this.currentStateIdx + 1) {
            this.throwForReferentialIntegrity("Your immediate mode component should be creating the same number of state objects under another element every render");
        }
        this.currentStateIdx = -1;
    }

    el<E2 extends ValidElement = ValidElement>(type: string, renderMore?: RenderFn<E2>) {
        this.currentChildIdx++;

        const idx = this.currentChildIdx;
        assert(idx <= this.childBuilders.length);

        let result;
        if (idx < this.childBuilders.length) {
            // We disallow using a different type at a different index, so this this will return the same thing every time
            result = this.childBuilders[idx] as UIRoot<E2>;

            if (result.type !== type) {
                this.throwForReferentialIntegrity("Immediate mode components should be the same type each time");
            }
        } else {
            // Kinda need to trust the user on this one...
            // Most likely, they should never override this
            const newElement = document.createElement(type) as E2;
            this.root.appendChild(newElement);
            result = new UIRoot<E2>(newElement, type);
            this.childBuilders.push(result);
        }

        result.begin();

        if (renderMore) {
            renderMore(result);
        }

        return result;
    }

    state<T>(supplier: () => T) {
        this.currentStateIdx++;

        const idx = this.currentChildIdx;
        assert(idx <= this.stateArray.length);

        let result: T;
        if (idx < this.stateArray.length) {
            const [prevSupplier, state] = this.stateArray[idx];
            if (supplier !== prevSupplier) {
                throw new Error("The function that constructs state should be the same for every render. Changing the function on later rerenders will have no effect.");
            }

            result = state as T;
        } else {
            result = supplier();
            this.stateArray.push([supplier, result]);
        }

        return result;
    }

    text(str: string) {
        if (this.childBuilders.length > 0) {
            throw new Error("Invalid operation - you were attempting to overwrite existing HTML elements with text. Instead of div().text(\"blah\"), try div(r => r.text(\"blah\")) instead");
        }

        if (this.root.textContent !== str) {
            this.root.textContent = str;
        }

        return this;
    }

    s<K extends (keyof E["style"])>(key: K, value: E["style"][K]) {
        this.setSyle(key, value);
    }

    setSyle<K extends (keyof E["style"])>(key: K, value: E["style"][K]) {
        // @ts-expect-error this is legit, so not sure why it's complaining here...
        this.root.style[key] = value;
        return this;
    }

    c(val: string, enabled: boolean = true) {
        this.setClass(val, enabled);
    }

    setClass(val: string, enabled: boolean = true) {
        // TODO: we should use the same pooling strategy here that we used for child components.
        if (enabled) {
            this.root.classList.add(val);
        } else {
            this.root.classList.remove(val);
        }
        return this;
    }
}

function div(root: UIRoot, fn?: RenderFn<HTMLDivElement>) {
    return root.el<HTMLDivElement>("div", fn);
}

function span(root: UIRoot, fn?: RenderFn<HTMLSpanElement>) {
    return root.el<HTMLSpanElement>("span");
}

function text(r: UIRoot, text: string) {
    const s = span(r);
    if (s.root.textContent !== text) {
        s.root.textContent = text;
    }
    return s;
}

class ListRenderer {
    lastRoot: UIRoot | undefined;
    idx = 0;

    begin(r: UIRoot) {
        if (this.lastRoot) {
            assert(this.lastRoot === r);
        }
        this.lastRoot = r;

        this.idx = 0;
    }
}

function newListRenderer() {
    return new ListRenderer();
}

function list(r: UIRoot, renderFn: (listRenderer: ListRenderer) => void) {
    const listRenderer = r.state(newListRenderer);
    const root = div(r).setSyle("display", "contents");
    listRenderer.begin(root);
    renderFn(listRenderer);
}

function Button(r: UIRoot, buttonText: string, onClick: () => void) {
    const b = div(r);
    text(b, buttonText);
    b.root.onclick = onClick;
}

let count = 0;
function App(r: UIRoot) {
    div(r, r => {
        text(r, "Hello world! ");
        text(r, "Lets fkng go! ");
        text(r, "Count: " + count);
    });
    div(r);
    list(r, (r) => {

    });
    Button(r, "Increment count", () => {
        count++;
        rerenderApp();
    });
}


const appRoot = new UIRoot(document.body, "Document root");
function rerenderApp() {
    appRoot.begin();

    App(appRoot);
}

rerenderApp();
