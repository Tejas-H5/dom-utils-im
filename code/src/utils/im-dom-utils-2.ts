///////////////////// Framework rewrite 3 (xD)
// Goals: 
//      - No more callbacks fr fr
//      - Simpler code, no more DOM dependency
//      - is it faster?
//      - Feature parity:
//          - imBeginRoot/imEnd
//          - imBeginList/imNextListRoot/imEndList/
//          - imMemo
//          - imOn
//
//  Rewriting this be like Mr Bean at the end of the exam figuring out what he had to actually write

export type ImContainer = {
    stack: ImNode[];
};

export type ImNode = {
    stateEnties: ImStateEntry<unknown>[];
    idx: number;
    expectedLength: number;
    
    parent: ImNode | null;
    removedLevel: RemovedLevel;
    startedRendering: boolean;

    destructors: (() => void)[] | undefined;
}

export type ImStateEntry<T> = {
    typeId: TypeId<T>;
    value: T | undefined;
};

// While it appears to not be used, it's def. used
export type TypeId<T> = number & { TypeId: void; };

// Needs to be defined this early, so that we can continue to define our types here at the top
let typeId = 0;
export function getNextTypeId<T>(): TypeId<T> {
    return ++typeId as TypeId<T>;
}

export const REMOVE_LEVEL_NONE = 1;
export const REMOVE_LEVEL_DETATCHED = 2;
export const REMOVE_LEVEL_DESTROYED = 3;

export type RemovedLevel 
    = typeof REMOVE_LEVEL_NONE
    | typeof REMOVE_LEVEL_DETATCHED   // This is the default remove level. The increase in performance far oughtweighs any memory problems. 
    | typeof REMOVE_LEVEL_DESTROYED;


const ImNodeList_TYPEID = getNextTypeId<ImNodeList>();
type ImNodeList = {
    idx: number;
    nodes: ImNode[];
    keyedNodes: Map<ValidKey, ImNode> | undefined;
};

// Can be anything, I'm pretty sure.
export type ValidKey = string | number | Function | object | unknown;


function newImContainer(): ImContainer{ 
    return { stack: [] };
}

function newImNode(): ImNode {
    return {
        stateEnties: [],
        idx: -1,
        expectedLength: 0,
        parent: null,
        startedRendering: false,
        removedLevel: REMOVE_LEVEL_DETATCHED,
        destructors: undefined,
    };
}


let container: ImContainer = newImContainer();

function getCurrentImNode(): ImNode {
    if (container.stack.length === 0) throw new Error("nothing to get."); // TODO: better diagnostic message
    return container.stack[container.stack.length - 1];
}

function beginRendering(container: ImContainer, n: ImNode) {
    let parent: ImNode | null = null;
    if (container.stack.length > 0) parent = container.stack[container.stack.length - 1];
    n.parent = parent;

    container.stack.push(n);
    n.idx = -1;
}

function endRendering(container: ImContainer, n: ImNode) {
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

function imGet<T>(typeId: TypeId<T>, n = getCurrentImNode()): ImStateEntry<T> {
    const idx = ++n.idx;
    if (idx === n.stateEnties.length) {
        n.stateEnties.push({ value: undefined, typeId: typeId });
    } 
    const result = n.stateEnties[idx];
    if (result.typeId !== typeId) throw new Error("Wrong type here"); // TODO: better diagnostic message

    if (idx === 0 && n.parent !== null) {
        if (n.parent.removedLevel !== REMOVE_LEVEL_NONE) {
            n.parent.removedLevel = REMOVE_LEVEL_NONE;
            n.parent.startedRendering = true;
        } else {
            n.parent.startedRendering = false;
        }
    }

    return result as ImStateEntry<T>;
}


function newImNodeList(): ImNodeList {
    return { nodes: [], idx: -1, keyedNodes: undefined };
}

function imGetList(): ImNodeList {
    const entry = imGet(ImNodeList_TYPEID);
    if (entry.value === undefined) entry.value = newImNodeList();
    return entry.value;
}

