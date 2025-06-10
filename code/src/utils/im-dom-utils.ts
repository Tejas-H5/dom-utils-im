// *IM* DOM-utils v0.1.0011 - @Tejas-H5
// A variation on DOM-utils with the immediate-mode API isntead of the normal one. I'm still deciding which one I will continue to use.
// Right now, this one seems better, but the other one has a 'proven' track record of actually working.
// But in a matter of hours/days, I was able to implement features in this framework that I wasn't able to for months/years in the other one...
//
// Conventions:
// - All immediate mode methods should start with 'im', like imState.
// - All immediate mode methods that open up a scope that needs to be closed with a second method must start with `imBegin`, 
//      like `imBeginList()`, `imBeginRoot()`. The finalizers must start with `imEnd`, like `imEndList`, `imEnd`, etc. 
//      The only exceptions are: 
//          - The control-flow helpers: `imIf`, `imElseIf`, `imElse`, `imSwitch`, `imTry`, `imCatch`, `imFor`, `imWhile`.
//          - `imEnd`. It's the same as imEndRoot. Used very often, and since a large number of abstractions end up being just 1 root deep, it can be used
//          to end a lot of different things.
//      Be very conservative when adding your own exceptions to this rule.

import { assert } from "./assert";

///////
// Various seemingly random/arbitrary functions that actually end up being very useful

/** 
 * This jQuery code is taken from: https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
 * This method is mainly used in gobal event handlers to early-return when a UI component isn't visble yet, so
 * it will also return false if the component hasn't been rendered for the first time. 
 */
export function isVisibleEl(el: HTMLElement) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

export function isEditingInput(el: HTMLElement): boolean {
    return document.activeElement === el;
}


/**
 * Sets an input's value while retaining it's selection
 */
export function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
    if (el.value === text) {
        // performance speedup
        return;
    }

    const { selectionStart, selectionEnd } = el;

    el.value = text;

    el.selectionStart = selectionStart;
    el.selectionEnd = selectionEnd;
}

export function isEditingTextSomewhereInDocument(): boolean {
    const type = document.activeElement?.nodeName?.toLowerCase();
    return type === "textarea" || type === "input";
}


// Flags are kinda based. vastly reduces the need for boolean flags, and API is also nicer looking.
export const HORIZONTAL = 1 << 1;
export const VERTICAL = 1 << 2;
export const START = 1 << 3;
export const END = 1 << 4;

/**
 * Scrolls {@link scrollParent} to bring scrollTo into view.
 * {@link scrollToRelativeOffset} specifies where to to scroll to. 0 = bring it to the top of the scroll container, 1 = bring it to the bottom
 */
export function scrollIntoViewVH(
    scrollParent: HTMLElement,
    scrollTo: HTMLElement,
    verticalOffset: number | null = null,
    horizontalOffset: number | null = null,
) {
    if (horizontalOffset !== null) {
        const scrollOffset = horizontalOffset * scrollParent.offsetWidth;
        const elementWidthOffset = horizontalOffset * scrollTo.getBoundingClientRect().width;

        // offsetLeft is relative to the document, not the scroll parent. lmao
        const scrollToElOffsetLeft = scrollTo.offsetLeft - scrollParent.offsetLeft;

        scrollParent.scrollLeft = scrollToElOffsetLeft - scrollOffset + elementWidthOffset;
    }

    if (verticalOffset !== null) {
        // NOTE: just a copy paste from above
        
        const scrollOffset = verticalOffset * scrollParent.offsetHeight;
        const elementHeightOffset = verticalOffset * scrollTo.getBoundingClientRect().height;

        // offsetTop is relative to the document, not the scroll parent. lmao
        const scrollToElOffsetTop = scrollTo.offsetTop - scrollParent.offsetTop;

        scrollParent.scrollTop = scrollToElOffsetTop - scrollOffset + elementHeightOffset;
    }
}

export function scrollIntoViewRect(
    scrollParent: HTMLElement,
    scrollTo: HTMLElement,
    x0: number, y0: number, 
    x1: number, y1: number
) {
    let scrollH: number | null = null;
    let scrollV: number | null = null;

    if (getElementExtentNormalized(scrollParent, scrollTo, VERTICAL | START) < y0) {
        scrollV = y0;
    } else if (getElementExtentNormalized(scrollParent, scrollTo, VERTICAL | END) > y1) {
        scrollV = y1
    }

    if (getElementExtentNormalized(scrollParent, scrollTo, HORIZONTAL | START) < x0) {
        scrollH = x0;
    } else if (getElementExtentNormalized(scrollParent, scrollTo, HORIZONTAL | END) > x1) {
        scrollH = x1;
    }

    scrollIntoViewVH(scrollParent, scrollTo, scrollV, scrollH);
}

export function getElementExtentNormalized(
    scrollParent: HTMLElement,
    scrollTo: HTMLElement,
    flags = VERTICAL | START
) {
    if (flags & VERTICAL) {
        const scrollOffset = scrollTo.offsetTop - scrollParent.scrollTop - scrollParent.offsetTop;

        if (flags & END) {
            return (scrollOffset + scrollTo.getBoundingClientRect().height) / scrollParent.offsetHeight;
        } else {
            return scrollOffset / scrollParent.offsetHeight;
        }
    } else {
        // NOTE: This is just a copy-paste from above. 
        // I would paste a vim-macro here, but it causes all sorts of linting errors.

        const scrollOffset = scrollTo.offsetLeft - scrollParent.scrollLeft - scrollParent.offsetLeft;

        if (flags & END) {
            return (scrollOffset + scrollTo.getBoundingClientRect().width) / scrollParent.offsetWidth;
        } else {
            return scrollOffset / scrollParent.offsetWidth;
        }
    }
}

///////// 
// The immediate-mode rendering API.
// You might think I made this for performance, but I didn't. 
// What I really wanted, was a UI framework that lets me colocate logic and UI, and composes correctly
// i.e There is never a scenario where I _have_ to create a function or a class to get some sort of 
// component-like behavior, and I can put 'state' as close to some UI as needed, so that we can
// evolve better abstractions.

function renderStub() {}

export type ImContext = {
    currentStack: (UIRoot | ListRenderer)[];
    // Only one of these is defined at a time.
    currentRoot: UIRoot | undefined;
    currentListRenderer: ListRenderer | undefined;
    initialized: boolean;
    deinitialized: boolean;

    imDisabled: boolean;
    appRoot: UIRoot;

    renderFn: () => void;

    keyboard: ImKeyboardState;
    mouse: ImMouseState;

    dtSeconds: number;
    lastTime: number;
    time: number;
    isRendering: boolean;
    _isExcessEventRender: boolean;

    globalEventHandlers: {
        mousedown:  (e: MouseEvent) => void;
        mousemove:  (e: MouseEvent) => void;
        mouseenter: (e: MouseEvent) => void;
        mouseup:    (e: MouseEvent) => void;
        wheel:      (e: WheelEvent) => void;
        keydown:    (e: KeyboardEvent) => void;
        keyup:      (e: KeyboardEvent) => void;
        blur:       () => void;
    };

    /** These are used to display performance metrics in the UI. */
    itemsRendered: number;
    itemsRenderedLastFrame: number;
};

