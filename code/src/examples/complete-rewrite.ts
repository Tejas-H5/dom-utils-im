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
const ENTRIES_IS_DERIVED = 4;
const ENTRIES_STARTED_CONDITIONALLY_RENDERING = 5;
const ENTRIES_DESTRUCTORS = 6;
const ENTRIES_KEYED_MAP = 7;
const ENTRIES_KEYED_MAP_LAST_IDX = 8;
const ENTRIES_PARENT_TYPE = 9;
const ENTRIES_PARENT_VALUE = 10;
const ENTRIES_ITEMS_START = 11; 

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

export function imCache(c: ImCache) {
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

    imCacheEntriesPush(c, c[CACHE_ROOT_ENTRIES], imCache, c);

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
        entries[ENTRIES_LAST_IDX] = ENTRIES_ITEMS_START - 2;
        entries[ENTRIES_REMOVE_LEVEL] = REMOVE_LEVEL_DETATCHED;
        entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY] = false;
        entries[ENTRIES_IS_DERIVED] = false;
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

export function imGet<T>(c: ImCache, typeId: TypeId<T>): T | undefined {
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


export function imGetParent<T>(c: ImCache, typeId: TypeId<T>): T {
    // If this assertion fails, then you may have forgotten to pop some things you've pushed onto the stack
    const entries = c[CACHE_CURRENT_ENTRIES];
    assert(entries[ENTRIES_PARENT_TYPE] === typeId);
    return entries[ENTRIES_PARENT_VALUE] as T;
}


export function imSet<T>(c: ImCache, val: T): T {
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
    let entries; entries = imGet(c, imBlockBegin);
    if (entries === undefined) entries = imSet(c, []);

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
    const lastIdx = entries[ENTRIES_LAST_IDX];
    if (idx !== (ENTRIES_ITEMS_START - 2)) {
        if (lastIdx !== (ENTRIES_ITEMS_START - 2) && lastIdx !== lastIdx) {
            throw new Error("You should be rendering the same number of things in every render cycle");
        }
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

function isFirstishRender(c: ImCache): boolean {
    const entries = c[CACHE_CURRENT_ENTRIES];
    return entries[ENTRIES_LAST_IDX] === (ENTRIES_ITEMS_START - 2);
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
    // Will automatically isolate the next immediate mode call-sites with zero further effort required,
    // because all the entries will go into a single array which always takes up just 1 slot in the entries list.
    // It's a bit confusing why there isn't more logic here though, I guess.
    //
    // NOTE: I've now moved this functionality into core. Your immediate mode tree builder will need
    // to resolve diffs in basically the same way.

    imBlockEnd(c);
}

function imIf(c: ImCache): true {
    __imBlockBeginArray(c);
        __imConditionalBlockBegin(c);
    return true;
}

function imIfElse(c: ImCache): true {
        __imConditionalBlockEnd(c);
        __imConditionalBlockBegin(c);
    return true;
}

function imIfEnd(c: ImCache) {
        __imConditionalBlockEnd(c);
    __imBlockArrayEnd(c);
}

function __imBlockBeginArray(c: ImCache) {
    __imDerivedBlockBegin(c);
}

function __imConditionalBlockBegin(c: ImCache) {
    __imDerivedBlockBegin(c);
}

function __imConditionalBlockEnd(c: ImCache) {
    const entries = c[CACHE_CURRENT_ENTRIES];
    if (entries[ENTRIES_IDX] === ENTRIES_ITEMS_START - 2) {
        imCacheEntriesOnRemove(entries);
    }

    __imDerivedBlockEnd(c);
}

function imFor(c: ImCache) {
    __imBlockBeginArray(c);
}

function imForEnd(c: ImCache) {
    __imBlockArrayEnd(c);
}

function __imBlockArrayEnd(c: ImCache) {
    const entries = c[CACHE_CURRENT_ENTRIES]

    const idx = entries[ENTRIES_IDX];
    const lastIdx = entries[ENTRIES_LAST_IDX];
    if (idx < lastIdx) {
        // These entries have left the conditional rendering pathway
        for (let i = idx + 2; i <= lastIdx; i += 2) {
            const t = entries[i];
            const v = entries[i + 1];
            if (t === imBlockBegin) {
                imCacheEntriesOnRemove(v);
            }
        }
    }

    // we allow growing this list in particular
    entries[ENTRIES_LAST_IDX] = idx; 

    __imDerivedBlockEnd(c1);
}


const MEMO_INITIAL_VALUE = {};

export const MEMO_NOT_CHANGED  = 0;
/** returned by {@link imMemo} if the value changed */
export const MEMO_CHANGED      = 1; 
/** 
 * returned by {@link imMemo} if this is simply the first render. 
 * Most of the time the distinction is not important, but sometimes,
 * you want to happen on a change but NOT the initial renderer.
 */
export const MEMO_FIRST_RENDER = 2;
/** 
 * returned by {@link imMemo} if this is is caused by the component
 * re-entering the conditional rendering codepath.
 */
export const MEMO_FIRST_RENDER_CONDITIONAL = 3;

export type ImMemoResult
    = typeof MEMO_NOT_CHANGED
    | typeof MEMO_CHANGED 
    // NOTE: we've lost the ability to detect this correclty without a second state entry specifically for this, which I probably won't add.
    // TODO: remove this once we confirm it's never used
    | typeof MEMO_FIRST_RENDER 
    | typeof MEMO_FIRST_RENDER_CONDITIONAL;

// NOTE: if val starts off as undefined, this may never go off...
function imMemo(c: ImCache, val: unknown): ImMemoResult {
    // NOTE: I had previously implemented imBeginMemo() and imEndMemo():
    // ```
    // if (imBeginMemo().val(x).objectVals(obj)) {
    //      <Memoized component>
    // } imEndMemo();
    // ```
    // It's pretty straightforward to implement - just memorize the dom index and the state index,
    // ensure it returns true the first time so that you always have some components,
    // and then onwards, if the values are the same, just advance the dom index and state index.
    // else, return true and allow the rendering code to do this for you, and cache the new offsets
    // in imEndMemo. Looks great right? Ended up with all sorts of stale state bugs so I deleted it.
    // It's just not worth it ever, imo.
    //
    // I also previously had imMemoMany(), imMemoArray() and imMemoObjectVals, but these are a slipperly slope
    // to imMemoDeep() which I definately don't want to ever implement. Also I was basically never using them. So I
    // have deleted them.

    let result: ImMemoResult = MEMO_NOT_CHANGED;

    const entries = c[CACHE_CURRENT_ENTRIES];

    let lastVal = imGet(c, inlineTypeId(imMemo));
    if (lastVal !== val) {
        imSet(c, val);
        result = MEMO_CHANGED;
    } else if (entries[ENTRIES_STARTED_CONDITIONALLY_RENDERING] === true) {
        result = MEMO_FIRST_RENDER_CONDITIONAL;
    }

    return result;
}

///////////////////////////////////////////////
// UI Layer code starts here

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
export const EL_A = { val: "a" } as const;
export const EL_ABBR = { val: "abbr" } as const;
export const EL_ADDRESS = { val: "address" } as const;
export const EL_AREA = { val: "area" } as const;
export const EL_ARTICLE = { val: "article" } as const;
export const EL_ASIDE = { val: "aside" } as const;
export const EL_AUDIO = { val: "audio" } as const;
export const EL_B = { val: "b" } as const;
export const EL_BASE = { val: "base" } as const;
export const EL_BDI = { val: "bdi" } as const;
export const EL_BDO = { val: "bdo" } as const;
export const EL_BLOCKQUOTE = { val: "blockquote" } as const;
export const EL_BODY = { val: "body" } as const;
export const EL_BR = { val: "br" } as const;
export const EL_BUTTON = { val: "button" } as const;
export const EL_CANVAS = { val: "canvas" } as const;
export const EL_CAPTION = { val: "caption" } as const;
export const EL_CITE = { val: "cite" } as const;
export const EL_CODE = { val: "code" } as const;
export const EL_COL = { val: "col" } as const;
export const EL_COLGROUP = { val: "colgroup" } as const;
export const EL_DATA = { val: "data" } as const;
export const EL_DATALIST = { val: "datalist" } as const;
export const EL_DD = { val: "dd" } as const;
export const EL_DEL = { val: "del" } as const;
export const EL_DETAILS = { val: "details" } as const;
export const EL_DFN = { val: "dfn" } as const;
export const EL_DIALOG = { val: "dialog" } as const;
export const EL_DIV = { val: "div" } as const;
export const EL_DL = { val: "dl" } as const;
export const EL_DT = { val: "dt" } as const;
export const EL_EM = { val: "em" } as const;
export const EL_EMBED = { val: "embed" } as const;
export const EL_FIELDSET = { val: "fieldset" } as const;
export const EL_FIGCAPTION = { val: "figcaption" } as const;
export const EL_FIGURE = { val: "figure" } as const;
export const EL_FOOTER = { val: "footer" } as const;
export const EL_FORM = { val: "form" } as const;
export const EL_H1 = { val: "h1" } as const;
export const EL_H2 = { val: "h2" } as const;
export const EL_H3 = { val: "h3" } as const;
export const EL_H4 = { val: "h4" } as const;
export const EL_H5 = { val: "h5" } as const;
export const EL_H6 = { val: "h6" } as const;
export const EL_HEAD = { val: "head" } as const;
export const EL_HEADER = { val: "header" } as const;
export const EL_HGROUP = { val: "hgroup" } as const;
export const EL_HR = { val: "hr" } as const;
export const EL_HTML = { val: "html" } as const;
export const EL_I = { val: "i" } as const;
export const EL_IFRAME = { val: "iframe" } as const;
export const EL_IMG = { val: "img" } as const;
export const EL_INPUT = { val: "input" } as const;
export const EL_INS = { val: "ins" } as const;
export const EL_KBD = { val: "kbd" } as const;
export const EL_LABEL = { val: "label" } as const;
export const EL_LEGEND = { val: "legend" } as const;
export const EL_LI = { val: "li" } as const;
export const EL_LINK = { val: "link" } as const;
export const EL_MAIN = { val: "main" } as const;
export const EL_MAP = { val: "map" } as const;
export const EL_MARK = { val: "mark" } as const;
export const EL_MENU = { val: "menu" } as const;
export const EL_META = { val: "meta" } as const;
export const EL_METER = { val: "meter" } as const;
export const EL_NAV = { val: "nav" } as const;
export const EL_NOSCRIPT = { val: "noscript" } as const;
export const EL_OBJECT = { val: "object" } as const;
export const EL_OL = { val: "ol" } as const;
export const EL_OPTGROUP = { val: "optgroup" } as const;
export const EL_OPTION = { val: "option" } as const;
export const EL_OUTPUT = { val: "output" } as const;
export const EL_P = { val: "p" } as const;
export const EL_PICTURE = { val: "picture" } as const;
export const EL_PRE = { val: "pre" } as const;
export const EL_PROGRESS = { val: "progress" } as const;
export const EL_Q = { val: "q" } as const;
export const EL_RP = { val: "rp" } as const;
export const EL_RT = { val: "rt" } as const;
export const EL_RUBY = { val: "ruby" } as const;
export const EL_S = { val: "s" } as const;
export const EL_SAMP = { val: "samp" } as const;
export const EL_SCRIPT = { val: "script" } as const;
export const EL_SEARCH = { val: "search" } as const;
export const EL_SECTION = { val: "section" } as const;
export const EL_SELECT = { val: "select" } as const;
export const EL_SLOT = { val: "slot" } as const;
export const EL_SMALL = { val: "small" } as const;
export const EL_SOURCE = { val: "source" } as const;
export const EL_SPAN = { val: "span" } as const;
export const EL_STRONG = { val: "strong" } as const;
export const EL_STYLE = { val: "style" } as const;
export const EL_SUB = { val: "sub" } as const;
export const EL_SUMMARY = { val: "summary" } as const;
export const EL_SUP = { val: "sup" } as const;
export const EL_TABLE = { val: "table" } as const;
export const EL_TBODY = { val: "tbody" } as const;
export const EL_TD = { val: "td" } as const;
export const EL_TEMPLATE = { val: "template" } as const;
export const EL_TEXTAREA = { val: "textarea" } as const;
export const EL_TFOOT = { val: "tfoot" } as const;
export const EL_TH = { val: "th" } as const;
export const EL_THEAD = { val: "thead" } as const;
export const EL_TIME = { val: "time" } as const;
export const EL_TITLE = { val: "title" } as const;
export const EL_TR = { val: "tr" } as const;
export const EL_TRACK = { val: "track" } as const;
export const EL_U = { val: "u" } as const;
export const EL_UL = { val: "ul" } as const;
export const EL_VAR = { val: "var" } as const;
export const EL_VIDEO = { val: "video" } as const;
export const EL_WBR = { val: "wbr" } as const;

export function imEl<K extends keyof HTMLElementTagNameMap>(
    c: ImCache,
    r: KeyRef<K>
): DomAppender<HTMLElementTagNameMap[K]> {
    // Make this entry in the current entry list, so we can delete it easily
    const appender = imGetParent(c, newDomAppender);

    let childAppender: DomAppender<HTMLElementTagNameMap[K]> | undefined = imGet(c, newDomAppender);
    if (childAppender === undefined) {
        const element = document.createElement(r.val);
        childAppender = imSet(c, newDomAppender(element));
        childAppender.ref = r;
    }

    appendToDomRoot(appender, childAppender.root);

    imBlockBegin(c, newDomAppender, childAppender);

    childAppender.idx = -1;

    return childAppender;
}

export function imElEnd(c: ImCache, r: KeyRef<keyof HTMLElementTagNameMap>) {
    const appender = imGetParent(c, newDomAppender);
    assert(appender.ref === r) // make sure we're popping the right thing
    finalizeDomAppender(appender);
    imBlockEnd(c);
}


function imDomRoot(c: ImCache, root: ValidElement) {
    let appender = imGet(c, newDomAppender);
    if (appender === undefined) {
        appender = imSet(c, newDomAppender(root));
        appender.ref = root;
    }

    imBlockBegin(c, newDomAppender, appender);

    appender.idx = -1;

    return appender;
}

function imDomRootEnd(c: ImCache, root: ValidElement) {
    let appender = imGetParent(c, newDomAppender);
    assert(appender.ref === root);
    finalizeDomAppender(appender);

    imBlockEnd(c);
}


interface Stringifyable {
    toString(): string;
}

function imAddStr(c: ImCache, value: Stringifyable): Text {
    let textNode; textNode = imGet(c, imAddStr);
    if (textNode === undefined) textNode = imSet(c, document.createTextNode(""));

    // The user can't select this text node if we're constantly setting it, so it's behind a cache
    let lastValue = imGet(c, inlineTypeId(document.createTextNode));
    if (lastValue !== value) {
        imSet(c, value);
        textNode.nodeValue = value.toString();
    }

    const domAppender = imGetParent(c, newDomAppender);
    appendToDomRoot(domAppender, textNode);

    return textNode;
}

export function elSetStyle<K extends (keyof ValidElement["style"])>(
    c: ImCache,
    key: K,
    value: string
) {
    const entries = c[CACHE_CURRENT_ENTRIES];
    const domAppender = imGetParent(c, newDomAppender);
    domAppender.root.style[key] = value;
}


///////////////////////////////////////////////
// Application code starts here


// TODO:
// - Core:
//      - imMemo
//      - [ ] im switch
//      - [ ] im for
//      - [ ] im try catch
// - User:
//      - recreate our random-stuff.ts

const c1: ImCache = [];

let toggleA = false;
let toggleB = false;

const changeEvents: string[] = [];

function imMain() {
    imCache(c1); {
        imDomRoot(c1, document.body); {
            imEl(c1,EL_H1); {
                imAddStr(c1, "Im memo changes");
            } imElEnd(c1, EL_H1);


            let i = 0;
            imFor(c1); for (const change of changeEvents) {
                imEl(c1, EL_DIV); {
                    imAddStr(c1, i++); 
                    imAddStr(c1, ":"); 
                    imAddStr(c1, change);
                } imElEnd(c1, EL_DIV);
            } imForEnd(c1);

            imEl(c1, EL_DIV); {
                if (isFirstishRender(c1)) {
                    elSetStyle(c1, "height", "2px");
                    elSetStyle(c1, "backgroundColor", "black");
                }
            } imElEnd(c1, EL_DIV);

            imEl(c1, EL_DIV); { imAddStr(c1, `toggleA: ${toggleA}, toggleB: ${toggleB}`); } imElEnd(c1, EL_DIV);
            imEl(c1, EL_DIV); { imAddStr(c1, `expected: ${toggleA ? (toggleB ? "A" : "B"): (toggleB ? "C": "D")}`); } imElEnd(c1, EL_DIV);

            if (imIf(c1) && toggleA) {
                if (imIf(c1) && toggleB) {
                    if (imIf(c1) && toggleB) {
                        if (imMemo(c1, toggleB)) {
                            changeEvents.push("A");
                            stabilized = false;
                        }

                        imEl(c1, EL_DIV); {
                            imAddStr(c1, "A");
                        } imElEnd(c1, EL_DIV);
                    } imIfEnd(c1);
                } else {
                    imIfElse(c1);

                    if (imMemo(c1, toggleB)) {
                        changeEvents.push("B");
                        stabilized = false;
                    }

                    imEl(c1, EL_DIV); {
                        imAddStr(c1, "B");
                    } imElEnd(c1, EL_DIV);
                } imIfEnd(c1);
            } else {
                imIfElse(c1);
                if (imIf(c1) && toggleB) {
                    if (imMemo(c1, toggleB)) {
                        changeEvents.push("C");
                        stabilized = false;
                    }

                    imEl(c1, EL_DIV); {
                        imAddStr(c1, "C");
                    } imElEnd(c1, EL_DIV);
                } else {
                    imIfElse(c1);

                    if (imMemo(c1, toggleB)) {
                        changeEvents.push("D");
                        stabilized = false;
                    }

                    imEl(c1, EL_DIV); {
                        imAddStr(c1, "D");
                    } imElEnd(c1, EL_DIV);
                } imIfEnd(c1);
            } imIfEnd(c1);
            imEl(c1, EL_DIV); {
                imAddStr(c1, "Bro");
                imAddStr(c1, "!");
            } imElEnd(c1, EL_DIV);
        } imDomRootEnd(c1, document.body);
    } imCacheEnd(c1);
}

let stabilized = false;
let numRerenders = 0;
imMain();

document.addEventListener("keydown", (e) => {
    numRerenders = 0;
    stabilized = false;
    while (!stabilized && numRerenders++ < 10) {
        stabilized = true;
        imMain();
    }

    if (e.key === "1") {
        toggleA = !toggleA;
    }
    if (e.key === "2") {
        toggleB = !toggleB;
    }
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
