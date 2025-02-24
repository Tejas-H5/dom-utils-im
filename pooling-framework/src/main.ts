
/**
 * Asserts are used here to catch developer mistakes. 
 * I reckon you should also leave them in for production deployments.
 * Every assertion should have a comment above it explaining why it's there, to make
 * debugging for users easier. This is also why I don't bother printing a different debug message per assertion -
 * you should be able to break on these in the debugger and see a more descriptive comment,
 * which can also be removed in production code.
 * Some asserts have DEV: in front of them. They exist to catch errors in the library code that I wrote, and not in user code that you wrote.
 */
function assert<T>(value: T | false | null | undefined | 0 | ""): value is T {
    if (!value) {
        throw new Error("Assertion failed");
    }

    return true;
}

type ValidElement = HTMLElement | SVGElement;
type StyleObject<U extends ValidElement> = (U extends HTMLElement ? keyof HTMLElement["style"] : keyof SVGElement["style"]);

// Similar to React's useBlah hook pattern, so I'm calling it a 'hook'
const HOOK_UI_ROOT = 1;
const HOOK_STATE = 2;
const HOOK_LIST = 3;
type UIHook = {
    t: typeof HOOK_UI_ROOT;
    v: UIRoot<ValidElement>;
};
type StateHook = {
    t: typeof HOOK_STATE;
    v: [supplier: () => unknown, value: unknown];
};
type ListHook = {
    t: typeof HOOK_LIST;
    v: ListRenderer;
};

type Hook = UIHook | StateHook | ListHook;

type DomRoot<E extends ValidElement = ValidElement> = {
    root: E;
    currentIdx: number;
};

function resetDomRoot(domRoot: DomRoot) {
    domRoot.currentIdx = -1;
}

function appendToDomRoot(domRoot: DomRoot, child: ValidElement) {
    domRoot.currentIdx++;
    setChildAtEl(domRoot.root, domRoot.currentIdx, child);
}

function setChildAtEl(root: Element, i: number, child: Element) {
    const children = root.children;

    if (i === children.length) {
        root.appendChild(child);
    } else if (children[i] !== child) {
        // TODO: compare insertBefore performance with replace
        root.insertBefore(child, children[i]);
    }
}

function getHookCount(lastCount: number, thisCount: number): number {
    let result = 0;
    if (lastCount === 0) {
        result = thisCount;
    } else {
        // You should be rerendering the same number of hooks each time.
        // This is because we have no plans on writing a 'diffing' algorithm, as these have bad performance characteristics
        assert(lastCount === thisCount);
    }

    return result;
}

class UIRoot<E extends ValidElement = ValidElement> {
    readonly root: E;
    readonly domRoot: DomRoot<E>;
    readonly type: string;

    readonly hooks: Hook[] = [];
    currentHookCount = 0;
    maxHookCount = 0;
    hasRealChildren = false;
    openListRenderers = 0;

    readonly styles: [string, string][] = [];
    maxStyleCount = 0;
    styleCount = 0;

    readonly classes: [string, boolean][] = [];
    maxClassCount = 0;
    classCount = 0;

    // TODO
    readonly attributes: [string, string | null][] = [];
    maxAttributeCount = 0;
    attrCount  = 0;
    

    // Users should call `newUiRoot` instead.
    constructor(domRoot: DomRoot<E>, type: string) {
        this.root = domRoot.root;
        this.domRoot = domRoot;
        this.type = type;
    }

    throwForReferentialIntegrity(errorMessage: string): never {
        throw new Error(`${errorMessage}. Otherwise, we can't guarantee referential integrity between renders.`);
    }

    // TODO: think of how we can remove this 
    begin() {
        this.__begin(true);
    }

    __begin(shouldResetDomRoot: boolean) {
        if (shouldResetDomRoot) {
            resetDomRoot(this.domRoot);
        }

        this.maxHookCount = getHookCount(this.maxHookCount, this.currentHookCount);
        this.currentHookCount = 0;

        // DEV: If this is negative, I fkd up (I decremented this thing too many times) 
        // User: If this is positive, u fked up (You forgot to finalize an open list)
        assert(this.openListRenderers === 0);

        this.maxClassCount = getHookCount(this.maxClassCount, this.classCount);
        this.classCount = 0;

        this.maxStyleCount = getHookCount(this.maxStyleCount, this.styleCount);
        this.styleCount = 0;

        this.maxAttributeCount = getHookCount(this.maxAttributeCount, this.attrCount);
        this.attrCount = 0;
    }

    private getNextHook(t: Hook["t"]) {
        const idx = this.currentHookCount;
        this.currentHookCount++;

        // DEV: We should be adding a hook to this array when we call getNextHook, and it returned undefined.
        assert(idx <= this.hooks.length);

        let result;
        if (idx < this.hooks.length) {
            const hook = this.hooks[idx];
            // Hooks should be called in the same order every single time for this to work.
            assert(hook.t === t);

            result = hook;
        } 

        return result;
    }

