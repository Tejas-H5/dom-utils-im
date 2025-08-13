import { assert } from "src/utils/assert";

// NOTE: I've got no idea if this is actually faster than just using objects - I'm just trying something out.
// Migth be shit, and need rewriting to use normal objects, I've got no idea yet.

export type ImCacheEntries = any[];

// Somewhat important that we store these all at 0.

// TODO: I know one of these two (ENTRIES_REMOVE_LEVEL, ENTRIES_IS_IN_CONDITIONAL_PATHWAY) are redundant. I just can't seem to be able to prove it ...
const ENTRIES_IDX = 0;
const ENTRIES_LAST_IDX = 1;
const ENTRIES_REMOVE_LEVEL = 2;
const ENTRIES_IS_IN_CONDITIONAL_PATHWAY = 3;
const ENTRIES_STARTED_CONDITIONALLY_RENDERING = 4;
const ENTRIES_DESTRUCTORS = 5;
const ENTRIES_KEYED_MAP = 6;
const ENTRIES_KEYED_MAP_LAST_IDX = 7;
const ENTRIES_PARENT_TYPE = 8;
const ENTRIES_PARENT_VALUE = 9;
const ENTRIES_ITEMS_START = 10;

export type ImCache = (ImCacheEntries | any)[];
const CACHE_IDX = 0;
const CACHE_CURRENT_ENTRIES = 1;
const CACHE_CONTEXTS = 2;
const CACHE_ROOT_ENTRIES = 3;
const CACHE_ENTRIES_START = 4;

export const REMOVE_LEVEL_NONE = 1;
export const REMOVE_LEVEL_DETATCHED = 2;
export const REMOVE_LEVEL_DESTROYED = 3;

export type RemovedLevel
    = typeof REMOVE_LEVEL_NONE
    | typeof REMOVE_LEVEL_DETATCHED   // This is the default remove level. The increase in performance far oughtweighs any memory problems. 
    | typeof REMOVE_LEVEL_DESTROYED;

// TypeIDs allow us to provide some basic sanity checks and protection
// against the possiblity of data corruption that can happen when im-state is accessed 
// conditionally or out of order. The idea is that rather than asking you to pass in 
// some random number, or to save a bunch of type ID integers everywhere, you can 
// just pass in a reference to a function to uniquely identify a piece of state.
// You probably have a whole bunch of them lying around somewhere.
// The function that you are creating the state from, for example. 
// The return value of the function can be used to infer the return value of
// the {@link imGetsState} call, but it can also be a completely unrelated function
// - in which case you can just use {@link imInlineTypeId}. As long as a function
// has been uniquely used within a particular entry list at a particular slot, the 
// likelyhood of out-of-order rendering errors will reduce to almost 0.
export type TypeId<T> = (...args: any[]) => T;

export function inlineTypeId<T = undefined>(fn: Function) {
    return fn as TypeId<T>;
}

// Can be any valid object reference. Or string, but avoid string if you can - string comparisons are slower than object comparisons
export type ValidKey = string | number | Function | object | boolean | null;

export function imCacheBegin(c: ImCache) {
    if (c.length === 0) {
        c.length = CACHE_ENTRIES_START;
        // starts at -1 and increments onto the current value. So we can keep accessing this idx over and over without doing idx - 1.
        // NOTE: memory access is supposedly far slower than math. So might not matter too much
        c[CACHE_IDX] = 0;
        c[CACHE_CONTEXTS] = [];
        c[CACHE_ROOT_ENTRIES] = [];
        c[CACHE_CURRENT_ENTRIES] = c[CACHE_ROOT_ENTRIES];
    }

    c[CACHE_IDX] = CACHE_ENTRIES_START - 1;

    imCacheEntriesPush(c, c[CACHE_ROOT_ENTRIES], imCacheBegin, c);

    return c;
}

