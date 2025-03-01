///////// Immediate-mode dom renderer. 
// This API prioritizes code aesthetics and colocation of logic over
// other important considerations, like performance, and ease of
// understandability. It was fun to write. It may not be as fun to use,
// but I want to see if the lambdas are optimized or not...

import { newAnimation, RealtimeAnimation, startAnimation } from "./animation-queue";
import { assert, userError } from "./assert";
import { imGetNext, imLockSize, imPush, imReset, newImArray } from "./im-array";



export type ValidElement = HTMLElement | SVGElement;
export type StyleObject<U extends ValidElement> = (U extends HTMLElement ? keyof HTMLElement["style"] : keyof SVGElement["style"]);

// Similar to React's useBlah hook pattern, but I've decided to not call it a 'hook' because that is a meaningless name.
const ITEM_UI_ROOT = 1;
const ITEM_LIST = 2;
const ITEM_STATE = 3;
const ITEM_RERENDER_POINT = 4;
export type UIChildRootItem = {
    t: typeof ITEM_UI_ROOT;
    v: UIRoot<ValidElement>;
};
export type ListRendererItem = {
    t: typeof ITEM_LIST;
    v: ListRenderer;
};
export type StateItem  = {
    t: typeof ITEM_STATE;
    v: unknown;
    supplier: () => unknown;
};
export type RerenderPointItem = {
    t: typeof ITEM_RERENDER_POINT;
    v: RerenderPoint;
}

export type UIRootItem = UIChildRootItem | ListRendererItem | StateItem;

export type DomRoot<E extends ValidElement = ValidElement> = {
    root: E;
    currentIdx: number;
};

export function resetDomRoot(domRoot: DomRoot, idx = -1) {
    domRoot.currentIdx = idx;
}

export function appendToDomRoot(domRoot: DomRoot, child: ValidElement) {
    domRoot.currentIdx++;
    setChildAtEl(domRoot.root, domRoot.currentIdx, child);
}

export function setChildAtEl(root: Element, i: number, child: Element) {
    const children = root.children;

    if (i === children.length) {
        root.appendChild(child);
    } else if (children[i] !== child) {
        // TODO: compare insertBefore performance with replaceChild. I reckon insertBefore is faster in most cases
        root.insertBefore(child, children[i]);
    }
}

export type RerenderPoint =  {
    domRootIdx: number;
    itemsIdx: number;
    stylesIdx: number;
    classesIdx: number;
    attributesIdx: number;
}

export class UIRoot<E extends ValidElement = ValidElement> {
    readonly root: E;
    readonly domRoot: DomRoot<E>;
    readonly type: string;

    readonly items = newImArray<UIRootItem>();
    openListRenderers = 0;
    hasRealChildren = false;
    manuallyHidden = false;
    ifStatementOpen = false;
    removed = false;

    readonly styles = newImArray<[string, string]>();
    readonly classes = newImArray<[string, boolean]>();
    readonly attributes = newImArray<[string, string | null]>();

    // Users should call `newUiRoot` instead.
    constructor(domRoot: DomRoot<E>, type: string) {
        this.root = domRoot.root;
        this.domRoot = domRoot;
        this.type = type;
    }

    isFirstRenderCall = true;
    isSecondRenderCall = false;
    get isFirstRender() {
        return this.isFirstRenderCall;
    }

    // TODO: think of how we can remove this, from user code at the very least.
    __begin(rp?: RerenderPoint) {
        resetDomRoot(this.domRoot, rp?.domRootIdx);

        imReset(this.items, rp?.itemsIdx);
        imReset(this.classes, rp?.classesIdx);
        imReset(this.styles, rp?.stylesIdx);
        imReset(this.attributes, rp?.attributesIdx);

        // DEV: If this is negative, I fkd up (I decremented this thing too many times) 
        // User: If this is positive, u fked up (You forgot to finalize an open list)
        assert(this.openListRenderers === 0);
        this.ifStatementOpen = false;

        this.removed = false;
    }

    // Only lock the size if we reach the end without the component throwing errors. 
    __end() {
        if (this.isFirstRenderCall) {
            imLockSize(this.items);
            this.isFirstRenderCall = false;
            this.isSecondRenderCall = true;
            return;
        }

        if (this.isSecondRenderCall) {
            // Allow setting these on the first render call without contributing to the immediate mode array.

            imLockSize(this.classes);
            imLockSize(this.styles);
            imLockSize(this.attributes);
            this.isSecondRenderCall = false;
            return;
        }
    }