const ITEM_LIST_RENDERER = 2;
const ITEM_UI_ROOT = 1;
const ITEM_STATE = 3;

/**
 * Don't forget to initialize this context with {@link initImDomUtils}
 */
export function newImContext(root: HTMLElement = document.body): ImContext {
    const keyboard: ImKeyboardState = {
        keyDown: null,
        keyUp: null,
        blur: false,
    };

    const mouse: ImMouseState = {
        lastX: 0,
        lastY: 0,

        leftMouseButton: false,
        middleMouseButton: false,
        rightMouseButton: false,
        hasMouseEvent: false,

        dX: 0,
        dY: 0,
        X: 0,
        Y: 0,

        /**
         * NOTE: if you want to use this, you may have to prevent normal scroll event propagation.
         * See {@link imPreventScrollEventPropagation}
         */
        scrollWheel: 0,

        clickedElement: null,
        lastClickedElement: null,
        lastClickedElementOriginal: null,
        hoverElement: null,
        hoverElementOriginal: null,
    };

    const ctx: ImContext = {
        currentStack: [],
        currentRoot: undefined,
        currentListRenderer: undefined,
        initialized: false,
        deinitialized: false,
        imDisabled: false,
        appRoot: newUiRoot(() => root),

        renderFn: renderStub,

        keyboard,
        mouse,

        dtSeconds: 0,
        lastTime: 0,
        time: 0,
        isRendering: false,
        _isExcessEventRender: false,

        itemsRendered: 0,
        itemsRenderedLastFrame: 0,

        // Event handlers
        globalEventHandlers: {
            mousedown: (e: MouseEvent) => {
                const { mouse } = ctx;
                setClickedElement(ctx, e.target);
                mouse.hasMouseEvent = true;
                if (e.button === 0) {
                    mouse.leftMouseButton = true;
                } else if (e.button === 1) {
                    mouse.middleMouseButton = true;
                } else if (e.button === 2) {
                    mouse.rightMouseButton = true;
                }
            },
            mousemove: (e: MouseEvent) => {
                const { mouse } = ctx;
                mouse.lastX = mouse.X;
                mouse.lastY = mouse.Y;
                mouse.X = e.clientX;
                mouse.Y = e.clientY;
                mouse.dX += mouse.X - mouse.lastX;
                mouse.dY += mouse.Y - mouse.lastY;
                mouse.hoverElementOriginal = e.target;
            },
            mouseenter: (e: MouseEvent) => {
                const { mouse } = ctx;
                mouse.hoverElementOriginal = e.target;
            },
            mouseup: (e: MouseEvent) => {
                const { mouse } = ctx;
                if (mouse.hasMouseEvent) {
                    return;
                }
                if (e.button === 0) {
                    mouse.leftMouseButton = false;
                } else if (e.button === 1) {
                    mouse.middleMouseButton = false;
                } else if (e.button === 2) {
                    mouse.rightMouseButton = false;
                }
            },
            wheel: (e: WheelEvent) => {
                const { mouse } = ctx;
                mouse.scrollWheel += e.deltaX + e.deltaY + e.deltaZ;
                mouse.hoverElementOriginal = e.target;
                e.preventDefault();
            },
            keydown: (e: KeyboardEvent) => {
                const { keyboard } = ctx;
                keyboard.keyDown = e;
                rerenderImContext(ctx, ctx.lastTime, true);
            },
            keyup: (e: KeyboardEvent) => {
                const { keyboard } = ctx;
                keyboard.keyUp = e;
                rerenderImContext(ctx, ctx.lastTime, true);
            },
            blur: () => {
                resetMouseState(ctx, true);
                resetKeyboardState(ctx);
                ctx.keyboard.blur = true;
                rerenderImContext(ctx, ctx.lastTime, true);
            }
        },
    };
    return ctx;
}

/** 
 * NOTE: some atypical usecases require multiple contexts,
 * so make sure that your event handlers capture the one that is current
 * _at the time of adding the event_.
 *
 * Wrong:
 * ```ts
 * resizeObserver.onResize(() => {
 *      rerenderContext(imCtx);
 * })
 * ```
 *
 * Right:
 * ```ts
 * const ctx = imCtx;
 * resizeObserver.onResize(() => {
 *      rerenderContext(ctx);
 * })
 * ```
 */
const defaultContext = newImContext();

// Contains ALL the state. Depending on the usecase, there may be multiple contexts that must switch between each other.
let imCtx = defaultContext;

export type ValidElement = HTMLElement | SVGElement;
export type StyleObject<U extends ValidElement> = (U extends HTMLElement ? keyof HTMLElement["style"] : keyof SVGElement["style"]);

export type StateItem  = {
    t: typeof ITEM_STATE;
    v: unknown;
    supplier: () => unknown;
};

export type UIRootItem = UIRoot | ListRenderer | StateItem;

export type DomAppender<E extends ValidElement = ValidElement> = {
    root: E;
    idx: number;
};

export function resetDomAppender(domAppender: DomAppender, idx = -1) {
    domAppender.idx = idx;
}

export function appendToDomRoot(domAppender: DomAppender, child: ValidElement) {
    const i = ++domAppender.idx;

    const root = domAppender.root;
    const children = root.children;

    if (i === children.length) {
        root.appendChild(child);
    } else if (children[i] !== child) {
        root.insertBefore(child, children[i]);
    }
}

export type RenderPoint =  {
    domAppenderIdx: number;
    itemsIdx: number;
}

function newRenderPoint(): RenderPoint {
    return {
        domAppenderIdx: -1,
        itemsIdx: -1
    };
}

export function imRenderPoint() {
    const s = imState(newRenderPoint);
    return s;
}

export function getRenderPoint(p: RenderPoint) {
    const root = getCurrentRoot();
    p.itemsIdx = root.itemsIdx;
    p.domAppenderIdx = root.domAppender.idx;
}

export function setRenderPoint(p: RenderPoint) {
    const root = getCurrentRoot();
    startRendering(root, p.domAppenderIdx, p.itemsIdx);
}