export function imCacheEnd(c: ImCache) {
    imCacheEntriesPop(c);

    const startIdx = CACHE_ENTRIES_START - 1;
    if (c[CACHE_IDX] > startIdx) {
        console.error("You've forgotten to pop some things: ", c.slice(startIdx + 1));
        throw new Error("You've forgotten to pop some things");
    } else if (c[CACHE_IDX] < startIdx) {
        throw new Error("You've popped too many thigns off the stack!!!!");
    }
}

export function imCacheEntriesPush<T>(
    c: ImCache,
    entries: ImCacheEntries,
    parentTypeId: TypeId<T>,
    parent: T
) {
    const idx = ++c[CACHE_IDX];
    if (idx === c.length) {
        c.push(entries);
    } else {
        c[idx] = entries;
    }

    c[CACHE_CURRENT_ENTRIES] = entries;

    if (entries.length === 0) {
        entries.length = ENTRIES_ITEMS_START;
        entries[ENTRIES_IDX] = ENTRIES_ITEMS_START - 2;
        entries[ENTRIES_LAST_IDX] = 0;
        entries[ENTRIES_REMOVE_LEVEL] = REMOVE_LEVEL_DETATCHED;
        entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY] = false;
        entries[ENTRIES_STARTED_CONDITIONALLY_RENDERING] = false;
        entries[ENTRIES_PARENT_TYPE] = parentTypeId;
        entries[ENTRIES_PARENT_VALUE] = parent;
        entries[ENTRIES_DESTRUCTORS] = undefined;
        entries[ENTRIES_KEYED_MAP] = undefined;
        entries[ENTRIES_KEYED_MAP_LAST_IDX] = 0;
    } else {
        assert(entries[ENTRIES_PARENT_TYPE] === parentTypeId);

    }

    entries[ENTRIES_IDX] = ENTRIES_ITEMS_START - 2;
}

export function imCacheEntriesPop(c: ImCache) {
    const idx = --c[CACHE_IDX];
    c[CACHE_CURRENT_ENTRIES] = c[idx];
}

export function imCacheEntriesGet<T>(c: ImCache, typeId: TypeId<T>): T | undefined {
    const entries = c[CACHE_CURRENT_ENTRIES];

    entries[ENTRIES_IDX] += 2;
    const idx = entries[ENTRIES_IDX];
    if (idx === ENTRIES_ITEMS_START) {
        // Need to respond to conditional rendering when we render the first item, because rendering 0 items is the signal to not conditionally render.
        if (entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY] === false) {
            entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY] = true;
            entries[ENTRIES_STARTED_CONDITIONALLY_RENDERING] = true;
            entries[ENTRIES_REMOVE_LEVEL] = REMOVE_LEVEL_NONE;
        } else {
            // NOTE: if an error occured in the previous render, then
            // subsequent things that depended on `startedConditionallyRendering` being true won't run.
            // I think this is better than re-running all the things that ran successfully over and over again.
            entries[ENTRIES_STARTED_CONDITIONALLY_RENDERING] = false;
        }
    }

    assert(idx <= entries.length + 1);

    if (idx === entries.length) {
        entries.push(typeId);
        entries.push(undefined);
    } else {
        assert(entries[idx] === typeId);
    }

    return entries[idx + 1];
}


export function imCacheEntriesGetParent<T>(s: ImCacheEntries, typeId: TypeId<T>): T {
    // If this assertion fails, then you may have forgotten to pop some things you've pushed onto the stack
    const entries = s[CACHE_CURRENT_ENTRIES];
    assert(entries[ENTRIES_PARENT_TYPE] === typeId);
    return entries[ENTRIES_PARENT_VALUE] as T;
}


export function imCacheEntriesSet<T>(c: ImCache, val: T): T {
    const entries = c[CACHE_CURRENT_ENTRIES];
    const idx = entries[ENTRIES_IDX];
    entries[idx + 1] = val;
    return val;
}

type ListMapBlock = { rendered: boolean; entries: ImCacheEntries; };


