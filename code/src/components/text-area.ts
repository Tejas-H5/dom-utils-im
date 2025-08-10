import { newCssBuilder } from "src/utils/cssb";
import { imBeginRoot, imEnd, imInit, imMemo, imIsFirstishRender, UIRoot } from "src/utils/im-utils-core";
import { setAttr, setClass, setInputValue, setStyle, setText, } from "src/utils/im-utils-dom";
import { imBegin, imInitClasses, INLINE } from "./core/layout";
import { cn, cssVars } from "./core/stylesheets";

export function getLineBeforePos(text: string, pos: number): string {
    const i = getLineStartPos(text, pos);
    return text.substring(i, pos);
}

export function getLineStartPos(text: string, pos: number): number {
    let i = pos;
    if (text[i] === "\r" || text[i] === "\n") {
        i--;
    }

    for (; i > 0; i--) {
        if (text[i] === "\r" || text[i] === "\n") {
            i++
            break;
        }
    }

    if (pos < i) {
        return 0;
    }

    return i;
}

export function newTextArea(initFn?: (el: HTMLTextAreaElement) => void): HTMLTextAreaElement {
    const textArea = document.createElement("textarea");

    initFn?.(textArea);

    return textArea
}

const cssb = newCssBuilder();

const cnTextAreaRoot = cssb.newClassName("customTextArea");
cssb.s(`
.${cnTextAreaRoot} textarea { 
    white-space: pre-wrap; 
    padding: 5px; 
    caret-color: ${cssVars.fg};
    color: transparent;
}
.${cnTextAreaRoot}:has(textarea:focus), .${cnTextAreaRoot}:has(textarea:hover) { 
    background-color: ${cssVars.bg2};
}
`);


export type TextAreaArgs = {
    value: string;
    isOneLine?: boolean;
    placeholder?: string;
};

// My best attempt at making a text input with the layout semantics of a div.
// NOTE: this text area has a tonne of minor things wrong with it. we should fix them at some point.
//   - When I have a lot of empty newlines, and then click off, the empty lines go away 'as needed' 
export function imBeginTextArea({
    value,
    isOneLine,
    placeholder = "",
}: TextAreaArgs) {
    let textArea: UIRoot<HTMLTextAreaElement>;

    const root = imBegin(); {
        imInitClasses(cn.flex1, cn.row, cn.h100, cn.overflowYAuto, cnTextAreaRoot);

        // This is now always present.
        imBegin(); {
            if (imInit()) {
                setAttr("class", [cn.handleLongWords, cn.relative, cn.w100, cn.hFitContent].join(" "));
                setAttr("style", "min-height: 100%");
            }

            setClass(cn.preWrap, !isOneLine)
            setClass(cn.pre, !!isOneLine)
            setClass(cn.overflowHidden, isOneLine)
            setClass(cn.noWrap, !!isOneLine);

            // This is a facade that gives the text area the illusion of auto-sizing!
            // but it only works if the text doesn't end in whitespace....
            imBegin(INLINE); {
                const placeholderChanged = imMemo(placeholder);
                const valueChanged = imMemo(value);
                if (placeholderChanged || valueChanged) {
                    if (!value) {
                        setText(placeholder);
                        setStyle("color", cssVars.fg2);
                    } else {
                        setText(value);
                        setStyle("color", cssVars.fg);
                    }
                }
            } imEnd();

            // This full-stop at the end of the text is what prevents the text-area from collapsing in on itself
            imBegin(INLINE); {
                if (imIsFirstishRender()) {
                    setStyle("color", "transparent");
                    setStyle("userSelect", "none");
                    setText(".");
                }
            } imEnd();

            textArea = imBeginRoot(newTextArea); {
                if (imInit()) {
                    setAttr("class", [cn.allUnset, cn.absoluteFill, cn.preWrap, cn.w100, cn.h100].join(" "));
                    setAttr("style", "background-color: transparent; color: transparent; overflow-y: hidden; padding: 0px");
                }

                if (imMemo(value)) {
                    // don't update the value out from under the user implicitly
                    setInputValue(textArea.root, value);
                }

            } // imEnd();
        } // imEnd();

        // TODO: some way to optionally render other stuff hereYou can now render your own overlays here.
    } // imEnd();


    return [root, textArea] as const;
}

export function imEndTextArea() {
    {
        {
            {
            } imEnd();
        } imEnd();
    } imEnd();
}