/**
 * Whenever your app starts rendering, a {@link UIRoot} backed by the DOM root is pushed onto {@link currentStack}.
 * {@link imBeginRoot} will create a {@link UIRoot} backed by a custom DOM node, and push it onto {@link currentStack}.
 * {@link imEnd} will pop a {@link UIRoot} from {@link currentStack}.
 * {@link getCurrentRoot} can be used to get the current UIRoot.
 *
 * ```ts
 * function imApp() {
 *     r = getCurrentRoot()  // assertion failed - no current root
 *     imDiv(); {
 *          r = getCurrentRoot() // div that we rendered above
 *     } imEnd();
 *     r = getCurrentRoot()  // assertion failed - no current root
 * }
 * ```
 *
 * In the first render, any number of things can be rendered. 
 * To be more specific, a 'thing' is an immediate mode state entry. 
 * Only 3 methods can create im-state entries - {@link imBeginRoot}, {@link imState}, and {@link imBeginList}.
 * In every subsequent render, the same number of im-state entries must be 'created' in the same order.
 * This is because in subsequent renders, calls to the im-state functions don't recreate state, but 
 * increment an array index, and retrieve the state they created in the first render.
 * 
 * For example:
 *
 * ```ts
 * // Valid
 * function imApp() {
 *     imDiv(); imEnd();
 * }
 *
 * // Not valid
 * let n = 0;
 * function imApp() {
 *      n++;
 *      for (let i = 0; i < n; i++) {
 *          // As soon as n is incremented, the app will (ideally) throw an Error, complaining about a different number of 
 *          // things being rendered.
 *          imDiv(); imEnd{}; 
 *      }
 * }
 *
 * // Also not valid
 * let n = 0;
 * function imApp() {
 *      n++
 *      if (n < 10) {
 *          Component1();
 *      } else {
 *          // This is especially bad, because every im-state call in Component2 will retrieve state that was
 *          // created by Component1, and none of it will line up at all. You will corrupt your data, basically.
 *          // I haven't been able to think of any good safeguards against this.
 *          Component2();   
 *      }
 * }
 *
 * ```
 *
 * Then how the heck do we do conditional rendering, or list rendering, AKA anything actually useful?
 * You'll need to take a look at:
 * list rendering:
 *      {@link imBeginList}.
 * conditional rendering helpers (they are just variants on `imList`):
 *      {@link imIf}
 *      {@link imElseIf}
 *      {@link imElse}
 * control flow helpers (they are also just variants on `imList`):
 *      {@link imTry}
 *      {@link imCatch}
 *      {@link imSwitch}
 *
 */
export type UIRoot<E extends ValidElement = ValidElement> = {
    readonly t: typeof ITEM_UI_ROOT;

    readonly root: E;
    readonly domAppender: DomAppender<E>;
    // If there was no supplier, then this root is attached to the same DOM element as another UI root that does have a supplier.
    readonly elementSupplier: (() => ValidElement) | null;

    readonly destructors: (() => void)[];

    readonly items: UIRootItem[];

    itemsIdx: number;

    hasRealChildren: boolean;   // can we add text to this element ?
    destroyed: boolean;         // have we destroyed this element ?
    completedOneRender: boolean; // have we completed at least one render ?

    lastText: string;
};

export function newUiRoot<E extends ValidElement>(supplier: (() => E) | null, domAppender: DomAppender<E> | null = null): UIRoot<E> {
    let root: E | undefined;
    if (domAppender === null) {
        assert(supplier !== null);
        root = supplier();
        domAppender = { root, idx: -1  };
    } else {
        assert(domAppender !== null);
        root = domAppender.root;
    }

    return {
        t: ITEM_UI_ROOT,
        root,
        domAppender,
        // If there was no supplier, then this root is attached to the same DOM element as another UI root that does have a supplier.
        elementSupplier: supplier, 
        destructors: [],
        items: [],
        itemsIdx: -1,
        hasRealChildren: false,
        destroyed: false,
        completedOneRender: false,

        lastText: "",
    }
}


function __beginUiRoot(r: UIRoot, startDomIdx: number, startItemIdx: number) {
    resetDomAppender(r.domAppender, startDomIdx);
    r.itemsIdx = startItemIdx;
    pushRoot(r);

    // NOTE: avoid any more asertions here - the component may error out, and
    // __end may not get called. No I'm not going to catch it with an exception stfu. We livin on the edge, bois.
}

function isDerived(r: UIRoot) {
    return r.elementSupplier === null;
}

function assertNotDerived(r: UIRoot) {
    // When elementSupplier is null, this is because the root is not the 'owner' of a particular DOM element - 
    // rather, we got it from a ListRenderer somehow - setting attributes on these React.fragment type roots is always a mistake
    assert(isDerived(r) === false);
}


export function setClass(val: string, enabled: boolean | number = true) {
    const r = getCurrentRoot();

    if (enabled) {
        r.root.classList.add(val);
    } else {
        r.root.classList.remove(val);
    }

    return !!enabled;
}

export function setInnerText(text: string, r = getCurrentRoot()) {
    // don't overwrite the real children!
    assert(r.hasRealChildren === false);

    assertNotDerived(r);

    if (r.lastText !== text) {
        r.lastText = text;

        if (r.root.childNodes.length === 0) {
            r.root.appendChild(document.createTextNode(text));
        } else {
            const textNode = r.root.childNodes[0];
            textNode.nodeValue = text;
        }
    }
}

export function setAttrElement(e: ValidElement, attr: string, val: string | null) {
    if (val !== null) {
        e.setAttribute(attr, val);
    } else {
        e.removeAttribute(attr);
    }
}

export function setAttr(k: string, v: string, r = getCurrentRoot()) {
    return setAttrElement(r.root, k, v);
}

export function getAttr(k: string, r = getCurrentRoot()) : string {
    return r.root.getAttribute(k) || "";
}

export function __onRemoveUiRoot(r: UIRoot, destroy: boolean) {
    for (let i = 0; i < r.items.length; i++) {
        const item = r.items[i];
        if (item.t === ITEM_UI_ROOT) {
            __onRemoveUiRoot(item, destroy);
        } else if (item.t === ITEM_LIST_RENDERER) {
            const l = item;
            for (let i = 0; i < l.builders.length; i++) {
                __onRemoveUiRoot(l.builders[i], destroy);
            }
            if (l.keys) {
                for (const v of l.keys.values()) {
                    __onRemoveUiRoot(v.root, destroy);
                }
            }
        }
    }

    if (destroy) {
        // Don't call r twice.
        assert(r.destroyed === false);
        r.destroyed = true;

        for (const d of r.destructors) {
            try {
                d();
            } catch (e) {
                console.error("A destructor threw an error: ", e);
            }
        }
    }
}


// NOTE: If this is being called before we've rendered any components here, it should be ok.
// if it's being called during a render, then that is typically an incorrect usage - the domAppender's index may or may not be incorrect now, because
// we will have removed HTML elements out from underneath it. You'll need to ensure that this isn't happening in your use case.
export function __removeAllDomElementsFromUiRoot(r: UIRoot, destroy: boolean) {
    for (let i = 0; i < r.items.length; i++) {
        const item = r.items[i];
        if (item.t === ITEM_UI_ROOT) {
            item.domAppender.root.remove();
            __onRemoveUiRoot(item, destroy);
        } else if (item.t === ITEM_LIST_RENDERER) {
            // needs to be fully recursive. because even though our UI tree is like
            //
            // -list
            //   -list
            //     -list
            // 
            // They're still all rendering to the same DOM root!!!
            
            const l = item;
            for (let i = 0; i < l.builders.length; i++) {
                __removeAllDomElementsFromUiRoot(l.builders[i], destroy);
            }
            if (l.keys) {
                for (const v of l.keys.values()) {
                    __removeAllDomElementsFromUiRoot(v.root, destroy);
                }
            }
        }
    }
}

export function addDestructor(r: UIRoot, destructor: () => void) {
    r.destructors.push(destructor);
}

type ValidKey = string | number | Function | object;