export function imBlockKeyedBegin(c: ImCache, key: ValidKey) {
    const entries = c[CACHE_CURRENT_ENTRIES];
    
    let map = entries[ENTRIES_KEYED_MAP] as (Map<ValidKey, ListMapBlock> | undefined);
    if (map === undefined) {
        map = new Map<ValidKey, ListMapBlock>();
        entries[ENTRIES_KEYED_MAP] = map;
    }

    if (entries[ENTRIES_IDX] < entries[ENTRIES_KEYED_MAP_LAST_IDX]) {
        // This is probably a new render pass. we can initialize the map here.
        for (const v of map.values()) {
            v.rendered = false;
        }
    }
    entries[ENTRIES_KEYED_MAP_LAST_IDX] = entries[ENTRIES_IDX];

    let block = map.get(key);
    if (block === undefined) {
        block = { rendered: false, entries: [] };
        map.set(key, block);
    }


    /**
     * You're rendering this list element twice. You may have duplicate keys in your dataset.
     * If that is not the case, a more common cause is that you are mutating collections while iterating them.
     * All sorts of bugs and performance issues tend to arise when I 'gracefully' handle this case, so I've just thrown an exception instead.
     *
     * If you're doing this in an infrequent event, here's a quick fix:
     * {
     *      let deferredAction: () => {};
     *      imCacheListItemBegin(s);
     *      for (item of list) {
     *          if (event) deferredAction = () => literally same mutation
     *      }
     *      imCacheListItemEnd(s);
     *      if (deferredAction !== undefined) deferredAction();
     * }
     */
    if (block.rendered === true) throw new Error(
        "You've requested the same list key twice. This is indicative of a bug. The comment above this exception will explain more."
    );

    block.rendered = true;

    __imDerivedBlockBegin(c);
}

export function imCacheEntriesAddDestructor(entries: ImCacheEntries, destructor: () => void) {
    let destructors = entries[ENTRIES_DESTRUCTORS];
    if (destructor === undefined) {
        destructors = entries[ENTRIES_DESTRUCTORS] = [];
    }

    destructors.push(destructor);
}

export function imCacheEntriesOnRemove(entries: ImCacheEntries) {
    // don't re-traverse these items.
    if (entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY] === true) {
        entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY] = false;

        for (let i = ENTRIES_ITEMS_START; i < entries.length; i += 2) {
            const t = entries[i];
            const v = entries[i + 1];
            if (t === imBlockBegin) {
                imCacheEntriesOnRemove(v);
            }
        }
    }
}

export function imCacheEntriesOnDestroy(entries: ImCacheEntries) {
    // don't re-traverse these items.
    if (entries[ENTRIES_REMOVE_LEVEL] < REMOVE_LEVEL_DESTROYED) {
        entries[ENTRIES_REMOVE_LEVEL] = REMOVE_LEVEL_DESTROYED;

        for (let i = ENTRIES_ITEMS_START; i < entries.length; i += 2) {
            const t = entries[i];
            const v = entries[i + 1];
            if (t === imBlockBegin) {
                imCacheEntriesOnDestroy(v);
            }
        }

        const destructors = entries[ENTRIES_DESTRUCTORS];
        if (destructors !== undefined) {
            for (const d of destructors) {
                try {
                    d();
                } catch (e) {
                    console.error("A destructor threw an error: ", e);
                }
            }
            entries[ENTRIES_DESTRUCTORS] = undefined;
        }
    }
}

export function imBlockBegin<T>(c: ImCache, parentTypeId: TypeId<T>, parent: T): ImCacheEntries {
    let entries; entries = imCacheEntriesGet(c, imBlockBegin);
    if (entries === undefined) entries = imCacheEntriesSet(c, []);

    imCacheEntriesPush(c, entries, parentTypeId, parent);

    return entries;
}

export function imBlockEnd(c: ImCache) {
    const entries = c[CACHE_CURRENT_ENTRIES];
    let map = entries[ENTRIES_KEYED_MAP] as (Map<ValidKey, ListMapBlock> | undefined);

    if (map !== undefined) {
         // TODO: Blocks need to either have a 'REMOVE_LEVEL_DETATCHED' or a 'REMOVE_LEVEL_DESTROYED' so that
         // we know what to do with the things we didn't render. For now, defaulting to DETATCHED
        for (const v of map.values()) {
            if (!v.rendered) {
                imCacheEntriesOnRemove(v.entries);
            }
        }
    }

    const idx = entries[ENTRIES_IDX];
    if (idx < entries[ENTRIES_LAST_IDX]) {

    }

    return imCacheEntriesPop(c);
}

