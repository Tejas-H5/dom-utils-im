import { assert } from "src/utils/assert";
import { imBlock, imBlockEnd, ImCache, imGet, imGetParent, imSet, inlineTypeId } from "./im-core";

export type ValidElement = HTMLElement | SVGElement;
export type AppendableElement = (ValidElement | Text);
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
        // TODO: set up a bigger example, so we can see if optimizing htis makes a difference.
        // NOTE: the framework doesn't need to guess about what was added and removed in a diffing algorithm, it actually KNOWS!
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

    imBlock(c, newDomAppender, childAppender);

    childAppender.idx = -1;

    return childAppender;
}

export function imElEnd(c: ImCache, r: KeyRef<keyof HTMLElementTagNameMap>) {
    const appender = imGetParent(c, newDomAppender);
    assert(appender.ref === r) // make sure we're popping the right thing
    finalizeDomAppender(appender);
    imBlockEnd(c);
}


export function imDomRoot(c: ImCache, root: ValidElement) {
    let appender = imGet(c, newDomAppender);
    if (appender === undefined) {
        appender = imSet(c, newDomAppender(root));
        appender.ref = root;
    }

    imBlock(c, newDomAppender, appender);

    appender.idx = -1;

    return appender;
}

export function imDomRootEnd(c: ImCache, root: ValidElement) {
    let appender = imGetParent(c, newDomAppender);
    assert(appender.ref === root);
    finalizeDomAppender(appender);

    imBlockEnd(c);
}


interface Stringifyable {
    toString(): string;
}

export function imStr(c: ImCache, value: Stringifyable): Text {
    let textNode; textNode = imGet(c, imStr);
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
    const domAppender = imGetParent(c, newDomAppender);
    domAppender.root.style[key] = value;
}


export function elSetClass(
    c: ImCache,
    className: string,
    enabled: boolean | number = true,
): boolean {
    const domAppender = imGetParent(c, newDomAppender);

    if (enabled !== false && enabled !== 0) {
        domAppender.root.classList.add(className);
    } else {
        domAppender.root.classList.remove(className);
    }

    return !!enabled;
}

export function elSetAttr(
    c: ImCache,
    attr: string,
    val: string | null
) {
    const domAppender = imGetParent(c, newDomAppender);

    if (val !== null) {
        domAppender.root.setAttribute(attr, val);
    } else {
        domAppender.root.removeAttribute(attr);
    }
}


export function elGetAppender(c: ImCache): DomAppender<ValidElement> {
    const domAppender = imGetParent(c, newDomAppender);
    return domAppender;
}

export function elGet(c: ImCache) {
    return elGetAppender(c).root;
}