    el<E2 extends ValidElement = ValidElement>(type: string): UIRoot<E2> {
        // Don't render new elements to this thing when you have a list renderer that is active!
        // render to that instead.
        assert(this.openListRenderers === 0);

        // TODO: typescript magic to remove `as`
        const hook = this.getNextHook(HOOK_UI_ROOT) as UIHook | undefined;

        let result;
        if (hook) {
            result = hook.v as UIRoot<E2>;

            // The nth call to this DOM element hook should be called with the same type every time - 
            // otherwise, we would have to recreate this DOM element, which is not ideal for performance, 
            // and would cause us to return a reference to a different element which also complicates user code.
            assert(result.type === type);
        } else {
            // Kinda need to trust the user on this one...
            const newElement = document.createElement(type) as E2;
            result = new UIRoot({ root: newElement, currentIdx: -1 }, type);
            this.hooks.push({ t: HOOK_UI_ROOT, v: result });
        }

        appendToDomRoot(this.domRoot, result.domRoot.root);
        result.begin();

        return result;
    }

    state<T>(supplier: () => T): T {
        // TODO: typescript magic to remove `as`
        const hook = this.getNextHook(HOOK_STATE) as StateHook | undefined;

        let result: T | undefined;
        if (hook) {
            const [prevSupplier, state] = hook.v;

            // The function that constructs state should be the same for every render. 
            // Changing the function on later rerenders will have no effect, and is indicative of a logic bug.
            //
            // Rather than doing
            //
            // ```
            // const state = r.state(() => blah);
            // ```
            //
            // You should do this instead:
            //
            // ```
            // function newBlah() {
            //      return blah;
            // }
            //
            // ...
            //
            // const state = r.state(newBlah);
            //
            // ```
            assert(supplier === prevSupplier);

            result = state as T;
        } else {
            result = supplier();
            this.hooks.push({ t: HOOK_STATE, v: [supplier, result] })
        }

        return result;
    }

    beginList(): ListRenderer {
        // TODO: typescript magic to remove `as`
        const hook = this.getNextHook(HOOK_LIST) as ListHook | undefined;

        let result;
        if (hook) {
            result = hook.v;
        } else {
            result = new ListRenderer(this);
            this.hooks.push({ t: HOOK_LIST, v: result });
        }

        result.begin();
        this.openListRenderers++;

        return result;
    }

    s<K extends (keyof E["style"])>(key: K, value: string) {
        return this.setSyle(key, value);
    }

    setSyle<K extends (keyof E["style"])>(key: K, value: string) {
        const idx = this.styleCount;
        this.styleCount++;

        let existing;
        if (idx < this.styles.length) {
            // The same styles must always be set, in the same order. Immediate mode :(
            assert(this.styles[idx][0] === key);
            existing = this.styles[idx];
        } else {
            const newBlock: [string, string] = [key as string, ""];
            this.styles.push(newBlock);

            existing = newBlock;
        }

        if (existing[1] !== value) {
            existing[1] = value;

            // @ts-expect-error it sure can
            this.root.style[key] = value;
        }

        return this;
    }

    // NOTE: the effect of this method will persist accross renders
    c(val: string, enabled: boolean = true) {
        return this.setClass(val, enabled);
    }

    // NOTE: the effect of this method will persist accross renders
    setClass(val: string, enabled: boolean = true) {
        const idx = this.classCount;
        this.classCount++;

        let existing;
        if (idx < this.classes.length) {
            // The same classes must be toggled in the same order every time
            assert(val === this.classes[idx][0]);

            existing = this.classes[idx];
        } else {
            const newBlock: [string, boolean] = [val, false];
            this.classes.push(newBlock);
            existing = newBlock;
        }

        if (existing[1] !== enabled) {
            existing[1] = enabled;
            if (enabled) {
                this.root.classList.add(val);
            } else {
                this.root.classList.remove(val);
            }
        }

        return this;
    }

    attr(attr: string, val: string) {
        return this.setAttribute(attr, val);
    }

    a(attr: string, val: string) {
        return this.setAttribute(attr, val);
    }

    setAttribute(attr: string, val: string) {
        const idx = this.attrCount;
        this.attrCount++;

        let existing;
        if (idx < this.attributes.length) {
            // The same styles must always be set, in the same order. Immediate mode :(
            assert(this.attributes[idx][0] === attr);

            existing = this.attributes[idx];
        } else {
            const newBlock: [string, string | null] = [attr, null];
            this.attributes.push(newBlock);

            existing = newBlock;
        }

        if (existing[1] !== val) {
            existing[1] = val;
            if (val !== null) {
                this.root.setAttribute(attr, val);
            } else {
                this.root.removeAttribute(attr);
            }
        }

        return this;
    }