export function __imDerivedBlockBegin(c: ImCache) {
    const entries    = c[CACHE_CURRENT_ENTRIES];
    const parentType = entries[ENTRIES_PARENT_TYPE];
    const parent     = entries[ENTRIES_PARENT_VALUE];

    imBlockBegin(c, parentType, parent);

    return entries;
}

export function __imDerivedBlockEnd(c: ImCache) {
    // The DOM appender will automatically update and diff the children if they've changed.
    // However we can't just do
    // ```
    // if (blah) {
    //      new component here
    // }
    // ```
    //
    // Because this would de-sync the immediate mode call-sites from their positions in the cache entries.
    // But simply putting them in another entry list:
    //
    // imConditionalBlock();
    // if (blah) {
    // }
    // imConditionalBlockEnd();
    //
    // Will automatically isolate the next immediate mode call-sites with zero further effort required.
    // It's a bit confusing why there isn't more logic here though, I guess.
    //
    // NOTE: I've now moved this functionality into core. Your immediate mode tree builder will need
    // to resolve diffs in basically the same way.

    imBlockEnd(c);
}

function imIf(c: ImCache): true {
    __imDerivedBlockBegin(c);
        __imDerivedBlockBegin(c);
    return true;
}

function imElse(c: ImCache): true {
        __imDerivedBlockEnd(c);
        __imDerivedBlockBegin(c);
    return true;
}

function imIfEnd(c: ImCache) {
        __imDerivedBlockEnd(c);
    __imDerivedBlockEnd(c);
}

///////////////////////////////////////////////
// User code starts here


export type ValidElement = HTMLElement | SVGElement;

type AppendableElement = (ValidElement | Text);
export type DomAppender<E extends ValidElement = ValidElement> = {
    root: E;
    ref: unknown;
    idx: number;
    children: AppendableElement[];
    lastIdx: number;
    childrenChanged: boolean;
    manualDom: boolean;
};

export function newDomAppender<E extends ValidElement>(root: E): DomAppender<E> {
    return {
        root,
        ref: null,
        idx: -1,
        children: [],
        lastIdx: -2,
        childrenChanged: false,
        manualDom: false,
    };
}

export function finalizeDomAppender(appender: DomAppender<ValidElement>) {
    if (
        (appender.childrenChanged === true || appender.idx !== appender.lastIdx) &&
        appender.manualDom === false
    ) {
        // TODO: measure perf impacts.
        // TODO: consider clear, then replace children.
        appender.root.replaceChildren(...appender.children.slice(0, appender.idx + 1));
        appender.childrenChanged = false;
        appender.lastIdx = appender.idx;
    }
}

export function appendToDomRoot(domAppender: DomAppender, child: AppendableElement) {
    const i = ++domAppender.idx;
    if (i < domAppender.children.length) {
        if (domAppender.children[i] !== child) {
            domAppender.childrenChanged = true;
            domAppender.children[i] = child;
        }
    } else {
        domAppender.children.push(child);
        domAppender.childrenChanged = true;
    }
}


