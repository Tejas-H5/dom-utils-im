///////////////////// Framework rewrite 3 (xD)
// Goals: 
//  - No more callbacks fr fr
//  - Simpler code, no more DOM dependency
//  - is it faster?
//  - Feature parity:
//      - imBeginRoot/imEnd
//      - imBeginList/imNextListRoot/imEndList/
//      - imMemo
//      - imOn
//
// At this point, I'm just writing this because I had the idea to, and I've just gotta follow through even
// though it may be of very little use to anyone.
//
// Design:
// 
// Immediate mode container:
//      stack
//          imNode
//              imNode
//                  imList
//                      -> { map of key -> imNode, or 
//
// I'm currently experiencing some difficulty with encoding this higly genric immediate mode tree. 
// I'm realsing that we _do_ only have ImRoots, list renderers and state entries. 
// The architecture is identical to waht we already have, execpt:
//      - decoupled from DOM
//      - using type Ids for state management.

import { assert } from "./assert";


// Needs to be defined this early, so that we can define our types here at the top
export const defaultImContainer = newImContainer();
let imContainer = defaultImContainer;
export function nextTypeId<T>(): TypeId<T> {
    return ++imContainer.typeId as TypeId<T>;
}

// Type IDs are non-deterministic. Never rely on their actual numerical value being something.
const NilTypeId = nextTypeId<undefined>();
export type ImContainer = {
    stack:  ImStateEntry[];
    typeId: TypeId<unknown>;
    root:   ImStateNode<undefined>;
};

const ImStateNodeTypeId = nextTypeId<ImStateNode<any>>();
export type ImStateNode<T = unknown> = {
    entry: ImStateEntry<T>;

    stateEnties:    ImStateEntry[];
    idx:            number;
    expectedLength: number;
    
    // Things get added, removed and destroyed via conditional rendering.
    removedLevel:     RemovedLevel;
    startedRendering: boolean;
    destructors:      (() => void)[] | undefined;
}

export type ImStateEntry<T = unknown> = {
    typeId: TypeId<T>;
    value: T | undefined;
};

// While the typescript linter says <T> isn't used, it definately is. A LOT. 
export type TypeId<T> = number & { TypeId: void; };

export function inlineTypeId<T>(val: number): TypeId<T> {
    return val as TypeId<T>;
}

export const REMOVE_LEVEL_NONE = 1;
export const REMOVE_LEVEL_DETATCHED = 2;
export const REMOVE_LEVEL_DESTROYED = 3;

export type RemovedLevel 
    = typeof REMOVE_LEVEL_NONE
    | typeof REMOVE_LEVEL_DETATCHED   // This is the default remove level. The increase in performance far oughtweighs any memory problems. 
    | typeof REMOVE_LEVEL_DESTROYED;


const ImNodeListTypeId = nextTypeId<ImNodeList>();
type ImNodeList = {
    idx: number;
    entries: ImStateEntry[];
    keyedEntries: Map<ValidKey, { entry: ImStateEntry; rendered: boolean }> | undefined;
};

// Can be anything, I'm pretty sure.
export type ValidKey = string | number | Function | object | unknown;


function newImContainer(): ImContainer {
    const root = newImNode(NilTypeId);
    root.removedLevel = REMOVE_LEVEL_NONE;
    return { stack: [], typeId: 1 as TypeId<unknown>, root };
}

function newImNode<T>(typeId: TypeId<T>): ImStateNode<T> {
    return {
        entry: { typeId, value: undefined },

        stateEnties:      [],
        idx:              -1,
        expectedLength:   0,

        startedRendering: false,
        removedLevel:     REMOVE_LEVEL_DETATCHED,
        destructors:      undefined,
    };
}


// ??. TODO: finish
function popImStateNode(container: ImContainer, n: ImStateNode) {
    container.stack.pop();
    if (n.idx === -1) {
        // TODO:nothing was rendered to this root. Let's detatch all it's elements, or something
    } else {
        if (n.expectedLength === 0) {
            n.expectedLength = n.idx + 1;
        } else {
            throw new Error("Can't be resizing the array like that bro."); // TODO: better diagnostic message
        }
    }
}

