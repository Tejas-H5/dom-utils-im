import { cn, newCssBuilder } from "src/utils/cssb";
import {
    imBeginDiv,
    imBeginRoot,
    imEnd,
    imState,
    imInit,
    Ref,
    setClass,
    setInputValue,
    imBeginSpan,
    setInnerText,
    setAttr,
    imIf,
    imEndIf,
    imOn
} from "src/utils/im-dom-utils";
import { getLineBeforePos } from "src/utils/text-utils";

const CSSVARS_FOCUS = "#CCC";
const CSSVARS_FG = "#000";
const execCommand = document.execCommand;

export function newTextArea(initFn?: (el: HTMLTextAreaElement) => void): HTMLTextAreaElement {
    const textArea = document.createElement("textarea");

    initFn?.(textArea);

    return textArea
}

const cssb = newCssBuilder();

const cnEditableTextArea = cssb.newClassName("editableTextArea");
cssb.s(`
textarea.${cnEditableTextArea} { 
    white-space: pre-wrap; padding: 5px; 
    caret-color: ${CSSVARS_FG};
    color: transparent;
}
textarea.${cnEditableTextArea}:focus { 
    color: ${CSSVARS_FG};
}
textarea.${cnEditableTextArea}:focus { background-color: ${CSSVARS_FOCUS}; }
`);

export type EditableTextAreaArgs = {
    text: string;
    isEditing: boolean;
    isOneLine?: boolean;
    config: EditableTextAreaConfig;
    textAreaRef?: Ref<HTMLTextAreaElement>;
};

type EditableTextAreaConfig = {
    useSpacesInsteadOfTabs?: boolean;
    tabStopSize?: number;
};

function newEditableTextAreaState() {
    return { 
        isEditing: false,
        lastText: "",
        lastIsEditing: false,
    };
}

// NOTE: this text area has a tonne of minor things wrong with it. we should fix them at some point.
//   - When I have a lot of empty newlines, and then click off, the empty lines go away 'as needed' 
export function imBeginEditableTextArea({
    text,
    isEditing,
    isOneLine,
    config,
    textAreaRef,
}: EditableTextAreaArgs) {
    const state = imState(newEditableTextAreaState);

    const wasEditing = state.isEditing;
    state.isEditing = isEditing;

    const root = imBeginDiv(); {
        if (imInit()) {
            setAttr("class", [cn.flex1, cn.row, cn.h100, cn.overflowYAuto].join(" "));
        }

        // This is now always present.
        imBeginDiv(); {
            if (imInit()) {
                setAttr("class", [cn.handleLongWords, cn.relative, cn.w100, cn.hFitContent, cn.overflowYAuto].join(" "));
                setAttr("style", "min-height: 100%");
            }

            setClass(cn.preWrap, !isOneLine)
            setClass(cn.pre, !!isOneLine)
            setClass(cn.overflowHidden, isOneLine)
            setClass(cn.noWrap, !!isOneLine);

            // This is a facade that gives the text area the illusion of auto-sizing!
            // but it only works if the text doesn't end in whitespace....
            imBeginSpan(); {
                setInnerText(text);
            } imEnd();

            // This full-stop at the end of the text is what prevents the text-area from collapsing in on itself
            imBeginSpan(); {
                if (imInit()) {
                    setAttr("style", "color: transparent");
                    setInnerText(".");
                }
            } imEnd();

            if (imIf() && isEditing) {
                const textArea = imBeginRoot(newTextArea).root; {
                    if (textAreaRef) {
                        textAreaRef.val = textArea;
                    }

                    if (imInit()) {
                        setAttr("class", [cnEditableTextArea, cn.allUnset, cn.absoluteFill, cn.preWrap, cn.w100, cn.h100].join(" "));
                        setAttr("style", "background-color: transparent; color: transparent; overflow-y: hidden; padding: 0px");
                    }

                    if (!wasEditing) {
                        textArea.focus({ preventScroll: true });
                    }

                    if (state.lastText !== text || state.lastIsEditing !== isEditing) {
                        state.lastText = text;
                        // for some reason, we need to render this thing again when we start editing - perhaps
                        // setting the input value doesn't work if it isn't visible...
                        state.lastIsEditing = isEditing;
                        setInputValue(textArea, text);
                    }

                    // events
                    {
                        // HTML text area doesn't like tabs, we need this additional code to be able to insert tabs (among other things).
                        // Using the execCommand API is currently the only way to do this while perserving undo, 
                        // and I won't be replacing it till there is really something better.
                        const keydown = imOn("keydown");
                        if (keydown) {
                            const e = keydown;
                            const spacesInsteadOfTabs = config.useSpacesInsteadOfTabs ?? false;
                            const tabStopSize = config.tabStopSize ?? 4;

                            let text = textArea.value;
                            const start = textArea.selectionStart;
                            const end = textArea.selectionEnd;

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
                                            document.execCommand("delete", false, undefined);
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
                                                document.execCommand("delete", false, undefined);
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
                                        document.execCommand("insertText", false, indentation);
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
                                            document.execCommand("insertText", false, indentation);
                                            newEnd += indentation.length;

                                            i -= col.length;
                                        }

                                        textArea.selectionStart = newStart;
                                        textArea.selectionEnd = newEnd;

                                    }
                                }
                            } else if (e.key === "Escape" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                                if (start !== end) {
                                    e.stopImmediatePropagation();
                                    textArea.selectionEnd = textArea.selectionStart;
                                }
                            }
                        };
                    }
                } imEnd();
            } imEndIf();
        } imEnd();
    } 

    // user specified end.
    // You can now render your own overlays here. 

    return root;
}


function handleTextAreaKeyboardInput(e: KeyboardEvent, textArea: HTMLTextAreaElement, config: EditableTextAreaConfig): boolean {
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
        handled = true;

        if (start === end) {
            const col = getLineBeforePos(text, start);

            const spacesToRemove = getSpacesToRemove(col);
            if (spacesToRemove) {
                e.preventDefault();
                for (let i = 0; i < spacesToRemove; i++) {
                    execCommand("delete", false, undefined);
                }
            }
        }
    } else if (e.key === "Tab" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        handled = true;

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