// We can now memoize on an object reference instead of a string
type KeyRef<K> = { val: K };
export const El = {
    A: { val: "a" },
    Abbr: { val: "abbr" },
    Address: { val: "address" },
    Area: { val: "area" },
    Article: { val: "article" },
    Aside: { val: "aside" },
    Audio: { val: "audio" },
    B: { val: "b" },
    Base: { val: "base" },
    Bdi: { val: "bdi" },
    Bdo: { val: "bdo" },
    Blockquote: { val: "blockquote" },
    Body: { val: "body" },
    Br: { val: "br" },
    Button: { val: "button" },
    Canvas: { val: "canvas" },
    Caption: { val: "caption" },
    Cite: { val: "cite" },
    Code: { val: "code" },
    Col: { val: "col" },
    Colgroup: { val: "colgroup" },
    Data: { val: "data" },
    Datalist: { val: "datalist" },
    Dd: { val: "dd" },
    Del: { val: "del" },
    Details: { val: "details" },
    Dfn: { val: "dfn" },
    Dialog: { val: "dialog" },
    Div: { val: "div" },
    Dl: { val: "dl" },
    Dt: { val: "dt" },
    Em: { val: "em" },
    Embed: { val: "embed" },
    Fieldset: { val: "fieldset" },
    Figcaption: { val: "figcaption" },
    Figure: { val: "figure" },
    Footer: { val: "footer" },
    Form: { val: "form" },
    H1: { val: "h1" },
    H2: { val: "h2" },
    H3: { val: "h3" },
    H4: { val: "h4" },
    H5: { val: "h5" },
    H6: { val: "h6" },
    Head: { val: "head" },
    Header: { val: "header" },
    Hgroup: { val: "hgroup" },
    Hr: { val: "hr" },
    Html: { val: "html" },
    I: { val: "i" },
    Iframe: { val: "iframe" },
    Img: { val: "img" },
    Input: { val: "input" },
    Ins: { val: "ins" },
    Kbd: { val: "kbd" },
    Label: { val: "label" },
    Legend: { val: "legend" },
    Li: { val: "li" },
    Link: { val: "link" },
    Main: { val: "main" },
    Map: { val: "map" },
    Mark: { val: "mark" },
    Menu: { val: "menu" },
    Meta: { val: "meta" },
    Meter: { val: "meter" },
    Nav: { val: "nav" },
    Noscript: { val: "noscript" },
    Object: { val: "object" },
    Ol: { val: "ol" },
    Optgroup: { val: "optgroup" },
    Option: { val: "option" },
    Output: { val: "output" },
    P: { val: "p" },
    Picture: { val: "picture" },
    Pre: { val: "pre" },
    Progress: { val: "progress" },
    Q: { val: "q" },
    Rp: { val: "rp" },
    Rt: { val: "rt" },
    Ruby: { val: "ruby" },
    S: { val: "s" },
    Samp: { val: "samp" },
    Script: { val: "script" },
    Search: { val: "search" },
    Section: { val: "section" },
    Select: { val: "select" },
    Slot: { val: "slot" },
    Small: { val: "small" },
    Source: { val: "source" },
    Span: { val: "span" },
    Strong: { val: "strong" },
    Style: { val: "style" },
    Sub: { val: "sub" },
    Summary: { val: "summary" },
    Sup: { val: "sup" },
    Table: { val: "table" },
    Tbody: { val: "tbody" },
    Td: { val: "td" },
    Template: { val: "template" },
    Textarea: { val: "textarea" },
    Tfoot: { val: "tfoot" },
    Th: { val: "th" },
    Thead: { val: "thead" },
    Time: { val: "time" },
    Title: { val: "title" },
    Tr: { val: "tr" },
    Track: { val: "track" },
    U: { val: "u" },
    Ul: { val: "ul" },
    Var: { val: "var" },
    Video: { val: "video" },
    Wbr: { val: "wbr" },
} as const;


export function imElBegin<K extends keyof HTMLElementTagNameMap>(
    c: ImCache,
    r: KeyRef<K>
): DomAppender<HTMLElementTagNameMap[K]> {
    // Make this entry in the current entry list, so we can delete it easily
    const appender = imCacheEntriesGetParent(c, newDomAppender);

    let childAppender: DomAppender<HTMLElementTagNameMap[K]> | undefined = imCacheEntriesGet(c, newDomAppender);
    if (childAppender === undefined) {
        const element = document.createElement(r.val);
        childAppender = imCacheEntriesSet(c, newDomAppender(element));
        childAppender.ref = r;
    }

    appendToDomRoot(appender, childAppender.root);

    imBlockBegin(c, newDomAppender, childAppender);

    childAppender.idx = -1;

    return childAppender;
}