    s<K extends (keyof E["style"])>(key: K, value: string) {
        this.setSyle(key, value);
    }

    setSyle<K extends (keyof E["style"])>(key: K, value: string) {
        if (this.isFirstRenderCall) {
            this.root.style.setProperty(key as string, value);
            return;
        }

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
    }

    // NOTE: the effect of this method will persist accross renders
    c(val: string, enabled: boolean = true) {
        this.setClass(val, enabled);
    }

    // NOTE: the effect of this method will persist accross renders
    setClass(val: string, enabled: boolean = true) {
        if (this.isFirstRenderCall) {
            if (enabled) {
                this.root.classList.add(val);
            } else {
                this.root.classList.remove(val);
            }
            return;
        }

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
    }

    attr(attr: string, val: string) {
        this.setAttribute(attr, val);
    }

    a(attr: string, val: string) {
        this.setAttribute(attr, val);
    }

    setAttribute(attr: string, val: string) {
        if (this.isFirstRenderCall) {
            if (val !== null) {
                this.root.setAttribute(attr, val);
            } else {
                this.root.removeAttribute(attr);
            }
            return;
        }

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
    }

    // NOTE: If this is being called before we've rendered any components here, it should be ok.
    // if it's being called during a render, then that is typically an incorrect usage - the domRoot's index may or may not be incorrect now, because
    // we will have removed HTML elements out from underneath it. You'll need to ensure that this isn't happening in your use case.
    __removeAllDomElements() {
        this.removed = true;
        for (let i = 0; i < this.items.items.length; i++) {
            const item = this.items.items[i];
            if (item.t === ITEM_UI_ROOT) {
                item.v.domRoot.root.remove();
            } else if (item.t === ITEM_LIST) {
                // needs to be fully recursive. because even though our UI tree is like
                //
                // -list
                //   -list
                //     -list
                // 
                // They're still all rendering to the same DOM root!!!
                item.v.__removeAllDomElementsFromList();
            }
        }
    }
}

export class ListRenderer {
    uiRoot: UIRoot;
    builders: UIRoot[] = [];
    builderIdx = 0;
    hasBegun = false;

    constructor(root: UIRoot) {
        this.uiRoot = root;
    }

    __begin() {
        // DEV: Don't begin a list twice. (A user usually doesn't have to begin a list themselves)
        assert(!this.hasBegun);

        this.hasBegun = true;
        this.builderIdx = 0;
        this.uiRoot.openListRenderers++;
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
        const currentDomRootIdx = result.domRoot.currentIdx;
        result.__begin(undefined);
        result.domRoot.currentIdx = currentDomRootIdx;
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

        // remove all the UI components that may have been added by other builders in the previous render.
        for (let i = this.builderIdx; i < this.builders.length; i++) {
            this.builders[i].__removeAllDomElements();
        }
        this.builders.length = this.builderIdx;
    }

    // kinda have to assume that it's valid to remove these elements.
    __removeAllDomElementsFromList() {
        for (let i = 0; i < this.builders.length; i++) {
            this.builders[i].__removeAllDomElements();
        }
    }

}

export function newUiRoot<E extends ValidElement>(root: E): UIRoot<E> {
    const result = new UIRoot<E>({ root, currentIdx: -1 }, "User created root");
    return result;
}

type RenderFn<T extends ValidElement = ValidElement> = (r: UIRoot<T>) => void;
type RenderFnArgs<A extends unknown[], T extends ValidElement = ValidElement> = (r: UIRoot<T>, ...args: A) => void;

export function beginList(r: UIRoot): ListRenderer {
    let result = imGetNext(r.items);
    if (!result) {
        result = imPush(r.items, { t: ITEM_LIST, v: new ListRenderer(r) });
    }

    // The same hooks must be called in the same order every time
    if (result.t !== ITEM_LIST) {
        userError();
    }

    result.v.__begin();

    return result.v;
}

export function list(r: UIRoot, listRenderFn: (l: ListRenderer) => void) {
    const list = beginList(r);
    listRenderFn(list);
    list.end();
}