export type EditableTextAreaConfig = {
    useSpacesInsteadOfTabs?: boolean;
    tabStopSize?: number;
};

// Use this in a text area's "keydown" event handler
export function doExtraTextAreaInputHandling(
    e: KeyboardEvent,
    textArea: HTMLTextAreaElement,
    config: EditableTextAreaConfig
): boolean {
    const execCommand = document.execCommand.bind(document);

    // HTML text area doesn't like tabs, we need this additional code to be able to insert tabs (among other things).
    // Using the execCommand API is currently the only way to do this while perserving undo, 
    // and I won't be replacing it till there is really something better.
    const spacesInsteadOfTabs = config.useSpacesInsteadOfTabs ?? false;
    const tabStopSize = config.tabStopSize ?? 4;

    let text = textArea.value;
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;

    let handled = false;

    const getSpacesToRemove = (col: string) => {
        if (!config.useSpacesInsteadOfTabs) {
            return 1;
        }

        // if this bit has tabs, we can't do shiet
        if (![...col].every(c => c === " ")) {
            return 1;
        }

        // seems familiar, because it is - see the tab stop computation below
        let spacesToRemove = (col.length % tabStopSize)
        if (spacesToRemove === 0) {
            spacesToRemove = tabStopSize;
        }
        if (spacesToRemove > col.length) {
            spacesToRemove = col.length;
        }

        return spacesToRemove;
    }

    const getIndentation = (col: string): string => {
        if (!spacesInsteadOfTabs) {
            return "\t";
        }

        const numSpaces = tabStopSize - (col.length % tabStopSize);
        return " ".repeat(numSpaces);
    }

    if (e.key === "Backspace" && !e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        if (start === end) {
            const col = getLineBeforePos(text, start);

            const spacesToRemove = getSpacesToRemove(col);
            if (spacesToRemove) {
                e.preventDefault();
                for (let i = 0; i < spacesToRemove; i++) {
                    execCommand("delete", false, undefined);
                    handled = true;
                }
            }
        }
    } else if (e.key === "Tab" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.shiftKey) {
            e.preventDefault();

            let newStart = start;
            let newEnd = end;

            // iterating backwards allows us to delete text while iterating, since indices won't be shifted.
            let i = end;
            while (i >= start) {
                const col = getLineBeforePos(text, i);
                if (col.length === 0) {
                    i--;
                    continue;
                }

                const numNonWhitespaceAtColStart = col.trimStart().length;
                const pos = i - numNonWhitespaceAtColStart;
                textArea.selectionStart = pos;
                textArea.selectionEnd = pos;

                // de-indent by the correct amount.
                {
                    const col2 = col.substring(0, col.length - numNonWhitespaceAtColStart);
                    const spacesToRemove = getSpacesToRemove(col2);
                    for (let i = 0; i < spacesToRemove; i++) {
                        // cursor implicitly moves back 1 for each deletion.
                        execCommand("delete", false, undefined);
                        handled = true;
                        newEnd--;
                    }
                }

                i -= col.length;
            }

            textArea.selectionStart = newStart;
            textArea.selectionEnd = newEnd;
        } else {
            if (start === end) {
                const col = getLineBeforePos(text, start);
                const indentation = getIndentation(col);
                e.preventDefault();
                execCommand("insertText", false, indentation);
                handled = true;
            } else {
                e.preventDefault();

                let newStart = start;
                let newEnd = end;

                // iterating backwards allows us to delete text while iterating, since indices won't be shifted.
                let i = end;
                while (i >= start) {
                    const col = getLineBeforePos(text, i);
                    if (col.length === 0) {
                        i--;
                        continue;
                    }

                    const numNonWhitespaceAtColStart = col.trimStart().length;
                    const pos = i - numNonWhitespaceAtColStart;

                    // indent by the correct amount.
                    const col2 = col.substring(0, col.length - numNonWhitespaceAtColStart);
                    const indentation = getIndentation(col2);
                    textArea.selectionStart = pos;
                    textArea.selectionEnd = pos;

                    execCommand("insertText", false, indentation);
                    handled = true;
                    newEnd += indentation.length;

                    i -= col.length;
                }

                textArea.selectionStart = newStart;
                textArea.selectionEnd = newEnd;

            }
        }
    } else if (e.key === "Escape" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && start !== end) {
        handled = true;
        e.stopImmediatePropagation();
        textArea.selectionEnd = textArea.selectionStart;
    }

    return handled;
}

