import { imBegin, imInitStyles, ROW } from "./components/core/layout";
import { imStr } from "./components/text";
import { doExtraTextAreaInputHandling, imBeginTextArea } from "./components/text-area";
import { toViewableError, ViewableError } from "./design";
import { cn, newCssBuilder } from "./utils/cssb";

// We're exposing this entire module to some other code.
// We don't necessarily have to use them in this file itself thouhg.
import * as imUtilsCore from "src/utils/im-utils-core";
import * as imUtilsDom from "src/utils/im-utils-dom";

import {
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
    imMemo,
    imTry,
} from "src/utils/im-utils-core"
import {
    elementHasMousePress,
    setClass,
    imOn,
    setAttr,
} from "src/utils/im-utils-dom"


function recomputeCustomRenderFn(code: string): (() => void) {
    const exports = {
        renderFn: () => {},
    };

    (new Function(`
"use strict";
return (imUtilsCore, imUtilsDom, document, console, exports) => { 
    const { ${Object.keys(imUtilsCore).join(", ")} } = imUtilsCore; 
    const { ${Object.keys(imUtilsDom).join(", ")} } = imUtilsDom; 
    ${code} 
};`)())(imUtilsCore, imUtilsDom, document, console, exports);

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

function exampleSectionStateSetText(s: ExamplesSectionState, text: string) {
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
    exampleSectionStateSetText(s, s.examples[idx].code);
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
    let s; s = imUtilsCore.imGetState(imUtilsCore.inlineTypeId(imExampleSection));
    if (!s) s = newExamplesSectionState();

    const currentExample = s.examples[s.exampleIdx];
    const currentExampleChanged = imMemo(currentExample);
    if (currentExampleChanged) {
        exampleSectionStateSetText(s, currentExample.code.trim());
    }

    // Content
    imBegin(); {
        imInitStyles(`padding: 10px; border: 1px solid black;`);

        imBegin(ROW); {
            imInitStyles(`gap: 5px`);
            imInitStyles(`aspect-ratio: 16 / 6`);

            imBegin(); {
                imInitStyles(`flex: 1; overflow: auto; border: 1px solid black`);

                const l = imTry(); try {
                    const err = s.error;
                    if (imIf() && !err) {
                        // Turns out we _do_ need to render the custom code in it's own context
                        // so that we can recover from otherwise fatal errors like a missing call to imEnd().

                        const customCtxRoot = imBegin(); {
                            let customCtx = imUtilsCore.imGetState(imUtilsCore.newImCore);
                            if (!customCtx) {
                                const newCore = imUtilsCore.imSetState(imUtilsCore.newImCore(customCtxRoot.root));
                                customCtx = newCore;
                                imUtilsCore.initImCore(newCore);
                                imUtilsCore.addDestructor(() => imUtilsCore.uninitImCore(newCore));
                                newCore.renderFn = function imEditableComponent() {
                                    // This 'component' is different every time it's function is recomputed
                                    imSwitch(s.code);
                                    s.code();
                                    imEndSwitch();
                                };
                            }

                            const currentCtx = imUtilsCore.getImCore();

                            try {
                                // TODO: How would we provide the time in a non-realtime environment?
                                // If using React, might need to run this inside a framer-motion animation loop.
                                customCtx.isRendering = false;
                                imUtilsCore.rerenderImCore(customCtx, currentCtx.lastTime, false);
                            } finally {
                                imUtilsCore.setImCore(currentCtx);
                            }
                        } imEnd();
                    } else {
                        imElse();

                        imBegin(); {
                            imInitStyles(`white-space: pre`);

                            imStr("An error occured: " + err!.error); 
                            imBegin(); imStr(err!.stack); imEnd();
                        } imEnd();
                    } imEndIf();
                } catch (e) {
                    imCatch(l);
                    s.error = toViewableError(e);
                } imEndTry();
            } imEnd();

            imBegin(COL); {
                imInitStyles(`flex: 1`);
                setClass(cn.overflowYAuto);

                // Tabs
                imBegin(ROW); {
                    if (imInitStyles(`gap: 5px`)) {
                        setClass(cnTabContainer);
                    }

                    imBegin(); {
                        imInitStyles(`flex: 1`);
                        imFor(); for (
                            let i = 0;
                            i < s.examples.length;
                            i++
                        ) {
                            const example = s.examples[i];
                            imUtilsCore.imNextListRoot();
                            imBegin(); {
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

                                 imStr(example.name);

                                if (elementHasMousePress()) {
                                    setExample(s, i);
                                }
                            } imEnd();
                        }
                        imEndFor();
                    } imEnd();
                } imEnd();

                imBegin(); {
                    if (imInitStyles(`
                        flex: 1; background-colour: #888; font-family: monospace; font-size: 1rem;
                        padding: 5px; border: 1px solid black;`
                    )) {
                        setAttr("spellcheck", "false");
                    }

                    const [_, textArea] = imBeginTextArea({ value: s.text, }); {
                        const input = imOn("input");
                        const keydown = imOn("keydown");
                        if (keydown) {
                            doExtraTextAreaInputHandling(keydown, textArea.root, {
                                useSpacesInsteadOfTabs: true,
                                tabStopSize: 4,
                            });
                        }
                        if (input) {
                            exampleSectionStateSetText(s, textArea.root.value);
                        }
                    } imEnd();
                } imEnd();
            } imEnd();
        } imEnd();
    } imEnd();
}