export type ListRenderer = {
    readonly t: typeof ITEM_LIST_RENDERER;
    readonly uiRoot: UIRoot;

    readonly builders: UIRoot[];
    keys: Map<ValidKey, { root: UIRoot, rendered: boolean }> | undefined;

    builderIdx: number;
    current: UIRoot | null;
}

function __beginListRenderer(l: ListRenderer) {
    l.builderIdx = 0;
    if (l.keys) {
        for (const v of l.keys.values()) {
            v.rendered = false;
        }
    }
    l.current = null;
    pushList(l);
}

export type RenderFn<T extends ValidElement = ValidElement> = (r: UIRoot<T>) => void;
export type RenderFnArgs<A extends unknown[], T extends ValidElement = ValidElement> = (r: UIRoot<T>, ...args: A) => void;

/**
 * Allows you to render a variable number of UI roots at a particular point in your component.
 * UI Roots that aren't rendered in subsequent renders get removed from the dom when you `end()` a list.
 *
 * See {@link nextListRoot} for more info.
 * See the {@link UIRoot} docs for more info on what a 'UIRoot' even is, what it's limitations are, and how to effectively (re)-use them.
 *
 * Normal usage:
 * ```ts
 * imList();
 * for (let i = 0; i < n; i++) {
 *      nextRoot(); {
 *          RenderComponent();
 *      } end();
 * }
 * end();
 * ```
 *
 * Keyed:
 *
 * ```ts
 * imList();
 * for (const item of items) {
 *      nextRoot(item.id); {
 *          RenderComponent();
 *      } end();
 * }
 * imEnd();
 * ```
 */
export function imBeginList(): ListRenderer {
    // Don't access immediate mode state when immediate mode is disabled
    assert(imCtx.imDisabled === false);

    const r = getCurrentRoot();

    let result: ListRenderer | undefined; 
    const items = r.items;
    const idx = ++r.itemsIdx;
    if (idx < items.length) {
        const val = items[idx];

        // The same immedaite mode state must be queried in the same order every time.
        assert(val.t === ITEM_LIST_RENDERER);

        result = val;
    } else {
        assertCanPushImmediateModeStateEntry(r);

        result = newListRenderer(r);
        items.push(result);
    }

    __beginListRenderer(result);

    return result;
}

function assertCanPushImmediateModeStateEntry(r: UIRoot) {
    // The same immediate mode state must be queried in the same order every time.
    // We shouldn't be growing the items array after the first render.
    assert(r.completedOneRender === false, `You rendered more things in this render than in the previous render. 
${COND_LIST_RENDERING_HINT} ${INLINE_LAMBDA_BAD_HINT}`);
}

/**
 * Helpers to make conditional rendering with the list easier to type and read.
 *
 * ```ts
 *  if (imIf() && cond1) {
 *      imComponent1();
 *  } else if (imElseIf() && cond2) {
 *      imComponent2();
 *  } else {
 *      imElse()
 *      imComponent3();
 *  } imEndIf();
 * ```
 *
 * Everythig this method does can also be done using {@link imBeginList}, {@link imEndList} and {@link nextListRoot},
 * but you have to type more, and I feel that code doesn't evolve correctly with 
 * that approach. For example, the following code is valid:
 *
 * ```ts
 *  imList();
 *  if (nextSlot() && cond0) {
 *      imComponent0();
 *  }   
 *  // We don't need an imEndList() and imBeginList() here, so we won't add it.
 *  // However, this has the consequence that the if-statement above is always grouped with
 *  // the one below, sometimes unnecessarily, making it harder to spot potential refactorings.
 *  if (nextSlot() && cond1) {
 *      imComponent1();
 *  } else if (nextSlot() && cond2) {
 *      imComponent2();
 *  } else {
 *      nextSlot();
 *      imComponent3();
 *  }
 *  imEndList();
 * ```
 */
export function imIf() {
    imBeginList();
    nextListRoot();
    return true as const;
}

/**
 * Improves readability of imList being used for a switch.
 * ```ts
 * imSwitch(key); switch(key) {
 *     case 1: imComponent1(); break;
 *     case 2: imComponent2(); break;
 * } imEndSwitch();
 * ```
 */
export function imSwitch(key: ValidKey) {
    imBeginList();
    nextListRoot(key);
}

/** See {@link imSwitch} */
export function imEndSwitch() {
    imEndList();
}

/** See {@link imIf} */
export function imElseIf(): true {
    nextListRoot();
    return true;
}

/** See {@link imIf} */
export function imElse(): true {
    nextListRoot();
    return true;
}

/** See {@link imIf} */
export function imEndIf() {
    imEndList();
}

/** Added these too, because imBeginList is too many characters. */
export const imFor = imBeginList;
export const imEndFor = imEndList;
export const imWhile = imBeginList;
export const imEndWhile = imEndList;


/**
 * Helpers for implementing try-catch.
 * You can also do this with {@link imBeginList}/{@link imEndList} and {@link nextListRoot},
 * but you need to know what you're doing, and it is annoying to remember.
 *
 * ```ts
 * const errorRef = imRef<any>();
 *
 * const l = imTry();
 * try {
 *      if (imIf() && !errorRef.val) {
 *          imComponent1();
 *      } else {
 *          imElse()
 *          imErrorStateComponent();
 *      }
 * } catch (e) {
 *      // unmounts imComponent1 immediately, rewinds the stack back to this list.
 *      imCatch(l);     
 *
 *      // NOTE: you can't and shouldn't render any components in this region, since the
 *      // app rerenders ever frame, so the only way to keep a component you render here on the screen
 *      // is by throwing the same Error exception every frame. 
 *      // Aside from the fact that it is a bad idea, this typically won't happen if the Error was thrown when 
 *      // you were handling a mouse click or keyboard input, for example.
 *      // You'll need to do something else instead!
 *
 *      console.error("An error occured while rendering: ", e);
 *      errorRef.val = e;
 * } 
 * imEndTry();
 *
 * ```
 */
export function imTry(): ListRenderer {
    const l = imBeginList();
    nextListRoot();
    return l;
}

/** See {@link imTry} */
export function imCatch(l: ListRenderer) {
    abortListAndRewindUiStack(l);
    disableIm();
}

/** See {@link imTry} */
export function imEndTry() {
    enableIm();
    imEndList();
}


/**
 * Read {@link imBeginList}'s doc first for context and examples.
 *
 * You can optionally specify a {@link key}.
 * If a key is present, the same UIRoot that was rendered for that particular key will be re-used. Make sure
 *      to not reuse the same key twice.
 *
 * If no key is present, the same UIRoot that was rendered for the nth call of nextListSlot() without a key will be re-used.
 *
 * There is no virtue in always specifying a key. Only do it when actually necessary.
 *
 * See the {@link UIRoot} docs for more info on what a 'UIRoot' even is, what it's limitations are, and how to effectively (re)-use them.
 */