export function newRerenderPoint(): RerenderPoint {
    return { domRootIdx: 0, itemsIdx: 0, stylesIdx: 0, classesIdx: 0, attributesIdx: 0 };
}

const FROM_HERE = -1;
const FROM_AFTER_HERE = 0;
const FROM_ONE_AFTER_HERE = 1;
export function getRererenderPoint(r: UIRoot, offset: number): RerenderPoint {
    const state = getState(r, newRerenderPoint);
    state.domRootIdx = r.domRoot.currentIdx;
    state.attributesIdx = r.attributes.idx;
    state.stylesIdx = r.styles.idx;
    state.classesIdx = r.classes.idx;
    state.itemsIdx = r.items.idx + offset;
    return state;
}

///////// Common immediate mode UI helpers

function getStateIntenal<T>(r: UIRoot, supplier: () => T, skipSupplierCheck: boolean): T {
    // Don't render new elements to this thing when you have a list renderer that is active!
    // render to that instead.
    assert(r.openListRenderers === 0);

    let result = imGetNext(r.items);
    if (!result) {
        result = imPush(r.items, { t: ITEM_STATE, v: supplier(), supplier });
    } else {
        if (result.t !== ITEM_STATE) {
            // The same hooks must be called in the same order every time
            userError();
        }

        if (!skipSupplierCheck && supplier !== result.supplier) {
            // The same hooks must be called in the same order every time.
            // If you have two hooks for the same kind of state but in a different order, this assertion won't catch that bug.
            // but I doubt you would ever be writing code like that...
            userError();
        }
    }

    return result.v as T;
}

/**
 * This method returns a stable reference to some state, allowing your component to maintain
 * state between rerenders. This only works because of the 'rules of immediate mode state' idea
 * this framework is built upon, which are basically the same as the 'rule of hooks' from React,
 * except it extends to all immediate mode state that we want to persist and reuse between rerenders, 
 * including ui components.
 *
 * This method expects that you pass in the same supplier every time.
 * This catches out-of-order hook rendering bugs, so it's better to use this where possible. 
 *
 * Sometimes, it is just way easier to do the state inline:
 * ```
 *      const s = getState(r, () => { ... some state } );
 * ```
 *
 * In which case, you'll need to use getDynamicState instead. But try not to!
 */
export function getState<T>(r: UIRoot, supplier: () => T): T {
    return getStateIntenal(r, supplier, false);
}

/**
 * WARNING: using this method won't allow you to catch out-of-order hook-rendering bugs at runtime, 
 * leading to potential data corruption. use this at your own peril.
 */
export function getUnsafeState<T>(r: UIRoot, supplier: () => T): T {
    return getStateIntenal(r, supplier, true);
}

export function el<E extends ValidElement = ValidElement>(r: UIRoot, type: string, next?: RenderFn<E>): UIRoot<E> {
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

    // The lambda API only exists because we can't shadow a variable with an expresion that uses itself.
    // i.e if we could do something like this:
    //
    // ```
    // const r = div(r);
    // r.begin(); {
    //      r = div(r);
    // }
    // r.end();
    //
    // Then I would.
    // ```

    next?.(result.v as UIRoot<E>);

    result.v.__end();

    return result.v as UIRoot<E>;
}

export function div(r: UIRoot, next?: RenderFn<HTMLDivElement>): UIRoot<HTMLDivElement> {
    return el<HTMLDivElement>(r, "div", next);
}

export function span(r: UIRoot, next?: RenderFn<HTMLSpanElement>): UIRoot<HTMLSpanElement> {
    return el<HTMLSpanElement>(r, "span", next);
}

export function If(condition: boolean, r: UIRoot, next: RenderFn) {
    r.ifStatementOpen = true;
    ElseIf(condition, r, next);
}

export function Else(r: UIRoot, next: RenderFn) {
    ElseIf(true, r, next);
}

export function ElseIf(condition: boolean, r: UIRoot, next: RenderFn) {
    list(r, l => {
        if (r.ifStatementOpen && condition) {
            r.ifStatementOpen = false;
            next(l.getNext());
        }
    });
}