    __removeAllDomElements() {
        for (let i = 0; i < this.hooks.length; i++) {
            const hook = this.hooks[i];
            if (hook.t === HOOK_UI_ROOT) {
                hook.v.domRoot.root.remove();
            }
        }
    }
}

class ListRenderer {
    uiRoot: UIRoot;
    builders: UIRoot[] = [];
    builderIdx = 0;
    hasBegun = false;

    constructor(root: UIRoot) {
        this.uiRoot = root;
    }

    begin() {
        // DEV: Don't begin a list twice. (A user usually doesn't have to begin a list themselves)
        assert(!this.hasBegun);

        this.hasBegun = true;
        this.builderIdx = 0;
    }

    getNext() {
        const idx = this.builderIdx;

        // DEV: whenever this.builderIdx === this.builders.length, we should append another builder to the list
        assert(idx <= this.builders.length);

        let result;
        if (idx < this.builders.length) {
            result = this.builders[idx];
        } else {
            // NOTE: the type is not important at all here
            result = new UIRoot(this.uiRoot.domRoot, "List renderer root");
            this.builders.push(result);
        }

        // Append new list elements to where we're currently appending
        result.__begin(false);
        this.builderIdx++;

        return result;
    }

    finalize() {
        // You should only finalize a list once.
        assert(this.hasBegun);

        this.hasBegun = false;

        // DEV: don't decrement this more times than you increment it
        assert(this.uiRoot.openListRenderers > 0);
        this.uiRoot.openListRenderers--;

        // remove all the UI components that may have been added by other builders.
        for (let i = this.builderIdx; i < this.builders.length; i++) {
            this.builders[i].__removeAllDomElements();
        }
        this.builders.length = this.builderIdx;
    }
}

function newUiRoot<E extends ValidElement>(root: E): UIRoot<E> {
    const result = new UIRoot<E>({ root, currentIdx: -1 }, "User created root");
    return result;
}

function div(root: UIRoot) {
    return root.el<HTMLDivElement>("div");
}

function span(root: UIRoot) {
    return root.el<HTMLSpanElement>("span");
}

function text(r: UIRoot, text: string) {
    const s = span(r);
    if (s.root.textContent !== text) {
        s.root.textContent = text;
    }
    return s;
}

function Button(r: UIRoot, buttonText: string, onClick: () => void) {
    const root = div(r);
    {
        const b = root.el("button");
        text(b, buttonText);
        b.root.onmousedown = onClick;
    }

    return root;
}

function Slider(r: UIRoot, labelText: string, onChange: (val: number) => void) {
    const root = div(r);
    {
        const label = root.el("LABEL").a("for", labelText);
        text(label, labelText);

        const input = root.el<HTMLInputElement>("INPUT")
            .s("width", "1000px")
            .a("name", labelText)
            .a("type", "range")
            .a("min", "1").a("max", "300").a("step", "1");

        input.root.oninput = () => {
            onChange(input.root.valueAsNumber);
        }
    }

    return root;
}

let t = 0;
let count = 100;
let period = 2;
function App(r: UIRoot) {
    const appRoot = div(r);
    {
        text(div(appRoot), "Hello world! ");
        text(div(appRoot), "Lets fkng go! ");
        text(div(appRoot), "Count: " + count);
        text(div(appRoot), "Period: " + period);
    }
    div(r);

    const aList = r.beginList();
    for (let i = 0; i < count; i++) {
        const r = aList.getNext();
        const s = span(r);
        text(s, "A");

        s.s("display", "inline-block")
            .s("transform", `translateY(${Math.sin(t + (2 * Math.PI * (i / period))) * 50}px)`);
    }
    aList.finalize();

    const buttonBar = div(r);
    buttonBar
        .s("position", "fixed")
        .s("bottom", "10px").s("left", "10px");
    {
        Slider(buttonBar, "period", val => {
            period = val;
            rerenderApp();
        });
        Button(buttonBar, "Increment count", () => {
            count += 100;
            rerenderApp();
        });
        Button(buttonBar, "Refresh", () => {
            rerenderApp();
        });
        Button(buttonBar, "Decrement count", () => {
            count -= 100;
            rerenderApp();
        });
    }
}


const appRoot = newUiRoot(document.body);

function rerenderApp() {
    appRoot.begin();

    App(appRoot);
}

rerenderApp();

// let t0 = 0;
// function animate(t1: number) {
//     t += (t0 - t1) / 1000;
//     t0 = t1;
//
//     rerenderApp();
//
//     requestAnimationFrame(animate);
// }
//
// requestAnimationFrame(animate);