export function nextListRoot(key?: ValidKey) {
    if (imCtx.currentRoot) {
        imEnd();
    }

    const l = getCurrentListRendererInternal();

    let result;
    if (key !== undefined) {
        // use the hashmap
        // TODO: consider array of pairs

        if (l.keys === undefined) {
            l.keys = new Map();
        }

        let block = l.keys.get(key);
        if (block === undefined) {
            block = {
                root: newUiRoot(null, l.uiRoot.domAppender),
                rendered: false
            };
            l.keys.set(key, block);
        } else {
            // Don't render same list element twice in single render pass, haiyaaaa
            assert(block.rendered === false);
        }

        block.rendered = true;

        result = block.root;
    } else {
        // use the array

        const idx = l.builderIdx++;

        if (idx < l.builders.length) {
            result = l.builders[idx];
        } else if (idx === l.builders.length) {
            result = newUiRoot(null, l.uiRoot.domAppender);
            l.builders.push(result);
        } else {
            // DEV: whenever l.builderIdx === this.builders.length, we should append another builder to the list
            assert(false);
        }
    }

    __beginUiRoot(result, result.domAppender.idx, -1);

    l.current = result;

    return result;
}


///////// 
// Common immediate mode UI helpers

function imStateInternal<T>(supplier: () => T, skipSupplierCheck: boolean): T {
    // Don't access immediate mode state when immediate mode is disabled
    assert(imCtx.imDisabled === false);

    const r = getCurrentRoot();

    let result: T;
    const items = r.items;
    const idx = ++r.itemsIdx;
    if (idx < items.length) {
        const box = items[idx];
        assert(box.t === ITEM_STATE);

        // The same immedaite mode state must be queried in the same order every time.
        // Checking that the suppliers are the same for both renders is our sanity check that we are 
        // most-likely accesing the correct state, and not rendering things in a different order
        if (skipSupplierCheck === false) {
            assert(
                supplier === box.supplier, 
                `imState recieved a different supplier this render. If you're passing an inline lambda to this method, then use imStateInline to skip this check.
However, imStateInline will not catch any out-of-order rendering errors, which may lead to state corruption`
            );
        }

        result = box.v as T;
    } else {
        assertCanPushImmediateModeStateEntry(r);

        // supplier can call getCurrentRoot() internally, and even add destructors.
        // But it shouldn't be doing immediate mode shenanigans.
        disableIm();
        result = supplier();
        enableIm();

        const box: StateItem = { t: ITEM_STATE, v: result, supplier };
        items.push(box);
    }

    return result;
}

/**
 * This method returns a stable reference to some state, allowing your component to maintain
 * state between rerenders. This only works because of the 'rules of immediate mode state' idea
 * this framework is built upon, which are basically the same as the 'rule of hooks' from React,
 * except it extends to all immediate mode state that we want to persist and reuse between rerenders, 
 * including ui components.
 *
 * This method expects that you pass in the same supplier every time.
 * This catches out-of-order immediate-state rendering bugs, so it's better to use this where possible. 
 *
 * Sometimes, it is just way easier to do the state inline:
 * ```
 *      const s = getState(r, () => { ... some state } );
 * ```
 *
 * In which case, you'll need to use {@link imStateInline} instead. But try not to!
 */
export function imState<T>(supplier: () => T): T {
    return imStateInternal(supplier, false);
}

/**
 * Lets you do your suppliers inline, like `const s = imStateInline(() => ({ blah }));`.
 *
 * WARNING: using this method won't allow you to catch out-of-order im-state-rendering bugs at runtime, 
 * leading to potential data corruption. 
 *
 */
export function imStateInline<T>(supplier: () => T) : T {
    return imStateInternal(supplier, true);
}

/**
 * Allows you to get the current root without having a reference to it.
 * Mainly for use when you don't care what the type of the root is.
 */
export function getCurrentRoot(): UIRoot {
    const ctx = imCtx;

    /** 
     * Can't call this method without opening a new UI root. Common mistakes include: 
     *  - using end() instead of endList() to end lists
     *  - calling beginList() and then rendering a component without wrapping it in nextRoot like `nextRoot(); { ...component code... } end();`
     */
    assert(ctx.currentRoot !== undefined);

    return ctx.currentRoot as UIRoot;
}

// You probably don't want to use this, if you can help it
export function getCurrentListRendererInternal(): ListRenderer {
    const ctx = imCtx;

    /** Can't call this method without opening a new list renderer (see {@link imBeginList}) */
    assert(ctx.currentListRenderer !== undefined, `The last stack element was not a list renderer`)

    return ctx.currentListRenderer;
}

function pushList(l: ListRenderer) {
    const ctx = imCtx;

    ctx.currentStack.push(l);
    ctx.currentRoot = undefined;
    ctx.currentListRenderer = l;
}

function pushRoot(r: UIRoot) {
    const ctx = imCtx;

    ctx.currentStack.push(r);
    ctx.currentRoot = r;
    ctx.currentListRenderer = undefined;
}

function startRendering(root: UIRoot, itemIdx: number, domIdx: number) {
    imCtx.currentStack.length = 0;
    enableIm();
    __beginUiRoot(root, itemIdx, domIdx);
}

const COND_LIST_RENDERING_HINT =`
Most likely, you are doing conditional rendering or list rendering in a way that is undetectable to this framework.
Try following the following patterns instead:

// Conditional rendering
\`\`\`
if(imIf() && <condition1>) { 
    <Component1> 
} else if (imElseIf() && <condition2>) { 
    <Component2> 
} else { 
    imElse(); 
    <Component3> 
} imEndIf()
\`\`\`

// List rendering
\`\`\`
imFor(); for (const item of items) {
    nextListRoot();

    <Component>
} imEndFor();
\`\`\`
`

const INLINE_LAMBDA_BAD_HINT = `
This error will also throw if the DOM-element supplier being passed in is an inline lambda. 
Fix: don't use an inline lambda.
`;

export function imUnappendedRoot<E extends ValidElement = ValidElement>(elementSupplier: () => E): UIRoot<E> {
    // Don't access immediate mode state when immediate mode is disabled
    assert(imCtx.imDisabled === false);

    const r = getCurrentRoot();

    let result: UIRoot<E> | undefined;
    let items = r.items;
    const idx = ++r.itemsIdx;
    if (idx < items.length) {
        result = items[idx] as UIRoot<E>;

        // The same immediate mode state must be queried in the same order every time.
        assert(result.t === ITEM_UI_ROOT);
    
        // string comparisons end up being quite expensive, so we're storing
        // a reference to the function that created the dom element and comparing those instead.
        assert(
            result.elementSupplier === elementSupplier, 
            `imBeginRoot was invoked with a different supplier from the previous render. 
${COND_LIST_RENDERING_HINT} ${INLINE_LAMBDA_BAD_HINT}`
        );
    } else {
        assertCanPushImmediateModeStateEntry(r);

        result = newUiRoot(elementSupplier);
        items.push(result);
    }

    return result as UIRoot<E>;
} 

export function imBeginExistingRoot<E extends ValidElement = ValidElement>(root: UIRoot<E>) {
    const r = getCurrentRoot();

    r.hasRealChildren = true;
    appendToDomRoot(r.domAppender, root.domAppender.root);

    __beginUiRoot(root, -1, -1);
}

export function imBeginRoot<E extends ValidElement = ValidElement>(elementSupplier: () => E): UIRoot<E> {
    const result = imUnappendedRoot(elementSupplier);
    imBeginExistingRoot(result);
    return result;
}