export function text(r: UIRoot, text: string) {
    // Don't overwrite actual dom elements with text!
    assert(!r.hasRealChildren);

    if (r.root.textContent !== text) {
        r.root.textContent = text;
    }
}

function canAnimate(r: UIRoot) {
    return !r.removed && !r.manuallyHidden;
}

// The `rerender` method resets `r`'s current immediate mode state index to 1 before the call to `rerenderFn`, and the invokes
// the render method you passed in. It relies on the fact that every render method will always generate the same number of immediate
// mode state entries each time, so we can reliably just reset some indicies to what they were before we called them, and then 
// simply call them again:
//
// ```
// function App(r: UIRoot) {
//      const rerender = rerenderFn(r, () => App(r));
// }
//
// ```
//
// It won't work if you don't call things in the right order. Here's an example that will fail:
//
// ```
// function IWillThrowAnError(r: UIRoot) {
//      const state = getState(newAppState); 
//      const rerender = renderFn(r, () => IWillThrowAnError(r));
// }
// ```
//
// This is because when we generate `rerender`, getState will have bumped the immedate mode index up by 1, so 
// the index we store will be one higher than what was correct if we wanted to call IWillThrowAnError(r) on the root again.
export function rerenderFn(r: UIRoot, fn: RenderFn) {
    const rerenderPoint = getRererenderPoint(r, FROM_HERE);
    const rerender = () => {
        r.__begin(rerenderPoint);
        fn(r);
    };

    return rerender;
}

function realtimeState(): {
    dt: number;
    animation: RealtimeAnimation | null;
} { 
    return { 
        dt: 0, 
        animation: null,
    };
}

export function realtime(r: UIRoot, fn: RenderFnArgs<[number]>) {
    const rerender = rerenderFn(r, () => realtime(r, fn));

    const state = getState(r, realtimeState);
    if (!state.animation) {
        state.animation = newAnimation((dt) => {
            if (!canAnimate(r)) {
                return false;
            } 

            state.dt = dt;
            rerender();
            return true;
        });
    }

    fn(r, state.dt);

    startAnimation(state.animation);
}

function newIntermittentState() : {
    t: number; ms: number; animation: RealtimeAnimation | null;
} { 
    return { t: 0, ms: 0 , animation: null };
}

export function intermittent(r: UIRoot, fn: RenderFn, ms: number) {
    const rerender = rerenderFn(r, () => realtime(r, fn));

    const state = getState(r, newIntermittentState);
    state.ms = ms;
    if (!state.animation) {
        state.animation = newAnimation((dt) => {
            if (!canAnimate(r)) {
                return false;
            } 

            state.t += dt;
            if (state.t > state.ms) {
                rerender();
                state.t = 0;
            }

            return true;
        });
    }

    fn(r);

    startAnimation(state.animation);
}


export function errorBoundary(
    rIn: UIRoot,
    renderFnNormal: RenderFn,
    renderFnError: RenderFnArgs<[unknown, () => void]>,
) {
    const rerender = rerenderFn(rIn, () => errorBoundary(rIn, renderFnNormal, renderFnError));

    const l = beginList(rIn);
    const r = l.getNext();
    const rError = l.getNext();

    const recover = () => {
        rError.__removeAllDomElements();
        rerender();
    }

    try {
        renderFnNormal(r);
    } catch (error) {
        r.__removeAllDomElements();
        // need to reset the dom root, since we've just removed elements underneath it
        resetDomRoot(r.domRoot);

        renderFnError(rError, error, recover);
    } finally {
        l.end();
    }
}

function newEventHandlerRef<K extends keyof HTMLElementEventMap>(): {
    val: null | ((ev: HTMLElementEventMap[K]) => any);
}{
    return { val: null };
}

/**
 * Seems like simply doing r.root.onwhatever = () => { blah } destroys performance,
 * so this  method exists now...
 */
export function on<K extends keyof HTMLElementEventMap>(
    r: UIRoot,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
) {
    const handler = getState(r, newEventHandlerRef as (typeof newEventHandlerRef<K>));
    if (handler.val === null) {
        handler.val = listener;
        r.root.addEventListener(type, (e) => {
            assert(handler.val);

            // @ts-expect-error I don't have the typescript skill to explain to typescript why this is actually fine.
            handler.val!(e);
        }, options);
    } else {
        handler.val = listener;
    }
}



