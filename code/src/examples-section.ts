import { imBeginEditableTextArea } from "./components/text-area";
import { COL, imBeginLayout, imInitStyles, ROW, toViewableError, ViewableError } from "./design";
import { cn, newCssBuilder } from "./utils/cssb";

import * as domUtils from "src/utils/im-dom-utils";
import {
    elementHasMousePress,
    imStateInline,
    setClass,
    imSwitch,
    imEndSwitch,
    imCatch,
    imEnd,
    imEndFor,
    imEndIf,
    imEndTry,
    imFor,
    imIf,
    imElse,
    imInit,
    imMemo,
    imOn,
    imRef,
    imState,
    imTextSpan,
    imTry,
    nextListRoot,
    setAttr,
} from "src/utils/im-dom-utils"


function recomputeCustomRenderFn(code: string): (() => void) {
    const exports = {
        renderFn: () => {},
    };

    (new Function(`
const macroSource = "use strict";
return (domUtils, document, console, exports) => { 
    const { ${Object.keys(domUtils).join(", ")} } = domUtils; 
    ${code} 
};`)())(domUtils, document, console, exports);

    return exports.renderFn;
}



type Example = {
    name: string;
    code: string;
};

const originalExamples: Example[] = [
    {
        name: "README example",
        code: `
function newButton() {
    return document.createElement("button");
}

function appState() {
    return { count: 0 };
}

function App() {
    const state = imState(appState);

    imBeginDiv(); {
        setInnerText("Count: " + state.count);
    } imEnd();

    imBeginDiv(); {
        imBeginRoot(newButton); {
            setInnerText("Increment");
            if (elementHasMousePress()) {
                state.count++;
            }
        } imEnd();
    } imEnd();

    if (imIf() && state.count > 10) {
        imBeginDiv(); {
            setInnerText("Count is super high?!? aint no way bruh? ");
        } imEnd();
    } imEndIf();
}

exports.renderFn = App;
`
    },
    {
        name: "Failure case",
    code: `
let n = 0;

function App() {
    n++;
    if (n > 100) {
        throw new Error("Brooo")
    }
    for (let i = 0; i < n; i++) {
        // As soon as n is incremented, the app will (ideally) throw an Error, complaining about a different number of
        // things being rendered.
        imBeginDiv(); imEnd();
    }
}

exports.renderFn = App;
`
    },
    {
        name: "Advanced control flow",
        code: `
let n = 0;
let error = null;

function newButton() {
    return document.createElement("button");
}

function App() {
    n++;

    let l = imTry(); try {
        if (imIf() && !error) {
        
            imFor(); for (let i = 0; i < n; i++) {
                nextListRoot();

                imBeginDiv(); {
                    imTextSpan("" + i);
                } imEnd();

                if (i > 30)  {
                    throw new Error("Lets gooooo")
                }
            } imEndFor();
        } else {
            imElse();
            imBeginDiv(); {
                imTextSpan("We just made a custom error boundary using almost every control-flow primitive this framework has to offer: " + error);
            } imEnd();
                
            imBeginRoot(newButton); {
                imTextSpan("Reset this example");

                if (elementHasMousePress()) {
                    n = 0;
                }
            } imEnd();

        } imEndIf()
    } catch(e) {
        imCatch(l);

        error = e;
    } imEndTry()
}

exports.renderFn = App;
`
    }
];

type ExamplesSectionState = {
    text: string;
    code: () => void;
    examples: Example[]
    exampleIdx: number;
    error: ViewableError | null;
};

function newExamplesSectionState(): ExamplesSectionState  {
    return {
        text: "",
        code: () => {},
        examples: [],
        exampleIdx: 1,
        error: null,
    };
}

function setText(s: ExamplesSectionState, text: string) {
    s.text = text;
    s.code = recomputeCustomRenderFn(text);
    try {
        s.code = recomputeCustomRenderFn(s.text);
        s.error = null;
    } catch (e) {
        s.code = () => { };
        s.error = toViewableError(e);
    }
}

function setExample(s: ExamplesSectionState, idx: number) {
    s.exampleIdx = idx;
    setText(s, s.examples[idx].code);
}

const cssb = newCssBuilder();

const cnTabContainer = cssb.cn("tab-container", [
` .tab { 
    user-select: none;
    cursor: pointer;
}`,
` .tab:hover { 
    background-color: #CCC; 
}`,
` .tab.selected { 
    background-color: #CCC; 
}`,
` .tab:active { 
    background-color: #888; 
    color: #FFF; 
}`,
]);


