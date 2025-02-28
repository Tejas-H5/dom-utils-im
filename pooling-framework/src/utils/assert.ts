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
export function assert<T>(value: T | false | null | undefined | 0 | ""): value is T {
    if (!value) {
        throw new Error("Assertion failed");
    }

    return true;
}

export function userError(): never {
    throw new Error("User error");
}

export function devError(): never {
    throw new Error("Dev error");
}
