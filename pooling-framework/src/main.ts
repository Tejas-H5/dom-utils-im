
//////////
// animation utils. The vast majority of apps will need animation, so I figured I'd just merge this into dom-utils itself

export type AnimateFunction = (dt: number) => boolean;

export type RealtimeAnimation = {
    isRunning: boolean;
    isInQueue: boolean;
    fn: AnimateFunction;
}

const queue: RealtimeAnimation[] = [];

const MAX_DT = 100;

let lastTime = 0;
function runAnimation(time: DOMHighResTimeStamp) {
    const dtMs = time - lastTime;
    lastTime = time;

    if (dtMs < MAX_DT) {
        for (let i = 0; i < queue.length; i++) {
            const handle = queue[i];

            handle.isRunning = handle.fn(dtMs / 1000);

            if (!handle.isRunning) {
                // O(1) fast-remove
                queue[i] = queue[queue.length - 1];
                queue.pop();
                handle.isInQueue = false;
                i--;
            }
        }
    }

    if (queue.length > 0) {
        requestAnimationFrame(runAnimation);
    }
}

export function newAnimation(fn: AnimateFunction): RealtimeAnimation {
    return { fn, isRunning: false, isInQueue: false };
}

/**
 * Adds an animation to the realtime animation queue that runs with `requestAnimationFrame`.
 * See {@link newAnimation}.
 */
export function startAnimation(animation: RealtimeAnimation) {
    if (animation.isInQueue) {
        return;
    }

    const restartQueue = queue.length === 0;

    queue.push(animation);
    animation.isInQueue = true;

    if (restartQueue) {
        requestAnimationFrame(runAnimation);
    }
}

export function getCurrentNumAnimations() {
    return queue.length;
}


//////////
// Immediate mode rendering API (NEW!)

/**
 * Asserts are used here to catch developer mistakes. 
 *
 * You might want to make this a No-op in production builds, for performance.
 *
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

function userError(): never {
    throw new Error("User error");
}

function devError(): never {
    throw new Error("Dev error");
}

type ImmediateModeArray<T> = {
    items: T[];
    expectedLength: number;
    idx: number;
};

function newImArray<T>(): ImmediateModeArray<T> {
    return {
        items: [],
        expectedLength: -1,
        idx: -1,
    };
}

function imGetNext<T>(arr: ImmediateModeArray<T>): T | undefined {
    arr.idx++;

    if (arr.idx < arr.items.length) {
        return arr.items[arr.idx];
    }

    if (arr.idx === arr.items.length) {
        if (arr.expectedLength === -1) {
            return undefined;
        }

        // Once an immediate mode array has been finalized, every subsequent render must create the same number of things.
        // In this case, you've rendered too many things.
        assert(false);
    }

    // DEV: whenever imGetNext returns undefined, we should be pushing stuff to the array.
    assert(false);
}

function imPush<T>(arr: ImmediateModeArray<T>, value: T): T {
    // DEV: Pushing to an immediate mode array after it's been finalized is always a mistake
    assert(arr.expectedLength === -1);
    assert(arr.items.length === arr.idx);

    arr.items.push(value);

    return value;
}

function imReset(arr: ImmediateModeArray<unknown>) {
    if (arr.expectedLength === -1) {
        if (arr.idx !== -1) {
            arr.expectedLength = arr.items.length;
        }
    } else {
        // Once an immediate mode array has been finalized, every subsequent render must create the same number of things.
        // In this case, you've rendered too few(?) things.
        assert(arr.expectedLength === arr.items.length);
    }

    arr.idx = -1;
}

type ValidElement = HTMLElement | SVGElement;
type StyleObject<U extends ValidElement> = (U extends HTMLElement ? keyof HTMLElement["style"] : keyof SVGElement["style"]);

// Similar to React's useBlah hook pattern, but I've decided to not call it a 'hook' because that is a meaningless name.
const ITEM_UI_ROOT = 1;
const ITEM_LIST = 2;
const ITEM_STATE = 3;
type UIChildRootItem = {
    t: typeof ITEM_UI_ROOT;
    v: UIRoot<ValidElement>;
};
type ListRendererItem = {
    t: typeof ITEM_LIST;
    v: ListRenderer;
};
type StateItem  = {
    t: typeof ITEM_STATE;
    v: unknown;
};

type UIRootItem = UIChildRootItem | ListRendererItem | StateItem;

type DomRoot<E extends ValidElement = ValidElement> = {
    root: E;
    currentIdx: number;
};

function resetDomRoot(domRoot: DomRoot, idx = -1) {
    domRoot.currentIdx = idx;
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

class UIRoot<E extends ValidElement = ValidElement> {
    readonly root: E;
    readonly domRoot: DomRoot<E>;
    readonly type: string;

    readonly items = newImArray<UIRootItem>();
    openListRenderers = 0;
    hasRealChildren = false;
    manuallyHidden = false;

    readonly styles = newImArray<[string, string]>();
    readonly classes = newImArray<[string, boolean]>();
    readonly attributes = newImArray<[string, string | null]>();

    // Users should call `newUiRoot` instead.
    constructor(domRoot: DomRoot<E>, type: string) {
        this.root = domRoot.root;
        this.domRoot = domRoot;
        this.type = type;
    }

    get isFirstRender() {
        return this.items.expectedLength === -1;
    }

    // TODO: think of how we can remove this 
    __begin(idx?: number) {
        resetDomRoot(this.domRoot, idx);

        imReset(this.items);
        imReset(this.classes);
        imReset(this.styles);
        imReset(this.attributes);

        // DEV: If this is negative, I fkd up (I decremented this thing too many times) 
        // User: If this is positive, u fked up (You forgot to finalize an open list)
        assert(this.openListRenderers === 0);
    }

    s<K extends (keyof E["style"])>(key: K, value: string) {
        return this.setSyle(key, value);
    }

    setSyle<K extends (keyof E["style"])>(key: K, value: string) {
        let result = imGetNext(this.styles);
        if (!result) {
            result = imPush(this.styles, [key as string, ""]);
        } else {
            // The same styles must always be pushed in the same order
            assert(result[0] === key);
        }

        if (result[1] !== value) {
            result[1] = value;

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
        let existing = imGetNext(this.classes);
        if (!existing) {
            existing = imPush(this.classes, [val, false]);
        } else {
            // The same classes must be toggled in the same order every time
            assert(val === existing[0]);
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
        let existing = imGetNext(this.attributes);
        if (!existing) {
            existing = imPush(this.attributes, [attr, null]);
        } else {
            // The same attributes must be set in the same order every time
            assert(existing[0] === attr);
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
        for (let i = 0; i < this.items.items.length; i++) {
            const item = this.items.items[i];
            if (item.t === ITEM_UI_ROOT) {
                item.v.domRoot.root.remove();
            }
        }
    }
}

/**
 * Since it is so common to do, this is a util to set the display of a component to "None".
 * Also does some type narrowing.
 */