export function imExampleSection() {
    const s = imState(newExamplesSectionState);
    if (imInit()) {
        s.examples.push(...originalExamples);
    }

    const currentExample = s.examples[s.exampleIdx];
    const currentExampleChanged = imMemo(currentExample);
    if (currentExampleChanged) {
        setText(s, currentExample.code.trim());
    }

    // Content
    imBeginLayout(); {
        imInitStyles(`padding: 10px; border: 1px solid black;`);

        imBeginLayout(ROW); {
            imInitStyles(`gap: 5px`);
            imInitStyles(`aspect-ratio: 16 / 6`);

            imBeginLayout(); {
                imInitStyles(`flex: 1; overflow: auto; border: 1px solid black`);

                const l = imTry(); try {
                    const err = s.error;
                    if (imIf() && !err) {
                        // Turns out we _do_ need to render the custom code in it's own context
                        // so that we can recover from otherwise fatal errors like a missing call to imEnd().

                        const customCtxRoot = imBeginLayout(); {
                            const customCtxRef = imRef<domUtils.ImContext>();
                            if (!customCtxRef.val) {
                                // TODO: need a way to de-initialize a context. i.e remove event handlers.
                                customCtxRef.val = domUtils.newImContext(customCtxRoot.root)
                                domUtils.initImContext(customCtxRef.val);

                                customCtxRef.val.renderFn = function imEditableComponent() {
                                    // This 'component' is different every time it's function is recomputed
                                    imSwitch(s.code);
                                    s.code();
                                    imEndSwitch();
                                };
                            }

                            const customCtx = customCtxRef.val;
                            const currentCtx = domUtils.getImContext();

                            try {
                                // TODO: How would we provide the time in a non-realtime environment?
                                // If using React, might need to run this inside a framer-motion animation loop.
                                customCtx.isRendering = false;
                                domUtils.rerenderImContext(customCtx, currentCtx.lastTime, false);
                            } finally {
                                domUtils.setImContext(currentCtx);
                            }
                        } imEnd();
                    } else {
                        imElse();

                        imBeginLayout(); {
                            imInitStyles(`white-space: pre`);

                            imTextSpan("An error occured: " + err!.error);
                            imBeginLayout(); {
                                imTextSpan("" + err!.stack);
                            } imEnd();
                        } imEnd();
                    } imEndIf();
                } catch (e) {
                    imCatch(l);
                    s.error = toViewableError(e);
                } imEndTry();
            } imEnd();

            imBeginLayout(COL); {
                imInitStyles(`flex: 1`);
                setClass(cn.overflowYAuto);

                // Tabs
                imBeginLayout(ROW); {
                    if (imInitStyles(`gap: 5px`)) {
                        setClass(cnTabContainer);
                    }

                    imBeginLayout(); {
                        imInitStyles(`flex: 1`);
                        imFor(); for (
                            let i = 0;
                            i < s.examples.length;
                            i++
                        ) {
                            const example = s.examples[i];
                            nextListRoot();
                            imBeginLayout(); {
                                if (imInitStyles(
                                    `display: inline-block; font-weight: bold; padding: 3px 5px; padding-right: 20px; 
                                    border: 1px solid black; border-bottom: none; border-radius: 4px 4px 0px 0px;`
                                )) {
                                    setClass("tab");
                                }

                                const selected = s.exampleIdx === i;
                                if (imMemo(selected)) {
                                    setClass("selected", selected);
                                }

                                imTextSpan(example.name);

                                if (elementHasMousePress()) {
                                    setExample(s, i);
                                }
                            } imEnd();
                        }
                        imEndFor();
                    } imEnd();
                } imEnd();

                imBeginLayout(); {
                    if (imInitStyles(`
                        flex: 1; background-colour: #888; font-family: monospace; font-size: 1rem;
                        padding: 5px; border: 1px solid black;`
                    )) {
                        setAttr("spellcheck", "false");
                    }

                    const textAreaRef = imRef<HTMLTextAreaElement>();
                    imBeginEditableTextArea({
                        text: s.text,
                        isEditing: true,
                        config: {
                            useSpacesInsteadOfTabs: true,
                            tabStopSize: 4,
                        },
                        textAreaRef,
                    }); {
                        const eInput = imOn("input");
                        if (eInput) {
                            setText(s, textAreaRef.val!.value);
                        }
                    } imEnd();
                } imEnd();
            } imEnd();
        } imEnd();
    } imEnd();
}