function getCurrentStateOrNull(): ImStateEntry | null {
    let result: ImStateEntry | null = null;
    if (imContainer.stack.length > 0) result = imContainer.stack[imContainer.stack.length - 1];
    return result;
}

function getCurrentStateOfTypeOrUndefined<T>(typeId: TypeId<T>): T | undefined {
    const result = getCurrentStateOrNull();
    let val: T | undefined;
    if (result !== null && result.typeId === typeId && result.value !== undefined) {
        val = result.value as T;
    }

    return val;
}

function getCurrentStateOfType<T>(typeId: TypeId<T>): T {
    const result = getCurrentStateOfTypeOrUndefined(typeId);
    if (result === undefined) throw new Error("Couldn't get the thing");
    return result;
}

function getParentState(): ImStateEntry | null {
    let result: ImStateEntry | null = null;
    if (imContainer.stack.length > 1) result = imContainer.stack[imContainer.stack.length - 2];
    return result;
}

function getParentStateOfType<T>(typeId: TypeId<T>): T | null {
    let result = getParentState();

    let val: T | null = null;
    if (result !== null && result.typeId === typeId && result.value !== undefined) {
        val = result.value as T;
    }

    return val;
}

export function imGetEntry<T>(typeId: TypeId<T>): ImStateEntry<T> {
    const n = getCurrentStateOfType(ImStateNodeTypeId);
    const parent = getParentStateOfType(ImStateNodeTypeId);

    const idx = ++n.idx;
    if (idx === n.stateEnties.length) n.stateEnties.push({ value: undefined, typeId: typeId });

    const result = n.stateEnties[idx];
    if (result.typeId !== typeId) throw new Error("Wrong type here"); // TODO: better diagnostic message

    if (idx === 0 && parent !== null) {
        if (parent.removedLevel !== REMOVE_LEVEL_NONE) {
            parent.removedLevel = REMOVE_LEVEL_NONE;
            parent.startedRendering = true;
        } else {
            parent.startedRendering = false;
        }
    }

    return result as ImStateEntry<T>;
}

export function imGetAndPushEntry<T>(typeId: TypeId<T>): ImStateEntry<T> {
    const entry = imGetEntry<T>(typeId);
    imPushEntry(entry);
    return entry;
}

export function imPushEntry(entry: ImStateEntry<unknown>) {
    imContainer.stack.push(entry);
}


export function imPop(): ImStateEntry | undefined {
    return imContainer.stack.pop();
}

export function imPopType<T>(typeId: TypeId<T>): ImStateEntry<T> {
    const entry = imPop();
    assert(entry !== undefined, "There was nothing to pop");
    assert(entry.typeId === typeId, "You may have forgotten to pop something before this");
    return entry as ImStateEntry<T>;
}

function newImNodeList(): ImNodeList {
    return { entries: [], idx: -1, keyedEntries: undefined };
}

export function imBeginList(): ImNodeList {
    const entry = imGetEntry(ImNodeListTypeId);
    if (entry.value === undefined) entry.value = newImNodeList();
    return entry.value;
}