export function setVisible<T>(r: UIRoot, visibleState: T | null | undefined | false | "" | 0): visibleState is T {
    const hiddenState = !visibleState;
    if (r.manuallyHidden === hiddenState) {
        return !!visibleState;
    }

    r.manuallyHidden = hiddenState;
    if (visibleState) {
        r.root.style.setProperty("display", "", "")
    } else {
        r.root.style.setProperty("display", "none", "important")
    }

    return !!visibleState;
}

function el<E extends ValidElement = ValidElement>(r: UIRoot, type: string): UIRoot<E> {
    // Don't render new elements to this thing when you have a list renderer that is active!
    // render to that instead.
    assert(r.openListRenderers === 0);

    let result = imGetNext(r.items);
    if (!result) {
        // Kinda need to trust the user on this one...
        const newElement = document.createElement(type) as E;
        const newUiRoot = new UIRoot({ root: newElement, currentIdx: -1 }, type);
        result = imPush(r.items, { t: ITEM_UI_ROOT, v: newUiRoot });
    }

    if (result.t !== ITEM_UI_ROOT) {
        // The same hooks must be called in the same order every time
        userError();
    }

    // The same hooks must be called in the same order every time
    assert(result.v.type === type);

    appendToDomRoot(r.domRoot, result.v.domRoot.root);
    result.v.__begin();
    return result.v as UIRoot<E>;
}

function getState<T>(r: UIRoot, supplier: () => T): T {
    // Don't render new elements to this thing when you have a list renderer that is active!
    // render to that instead.
    assert(r.openListRenderers === 0);

    let result = imGetNext(r.items);
    if (!result) {
        result = imPush(r.items, { t: ITEM_STATE, v: supplier() });
    } else {
        if (result.t !== ITEM_STATE) {
            // The same hooks must be called in the same order every time
            userError();
        }
    }

    return result.v as T;
}

function beginList(r: UIRoot): ListRenderer {
    let result = imGetNext(r.items);
    if (!result) {
        result = imPush(r.items, { t: ITEM_LIST, v: new ListRenderer(r) });
    }

    // The same hooks must be called in the same order every time
    if (result.t !== ITEM_LIST) {
        userError();
    }

    result.v.begin();
    r.openListRenderers++;

    return result.v;
}