export function imElEnd(c: ImCache, r: KeyRef<keyof HTMLElementTagNameMap>) {
    const appender = imCacheEntriesGetParent(c, newDomAppender);
    assert(appender.ref === r) // make sure we're popping the right thing
    finalizeDomAppender(appender);
    imBlockEnd(c);
}


function imDomRootBegin(c: ImCache, root: ValidElement) {
    let appender = imCacheEntriesGet(c, newDomAppender);
    if (appender === undefined) {
        appender = imCacheEntriesSet(c, newDomAppender(root));
        appender.ref = root;
    }

    imBlockBegin(c, newDomAppender, appender);

    appender.idx = -1;

    return appender;
}

function imDomRootEnd(c: ImCache, root: ValidElement) {
    let appender = imCacheEntriesGetParent(c, newDomAppender);
    assert(appender.ref === root);
    finalizeDomAppender(appender);

    imBlockEnd(c);
}


function imText(c: ImCache, text: string): Text {
    let textNode; textNode = imCacheEntriesGet(c, imText);
    if (textNode === undefined) textNode = imCacheEntriesSet(c, document.createTextNode(text));

    // The user can't select this text node if we're constantly setting it
    if (textNode.nodeValue !== text) textNode.nodeValue = text;

    const domAppender = imCacheEntriesGetParent(c, newDomAppender);
    appendToDomRoot(domAppender, textNode);

    return textNode;
}



// TODO:
// - Core:
//      - imMemo
// - User:
//      - [ ] im conditional block
//       - [ ] im-if, imelseif, im else
//       - [ ] im switch
//      - [ ] im for


// Case 1:
// - Entries
//      - first=domApender, rest=children
//
//      - easy for each entry to find the dom appender. but how do we delete?
//      for i in entries[0,len,2]:
//          if entries[i] === imBlockBegin:
//              if entries[i+1][ENTRIES_ITEMS_START] === newDomAppender:
//                  entries[i+1][ENTRIES_ITEMS_START + 1].root.remove();
//                  onRemove(^)
//      - Yeah. if deleting is hard, everything else will be hard. so this is a no go.
//                  
//
//
// Case 2:
// - domAppender
// - entries
//
// - easy to delete. But how does each entry knowo about `domAppender` ?
//      - const parentEntries = c[c[CACHE_IDX] - 1];
//        assert(current[current[ENTRIES_IDX]] === newDomAppender);
//        const domAppender = current[current[ENTRIES_IDX] + 1];
//      - even though it is the more frequent op, it should keep the codebase simpler. we can also cache the parent. 
//
// Case 3:
// - why not just put it in both places??? <------- [x]
//

const c: ImCacheEntries = [];

let toggle = false;

function imMain() {
    imCacheBegin(c); {
        imDomRootBegin(c, document.body); {
            if (imIf(c) && toggle) {
                imElBegin(c, El.Div); {
                    imText(c, "Henlo");
                } imElEnd(c, El.Div);
            } else {
                imElse(c);

                imElBegin(c, El.B); {
                    imText(c, "G bye");
                } imElEnd(c, El.B);
            } imIfEnd(c);
            imElBegin(c, El.Div); {
                imText(c, "Bro");
                imText(c, "!");
            } imElEnd(c, El.Div);
        } imDomRootEnd(c, document.body);
    } imCacheEnd(c);
}

imMain();

document.addEventListener("keydown", () => {
    toggle = !toggle;
    imMain();
});

// TODO: userland code
//

/*
if (r.parentRoot !== null) {
    // The only way to know that a root is no longer removed is that
    // we have actually started rendering things underneath it.
    r.parentRoot.removeLevel = REMOVE_LEVEL_NONE;
} */

// if (r.debug === true) {
//     console.log("visibility change", r.parentRoot);
//     setClass(debug1PxSolidRed, true, r);
//     setTimeout(() => {
//         setClass(debug1PxSolidRed, false, r);
//     }, 1000);
// }
//