export function imListGetNextEntry(key: ValidKey | undefined): ImStateEntry {
    const entryToPop = getCurrentStateOrNull();
    let l: ImNodeList | null = null;
    if (entryToPop !== null && entryToPop.typeId === ImNodeListTypeId) {
        l = entryToPop.value as ImNodeList;
    } else {
        imPop();
        l = getCurrentStateOfType(ImNodeListTypeId);
    }

    let entry;
    if (key !== undefined) {
        // use the map
        // TODO: consider array of pairs

        if (l.keyedEntries === undefined) {
            l.keyedEntries = new Map();
        }

        let block = l.keyedEntries.get(key);
        if (block === undefined) {
            block = {
                entry: { typeId: ImStateNodeTypeId, value: undefined },
                rendered: false,
            };
            l.keyedEntries.set(key, block);
        }

        /**
         * You're rendering this list element twice. You may have duplicate keys in your dataset.
         *
         * If that is not the case, a more common cause is that you are mutating collections while iterating them.
         * By moving an element you've already iterated over down in the list such that you will iterate it again,
         * you've requested this key a second time, and are now rendering it.
         * Here's a potential way to temporarliy avoid doing this:
         *
         * // TODO: provide a reworked example
         *
         * function Component() {
         *      let deferredAction: DeferredAction;
         *
         *      imFor(); for(let i = 0; i < list.length; i++) {
         *          const item = list[i];
         *          imNextRoot(item);
         *
         *          imBeginDiv(); {
         *              setText("Move down");
         *
         *              const click = imOn("click");
         *              if (click && i !== list.length - 1) {
         *                  // This line will causes this assertion to trigger, because the next iteration will rerender this item. 
         *                  // swap(list, i, i + 1); <- 
         *                  // Do this instead:
         *                  deferredAction = () => swap(list, i, i + 1);
         *              }
         *          } imEnd();
         *      } imEndFor();
         *
         *      if (deferredAction) deferredAction();
         * }
         *
         * This approach should:
         *  - allow debugging with accurate call stacks
         *  - Error boundaries will still catch errors in this method
         *  - Full control over when it happens. Profiler will report the parent components in the call tree instead of random timeout event
         *  - Action can be literally anything
         */
        if (block.rendered === true) throw new Error(
            "You've requested the same list key twice. This is indicative of a bug. The comment above this exception will explain more."
        );

        block.rendered = true;

        entry = block.entry;
    } else {
        // use the array

        const idx = l.idx++;

        if (idx < l.entries.length) {
            entry = l.entries[idx];
        } else if (idx === l.entries.length) {
            entry = { typeId: ImStateNodeTypeId, value: undefined };
            l.entries.push(entry);
        } else {
            throw new Error("DEV: whenever l.builderIdx === this.builders.length, we should append another builder to the list");
        }
    }

    return entry;
}



///////////////////////// Usage code

/**

function imDomEl(DIV_EL) {
    const entry = imGetAndPush(DomElementTypeId);
    const parent = getParentState(DomAppenderTypeId);

    if (entry.value === undefined)  {
        entry.value = createDomAppender(parent);
    }

    setElementAtIdx(entry.value, parent.idx++);
}

function imDomElEnd() {
    imPop(DomElementTypeId);
}

function main() {
    imContainer(); {
        const audioContext = imGet(imInlineTypeId(121027));
        if (!audioContext.val) {
            audioContext.val = initAudioContext();
        }
        
        // can refactor to 
        // const AudioContext_TypeID = nextTypeId<AudioContext>();
        // imGetAudioContext() {
        //      const audioContext = imGet(AudioContext_TypeID);
        //      if (!audioContext.val) {
        //          audioContext.val = initAudioContext();
        //      }
        //      return audioContext.val;
        // }

        imDom(document.body); {
            imFixed(0, 0, 0, 0); {
                if (imIf() && audioContext.val.isLoading) {
                    imDiv(); imAlign(); imJustify(); {
                        imDiv(); imStr("Loading..."); imEnd();
                    } imEndEl();
                } else {
                    imElse();

                    imDiv(); imAlign(); imJustify(); {
                        if (imButton("click me!")) {
                            audioCtxResume(audioContext.value);
                            audioCtxPlay(audioContext.value, "Henlo.wav");
                        }
                    } imEndEl();
                } imEnd();

                imCanvas(); {
                    imList(); {
                        imFor(); for (let i  0; i < 100; i++) {
                            imForNext();


                        } imForEnd();
                    } imListEnd();
                } imCanvasEnd();
            } imDomElEnd();
        } imDomElEnd();
    } imContainerEnd();
}
*/