function list(r: UIRoot, listRenderFn: (l: ListRenderer) => void) {
    const list = beginList(r);
    listRenderFn(list);
    list.end();
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
        result.__begin(result.domRoot.currentIdx);
        this.builderIdx++;

        return result;
    }

    end() {
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

type RenderFn<T extends ValidElement = ValidElement> = (r: UIRoot) => void;

function div(r: UIRoot, next?: RenderFn<HTMLDivElement>) {
    const result = el<HTMLDivElement>(r, "div");
    next?.(result);
    return result;
}

function span(r: UIRoot, next?: RenderFn<HTMLDivElement>) {
    const result = el<HTMLSpanElement>(r, "span");
    next?.(result);
    return result;
}

function text(r: UIRoot, text: string) {
    // Don't overwrite actual dom elements with text!
    assert(!r.hasRealChildren);

    if (r.root.textContent !== text) {
        r.root.textContent = text;
    }
}

type Component = () => RenderFn;

// so fkn stupid...
function component(r: UIRoot, c: Component) {
    r.__begin();
    const Component = getState(r, c);
    Component(r);
}

function Button(r: UIRoot, buttonText: string, onClick: () => void) {
    const root = div(r);
    {
        const b = el(root, "button");
        text(b, buttonText);
        b.root.onmousedown = onClick;
    }

    return root;
}

function Slider(root: UIRoot, labelText: string, onChange: (val: number) => void) {
    const r = div(root);
    {
        const label = el(r, "LABEL").a("for", labelText);
        text(label, labelText);

        const input = el<HTMLInputElement>(r, "INPUT")
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

function canAnimate(r: UIRoot) {
    return !r.manuallyHidden && r.root.isConnected;
}

function realtime(r: UIRoot, fn: RenderFn) {
    let rerenderPoint = r.domRoot.currentIdx;

    fn(r);

    const animation = getState(r, () => {
        return newAnimation(() => {
            r.__begin(rerenderPoint);
            fn(r);
            return canAnimate(r);
        })
    });
    startAnimation(animation);
}

function WallClock(r: UIRoot) {
    realtime(r, r => {
        const value = getState(r, () => ({ val: 0 }));
        value.val += (-0.5 + Math.random()) * 0.02;
        if (value.val > 1) value.val = 1;
        if (value.val < -1) value.val = -1;
        div(r, r => {
            text(r, "brownian motion: " + value.val + "");
        });
        list(r, l => {
            let n = value.val < 0 ? 1 : 2;

            for (let i = 0; i < n; i++) {
                const r = l.getNext();
                div(r, r => {
                    text(r, new Date().toISOString());
                });
            }
        })
    });
}

function App() {
    let t = 0;
    let count = 100;
    let period = 2;

    function setPeriod(val: number) {
        period = val;
        rerenderApp();
    }

    function refresh() {
        rerenderApp();
    }

    function incrementCount() {
        count += 1000;
        rerenderApp();
    }

    function decrementCount() {
        count -= 1000;
        rerenderApp();
    }

    function renderApp(r: UIRoot) {
        div(r, r => {
            text(div(r), "Hello world! ");
            text(div(r), "Lets fkng go! ");
            text(div(r), "Count: " + count);
            text(div(r), "Period: " + period);
            div(r, r => {
                r.isFirstRender && r
                    .s("height", "5px")
                    .s("backgroundColor", "black");
            });
            div(r, r => {
                if (r.isFirstRender) {
                    r.s("padding", "10px")
                        .s("border", "1px solid black")
                        .s("display", "inline-block");
                }

                WallClock(r);
            })
        })

        list(r, l => {
            for (let i = 0; i < 10; i++) {
                list(r, l => {
                    for (let i = 0; i < count / 10; i++) {
                        const r = l.getNext();
                        span(r, r => {
                            text(r, "A");

                            r.isFirstRender && r.s("display", "inline-block");
                            r.s("transform", `translateY(${Math.sin(t + (2 * Math.PI * (i / period))) * 50}px)`);
                        });
                    }
                });
            }
        });

        div(r, r => {
            r.isFirstRender && r
                .s("position", "fixed")
                .s("bottom", "10px").s("left", "10px");

            Slider(r, "period", setPeriod);
            Button(r, "Increment count", incrementCount);
            Button(r, "Refresh", refresh);
            Button(r, "Decrement count", decrementCount);
        }); 
    }

    return renderApp;
}


const appRoot = newUiRoot(document.body);

function rerenderApp() { 
    component(appRoot, App);
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
