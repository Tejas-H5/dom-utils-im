// An immediate-mode array datastructure is an array 
// that starts off being variable length, and then locks
// it's own size at some point during a 'frame boundary'.
// The idea is that by adding strict element count preconditions,
// An immediate mode renderer can be written that has better
// performance charactaristics than a diffing algorithm.

import { assert } from "./assert";


export type ImmediateModeArray<T> = {
    items: T[];
    expectedLength: number;
    idx: number;
};

export function newImArray<T>(): ImmediateModeArray<T> {
    return {
        items: [],
        expectedLength: -1,
        idx: -1,
    };
}

export function imGetNext<T>(arr: ImmediateModeArray<T>): T | undefined {
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

export function imPush<T>(arr: ImmediateModeArray<T>, value: T): T {
    // DEV: Pushing to an immediate mode array after it's been finalized is always a mistake
    assert(arr.expectedLength === -1);
    assert(arr.items.length === arr.idx);

    arr.items.push(value);

    return value;
}

export function imLockSize(arr: ImmediateModeArray<unknown>) {
    if (arr.expectedLength === -1) {
        if (arr.idx !== -1) {
            arr.expectedLength = arr.items.length;
        }
    }
}

export function imReset(arr: ImmediateModeArray<unknown>, idx: number = -1) {
    if (arr.expectedLength !== -1) {
        // Once an immediate mode array has been finalized, every subsequent render must create the same number of things.
        // In this case, you've rendered too few(?) things.
        assert(arr.expectedLength === arr.items.length);
    } 

    arr.idx = idx;
}