/** 
 * This method pops any element from the global element stack that we created via {@link imBeginRoot}.
 * This is called `imEnd` instad of `end`, because `end` is a good variable name that we don't want to squat on.
 */
export function imEnd() {
    const r = getCurrentRoot();

    if (imEndRootInternal(r)) {
        // we rendered nothing to r root, so we should just remove it.
        // however, we may render to it again on a subsequent render.
        __removeAllDomElementsFromUiRoot(r, false);
    }

    // We should render the same number of things every time
    assert(r.itemsIdx === r.items.length - 1);

    return true;
}

/** 
 * Same as imEnd, but doesn't remove anything if we don't render anything.
 * I've not used it yet.
 */
export function imEndMemoized() {
    const r = getCurrentRoot();

    // we rendered nothing to r root, do nothing.
    imEndRootInternal(r)
}

function imEndRootInternal(r: UIRoot): boolean {
    // close out this UI Root.

    const mouse = getImMouse();

    if (isDerived(r) === false) {
        // Defer the mouse events upwards, so that parent elements can handle it if they want
        const el = r.root;
        const parent = el.parentNode;

        if (mouse.clickedElement === el) {
            mouse.clickedElement = parent;
        }
        if (mouse.lastClickedElement === el) {
            mouse.lastClickedElement = parent;
        }
        if (mouse.hoverElement === el) {
            mouse.hoverElement = parent;
        }
    }

    imCtx.itemsRendered += r.items.length;

    let result = false;

    if (r.itemsIdx === -1) {
        result = true;
    }

    __popStack();

    r.completedOneRender = true;

    return result;
}


function __popStack() {
    const ctx = imCtx;

    // fix the `current` variables
    ctx.currentStack.pop();
    if (ctx.currentStack.length === 0) {
        ctx.currentRoot = undefined;
        ctx.currentListRenderer = undefined;
    } else {
        const val = ctx.currentStack[ctx.currentStack.length - 1];
        if (val.t === ITEM_LIST_RENDERER) {
            ctx.currentListRenderer = val;
            ctx.currentRoot = undefined;
        } else {
            ctx.currentListRenderer = undefined;
            ctx.currentRoot = val;
        }
    }
}

export function imEndList() {
    const ctx = imCtx;

    if (ctx.currentRoot) {
        imEnd();
    }

    // NOTE: the main reason why I won't make a third ITEM_COMPONENT_FENCE 
    // to detect an incorrect number of calls to im() and imEnd() methods, is because
    // most UI components will interlace imList() and imRoot() methods frequently enough that
    // this assertion here or the one in imEnd() will already catch this bug most of the time.
    const l = getCurrentListRendererInternal();

    // close out this list renderer.

    ctx.itemsRendered += l.builders.length;
    if (l.keys) {
        ctx.itemsRendered += l.keys.size;
    }

    // remove all the UI components that may have been added by other builders in the previous render.
    for (let i = l.builderIdx; i < l.builders.length; i++) {
        __removeAllDomElementsFromUiRoot(l.builders[i], true);
    }
    l.builders.length = l.builderIdx;

    if (l.keys) {
        for (const [k, v] of l.keys) {
            if (v.rendered === false) {
                __removeAllDomElementsFromUiRoot(v.root, true);
                l.keys.delete(k);
            }
        }
    }

    __popStack();
}

function newListRenderer(root: UIRoot): ListRenderer {
    return {
        t: ITEM_LIST_RENDERER,
        uiRoot: root,
        keys: undefined,
        builders: [],
        builderIdx: 0,
        current: null,
    };
}

export function createSvgElement<E extends SVGElement>(type: string): E {
    const xmlNamespace = "http://www.w3.org/2000/svg";
    const svgEl = document.createElementNS(xmlNamespace, type) as E;
    if (type === "svg" || type === "SVG") {
        // Took this from https://stackoverflow.com/questions/8215021/create-svg-tag-with-javascript
        // Not sure if actually needed
        svgEl.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
        svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    return svgEl;
}


export function newDiv() {
    return document.createElement("div");
}

export function newSpan() {
    return document.createElement("span");
}

export function imBeginDiv(): UIRoot<HTMLDivElement> {
    return imBeginRoot<HTMLDivElement>(newDiv);
}

export function imBeginSpan(): UIRoot<HTMLSpanElement> {
    return imBeginRoot<HTMLSpanElement>(newSpan);
}

export function imTextSpan(text: string) {
    imBeginSpan(); setInnerText(text); imEnd();
}

export function imTextDiv(text: string) {
    imBeginDiv(); setInnerText(text); imEnd();
}


export function abortListAndRewindUiStack(l: ListRenderer) {
    const ctx = imCtx;

    // need to wind the stack back to the current list component
    const idx = ctx.currentStack.lastIndexOf(l);
    assert(idx !== -1);
    ctx.currentStack.length = idx + 1;
    ctx.currentRoot = undefined;
    ctx.currentListRenderer = l;

    const r = l.current;
    if (r) {
        __removeAllDomElementsFromUiRoot(r, false);

        // need to reset the dom root, since we've just removed elements underneath it
        resetDomAppender(r.domAppender);
    }
}

export type Ref<T> = { val: T | null; }
function newRef<T>(): Ref<T> {
    return { val: null };
}

/**
 * Set the state later in the function:
 * ```ts
 * const ref = imRef<HTMLDivElement>();
 *
 * ref.current = div().root; {
 *      text("The div: " + ref.val);
 * } end();
 * ```
 */
export function imRef<T>(): Ref<T> {
    return imState(newRef<T>);
}

function newArray() {
    return [];
}

export function imArray<T>(): T[] {
    return imState(newArray);
}

function newStringBuilder(): {
    text: string;
} {
    return { text: "" }
}

export function imStringRef() {
    return imState(newStringBuilder);
}

function newMap<K, V>() {
    return new Map<K, V>();
}

export function imMap<K, V>(): Map<K, V> {
    return imState(newMap<K, V>);
}


function newSet<T>() {
    return new Set<T>();
}

export function imSet<K>(): Set<K> {
    return imState(newSet<K>);
}


const MEMO_INITIAL_VALUE = {};
function newMemoState(): { last: unknown } {
    // this way, imMemo always returns true on the first render
    return { last: MEMO_INITIAL_VALUE };
}

/**
 * Returns true if it was different to the previous value.
 * ```ts
 * if (imMemo(val)) {
 *      // do expensive thing with val here
 *      setStyle("backgroundColor", getColor(val));
 * }
 * ```
 *
 * NOTE: I had previously implemented imBeginMemo() and imEndMemo():
 * ```
 * if (imBeginMemo().val(x).objectVals(obj)) {
 *      <Memoized component>
 * } imEndMemo();
 * ```
 * Looks great right? Ended up with all sorts of stale state bugs so 
 * I deleted it. 
 *
 * What I'm finding now, is that while imMemo is a super common pattern
 * that you will need in your components, it is really easy to lean on it
 * in situations where it isn't needed, and end up with a bad architecture.
 *
 * In other words, consider centralizing all your state into a single object, and using a setter instead.
 */
export function imMemo(val: unknown): boolean {
    const ref = imState(newMemoState);
    const changed = ref.last !== val;
    ref.last = val;
    return changed;
}

// TODO: performance benchmark vs imMemo
export function imMemoArray(...val: unknown[]): boolean {
    const arr = imArray();

    let changed = false;
    if (val.length !== arr.length) {
        changed = true;
        arr.length = val.length;
    }

    for (let i = 0; i < val.length; i++) {
        if (i === arr.length) {
            changed = true;
            arr.push(val[i]);
        } else if (arr[i] !== val[i]) {
            changed = true;
            arr[i] = val[i];
        }
    }

    return changed;
}

export function imMemoObjectVals(obj: Record<string, unknown>): boolean {
    const arr = imArray();

    let changed = false;
    let i = 0;
    for (const k in obj) {
        const val = obj[k];
        if (i === arr.length) {
            arr.push(val);
            changed = true;
        } else if (arr[i] !== val) {
            arr[i] = val;
            changed = true;
        }
        i++;
    }

    return changed;
}

export function disableIm() {
    imCtx.imDisabled = true;
}

export function enableIm() {
    imCtx.imDisabled = false;
}

export function getImContext(): ImContext {
    return imCtx;
}

export function setImContext(ctx: ImContext) {
    imCtx = ctx;
}

/**
 * Attatch an event handler of your choice to the current UI Root, and 
 * handle the event directly in the render function without lambdas.
 * 
 * This significanlty simplifies the implementation of error boundaries that respond to 
 * errors in arbitrary events.
 * 
 * NOTE: The event type must never change, because the event handler only gets added on the first render.
 * I have found that adding assertion code and even diffing code here has a significant impact on performance,
 * so I've chosen to not add it for now. In the future, I may expose the 
 * event types as integer enums, which should fix this issue. 
 */
export function imOn<K extends keyof HTMLElementEventMap>(
    type: K
): HTMLElementEventMap[K] | null {
    const eventRef = imRef<HTMLElementEventMap[K]>();
    const ctx = imCtx;

    if (imInit()) {
        const r = getCurrentRoot();

        const handler = (e: HTMLElementEventMap[K]) => {
            eventRef.val = e;
            rerenderImContext(ctx, ctx.lastTime, true);
        }
        r.root.addEventListener(
            type, 
            // @ts-expect-error this thing is fine, actually.
            handler
        );

        addDestructor(r, () => {
            r.root.removeEventListener(
                type,
                // @ts-expect-error this thing is fine, actually.
                handler
            );
        });
    }

    const ev = eventRef.val;
    eventRef.val = null;

    return ev;
}

/**
 * Returns true the first time it's called, and false every other time.
 */
export function imInit(): boolean {
    const val = imRef<boolean>();
    if (val.val === null) {
        val.val = true;

        return true;
    }

    return false;
}

export function addClasses(classes: string[]) {
    for (let i = 0; i < classes.length; i++) {
        setClass(classes[i]);
    }
}


export function setStyle<K extends (keyof ValidElement["style"])>(key: K, value: string, r = getCurrentRoot()) {
    assertNotDerived(r);

    // NOTE: memoization should be done on your end, not mine

    // @ts-expect-error it sure can
    r.root.style[key] = value;
}


///////// 
// Realtime proper immediate-mode events API, with events.
//
// I wasn't able to find a good clean solution to the problem
// of adding and removing events locally, so I'm attempting to
// go down a second road of rerendering the entire app at 60fps.
//
// It would be interesting to see how far this approach scales. (23/03/2025)
//
// So far, it's going pretty great! (16/04/2025)

export type KeyPressEvent = {
    key: string;
    code: string;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
};

export function deltaTimeSeconds(): number {
    return imCtx.dtSeconds;
}


/**
 * This framework rerenders your entire application every event. 
 * This is required, so that we have a nice immediatem mode API for events, while 
 * also allowing for calling `e.preventDefault()` on any specific event, within that event cycle itself.
 *
 * This does mean that some expensive renders will become noticeably slow when you have multiple keys held down, for instance.
 *
 * ```ts
 * imCanvas2D(); 
 * if (!isExcessEventRender()) {
 *
 *      // draw expensive canvas thing
 * } 
 * imEnd();
 * ```
 *
 */
export function isExcessEventRender() {
    return imCtx._isExcessEventRender;
}

/**
 * This method initializes an imContext you got from {@link newImContext}.
 * To start rendering to it, you'll either need to call {@link startAnimationLoop},
 * or call {@link rerenderImContext} by hand for a more custom render cycle.
 */
export function initImContext(ctx: ImContext) {
    if (ctx.initialized) {
        console.warn("You're trying to initialize this context twice!");
        return;
    }

    ctx.initialized = true;

    // Initialize events
    {
        document.addEventListener("mousedown", ctx.globalEventHandlers.mousedown);
        document.addEventListener("mousemove", ctx.globalEventHandlers.mousemove);
        document.addEventListener("mouseenter", ctx.globalEventHandlers.mouseenter);
        document.addEventListener("mouseup", ctx.globalEventHandlers.mouseup);
        document.addEventListener("wheel", ctx.globalEventHandlers.wheel);
        document.addEventListener("keydown", ctx.globalEventHandlers.keydown);
        document.addEventListener("keyup", ctx.globalEventHandlers.keyup);
        window.addEventListener("blur", ctx.globalEventHandlers.blur);
    }
}

export function deinitImContext(ctx: ImContext) {
    if (!ctx.initialized) {
        console.warn("This context has not been initialized yet!");
        return;
    }

    if (ctx.deinitialized) {
        console.warn("This context has already been deinitialized!");
        return;
    }

    ctx.deinitialized = true;

    // Remove the events
    {
        document.removeEventListener("mousedown", ctx.globalEventHandlers.mousedown);
        document.removeEventListener("mousemove", ctx.globalEventHandlers.mousemove);
        document.removeEventListener("mouseenter", ctx.globalEventHandlers.mouseenter);
        document.removeEventListener("mouseup", ctx.globalEventHandlers.mouseup);
        document.removeEventListener("wheel", ctx.globalEventHandlers.wheel);
        document.removeEventListener("keydown", ctx.globalEventHandlers.keydown);
        document.removeEventListener("keyup", ctx.globalEventHandlers.keyup);
        window.removeEventListener("blur", ctx.globalEventHandlers.blur);
    }
}

export function initImDomUtils(renderFn: () => void): ImContext {
    initImContext(defaultContext);
    startAnimationLoop(defaultContext, renderFn);
    return defaultContext;
}

export function deinitImDomUtils() {
    deinitImContext(defaultContext);
}

export function startAnimationLoop(
    ctx: ImContext,
    renderFn: () => void
) {
    if (ctx.renderFn !== renderStub) {
        console.warn("Something is trying to start a second animation loop for this context!");
        return;
    }

    ctx.renderFn = renderFn;

    const animation = (t: number) => {
        if (ctx.deinitialized) {
            return;
        }

        rerenderImContext(ctx, t, true);

        requestAnimationFrame(animation);
    };

    requestAnimationFrame(animation);
}

/**
 * This method is called automatically by the animation loop.
 * You don't ever need to call it manually unless you're doing some custom stuff
 */
export function rerenderImContext(ctx: ImContext, t: number, isInsideEvent: boolean) {
    setImContext(ctx);

    ctx.time = t;
    ctx.dtSeconds = (t - ctx.lastTime) / 1000;
    ctx.lastTime = t;

    if (ctx.isRendering) {
        return;
    }

    if (isInsideEvent === false) {
        ctx._isExcessEventRender = false;
    }

    // begin frame

    ctx.isRendering = true;
    startRendering(ctx.appRoot, -1, -1);

    // persistent things need to be reset every frame, for bubling order to remain consistent per render
    ctx.mouse.lastClickedElement = ctx.mouse.lastClickedElementOriginal;
    ctx.mouse.hoverElement = ctx.mouse.hoverElementOriginal;

    // It is better to not try-catch this actually.
    // You shouldn't let any exceptions reach here under any circumstances.
    ctx.renderFn();

    // end frame
 
    resetKeyboardState(ctx);
    resetMouseState(ctx, false);

    ctx.mouse.hasMouseEvent = false;
    ctx.itemsRenderedLastFrame = ctx.itemsRendered;
    ctx.itemsRendered = 0;
    ctx.isRendering = false;
    if (isInsideEvent) {
        ctx._isExcessEventRender = isInsideEvent;
    }

    if (ctx.currentStack.length !== 1) {
        if (ctx.currentStack.length < 1) {
            console.error("You've popped too many things off the stack. There is no good way to find the bug right now, sorry");
        } else {
            console.error("You forgot to pop some things off the stack: ", ctx.currentStack.slice(1));
            throw new Error(`You forgot to pop some things off the stack:
            ${ctx.currentStack.slice(1).map(item => {
                if (item.t === ITEM_LIST_RENDERER) {
                    return "List renderer"
                } else {
                    return "UI Root - " + item.root.tagName;
                }
            }).join("\n")}`
            );
        }
    }
}

export type ImKeyboardState = {
    // We need to use this approach instead of a buffered approach like `keysPressed: string[]`, so that a user
    // may call `preventDefault` on the html event as needed.
    // NOTE: another idea is to do `keys.keyDown = null` to prevent other handlers in this framework
    // from knowing about this event.
    keyDown: KeyboardEvent | null;
    keyUp: KeyboardEvent | null;
    blur: boolean;
};

function resetKeyboardState(ctx: ImContext) {
    const keyboard = ctx.keyboard;
    keyboard.keyDown = null;
    keyboard.keyUp = null;
    keyboard.blur = false;
}

export type ImMouseState = {
    lastX: number;
    lastY: number;

    leftMouseButton: boolean;
    middleMouseButton: boolean;
    rightMouseButton: boolean;
    hasMouseEvent: boolean;

    dX: number;
    dY: number;
    X: number;
    Y: number;

    /**
     * NOTE: if you want to use this, you'll have to prevent scroll event propagation.
     * See {@link imPreventScrollEventPropagation}
     */
    scrollWheel: number;

    clickedElement: object | null;
    lastClickedElement: object | null;
    lastClickedElementOriginal: object | null;
    hoverElement: object | null;
    hoverElementOriginal: object | null;
};

function resetMouseState(ctx: ImContext, clearPersistedStateAsWell: boolean) {
    const { mouse } = ctx;
    
    mouse.dX = 0;
    mouse.dY = 0;
    mouse.lastX = mouse.X;
    mouse.lastY = mouse.Y;

    mouse.clickedElement = null;
    mouse.scrollWheel = 0;

    if (clearPersistedStateAsWell) {
        mouse.leftMouseButton = false;
        mouse.middleMouseButton = false;
        mouse.rightMouseButton = false;

        mouse.lastClickedElement = null;
        mouse.lastClickedElementOriginal = null;
        mouse.hoverElement = null;
        mouse.hoverElementOriginal = null;
    }
}

export function getImMouse() {
    return imCtx.mouse;
}

export function getImKeys(): ImKeyboardState {
    return imCtx.keyboard;
}


// I cant fking believe this shit works, lol

/**
 * Mouse press is distinct from mouse-click - A click is what happens when we release the mouse
 * above the same element that we pressed it on. However a press happens immediately on mouse-down.
 * TODO: add elementHasMouseClick
 */
export function elementHasMousePress() {
    const mouse = getImMouse();
    const r = getCurrentRoot();
    if (mouse.leftMouseButton) {
        return r.root === mouse.clickedElement;
    }
    return  false;
}

export function elementHasMouseDown(
    // Do we care that this element was initially clicked?
    // Set to false if you want to detect when an element drags their mouse over this element but 
    // it didn't initiate the click from this element.
    hadClick = true
) {
    const r = getCurrentRoot();

    if (hadClick) {
        return r.root === imCtx.mouse.lastClickedElement;
    }

    return imCtx.mouse.leftMouseButton && elementHasMouseHover();
}

export function elementHasMouseHover() {
    const r = getCurrentRoot();
    return r.root === imCtx.mouse.hoverElement;
}

export function getHoveredElement() {
    return imCtx.mouse.hoverElement;
}

function setClickedElement(ctx: ImContext, el: object | null) {
    const { mouse } = ctx;

    mouse.clickedElement = el;
    mouse.lastClickedElement = el;
    mouse.lastClickedElementOriginal = el;
}

function newPreventScrollEventPropagationState() {
    return { 
        isBlocking: true,
        scrollY: 0,
    };
}

export function imPreventScrollEventPropagation() {
    const state = imState(newPreventScrollEventPropagationState);

    if (imInit()) {
        const r = getCurrentRoot();
        const handler = (e: Event) => {
            if (state.isBlocking) {
                e.preventDefault();
            }
        }
        r.root.addEventListener("wheel", handler);
        addDestructor(r, () => {
            r.root.removeEventListener("wheel", handler);
        });
    }

    const mouse = getImMouse();
    if (state.isBlocking && elementHasMouseHover() && mouse.scrollWheel !== 0) {
        state.scrollY += mouse.scrollWheel;
        mouse.scrollWheel = 0;
    } else {
        state.scrollY = 0;
    }

    return state;
}

export function getNumItemsRendered() {
    return imCtx.itemsRenderedLastFrame;
}

let numResizeObservers = 0;

export type SizeState = {
    width: number;
    height: number;
}

function newImGetSizeState(): {
    size: SizeState;
    observer: ResizeObserver;
    resized: boolean;
} {
    const r = getCurrentRoot();
    const ctx = imCtx;

    const self = {
        size: { width: 0, height: 0, },
        resized: false,
        observer: new ResizeObserver((entries) => {
            for (const entry of entries) {
                // NOTE: resize-observer cannot track the top, right, left, bottom of a rect. Sad.
                self.size.width = entry.contentRect.width;
                self.size.height = entry.contentRect.height;
                break;
            }

            rerenderImContext(ctx, ctx.lastTime, false);
        })
    };

    self.observer.observe(r.root);
    numResizeObservers++;
    addDestructor(r, () => {
        numResizeObservers--;
        self.observer.disconnect()
    });

    return self;
}

export function imTrackSize() {
    return imState(newImGetSizeState);
}
