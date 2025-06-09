import { initCssbStyles } from "src/utils/cssb";
import { COL, imInitStyles, imBeginLayout, RELATIVE, ROW } from "./design";
import { imBeginEditableTextArea } from "./components/text-area";

import * as domUtils from "src/utils/im-dom-utils";
import { cn, newCssBuilder } from "./utils/cssb";
const {
    imStateInline,
    setClass,
    imSwitch,
    imEndSwitch,
    imBeginRoot,
    imCatch,
    imEnd,
    imEndFor,
    imEndIf,
    imEndTry,
    imFor,
    imIf,
    imElseIf,
    imInit,
    imMemo,
    imOn,
    imRef,
    imState,
    imTextSpan,
    imTry,
    nextListRoot,
    setAttr,
    initImDomUtils,
} = domUtils;

const newUl     = () => document.createElement("ul");
const newLi     = () => document.createElement("li");
const newH3     = () => document.createElement("h3");
const newIFrame = () => document.createElement("iframe");
const newA      = () => document.createElement("a");

function newEditorState(): {
    text: string;
    code: () => void;
    examples: Example[]
    exampleIdx: number;
} {
    return {
        text: "",
        code: () => {},
        examples: [],
        exampleIdx: 0,
    };
}

function imHeading(text: string) {
    imBeginRoot(newH3); {
        imInitStyles(`font-weight: bold; font-size: 2rem; text-align: center;`);
        imTextSpan(text);
    } imEnd();
}

type ViewableError = { error: string; stack: string; };

function toViewableError(e: any): ViewableError {
    let val: ViewableError = {
        error: "" + e,
        stack: "",
    };

    if (e instanceof Error && e.stack) {
        val.stack = e.stack
            .split("\n")
            .filter(line => !line.includes("FrameRequestCallback"))
            .join("\n");
    }

    return val;
}

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

const cssb = newCssBuilder();

cssb.s(`
body {
    padding: 0;
}
`);

function rerenderApp() {
    imBeginLayout(); {
        imInitStyles(`font-family: Arial;`);
        imBeginLayout(COL | RELATIVE); {
            imInitStyles(`align-items: center`);

            imHeading("Immediate-mode DOM");

            imBeginLayout(); {
                imTextSpan(`im-dom-utils is an alternative way of writing SPAs that leverage the performance and simplicity of plan old JavaScript functions.`);
            } imEnd();

            imBeginLayout(ROW); {
                imBeginLayout(); {
                    imInitStyles(`flex: 1`);
                    imHeading("When to use");

                    imBeginRoot(newUl); {
                        imBeginRoot(newLi); imTextSpan( `
Highly interactive SPAs - i.e there are more 'holes' in your templates than static content
                        `); imEnd();
                        imBeginRoot(newLi); imTextSpan( `
When there are a lot of animations, novel UI and interactions that are hard to program with HTML/css/React/observables/signals/event driven programing
but trivial in native-style immediate-mode game loops
                        `); imEnd();
                        imBeginRoot(newLi); imTextSpan( `
When you want full ownership over your entire stack
                        `); imEnd();
                    } imEnd();
                } imEnd();

                imBeginLayout(); {
                    imInitStyles(`flex: 1`);
                    imHeading("When to avoid");
                    imBeginRoot(newUl); {
                        imBeginRoot(newLi); imTextSpan(`Static content`); imEnd();
                        imBeginRoot(newLi); {
                            imTextSpan(`Multipage websites that need to be indexed, and you don't have the knowledge to set up the dev environment manually`);
                            imBeginRoot(newUl); imBeginRoot(newLi); {
                                imTextSpan(`I had initially tried to make this page a multi-page site, and I was not having a fun time. I'll try again later.`);
                            } imEnd(); imEnd();
                        } imEnd();
                        imBeginRoot(newLi); {
                            imTextSpan(`You need to target older browsers that don't have `);
                            imBeginRoot(newA); {
                                if (imInit()) {
                                    setAttr("href", "https://caniuse.com/requestanimationframe");
                                }
                                imTextSpan("requestAnimationFrame");
                            } imEnd();
                        } imEnd();
                    } imEnd();
                } imEnd();
            } imEnd();

            imBeginLayout(); {
                imInitStyles(`width: 100%;`);

                const s = imState(newEditorState);
                if (imInit()) {
                    s.examples.push(...originalExamples);
                }

                const currentExample = s.examples[s.exampleIdx];
                const currentExampleChanged = imMemo(currentExample);
                if (currentExampleChanged) {
                    s.text = currentExample.code.trim();
                }

                imHeading("Examples");

                // Tabs
                imBeginLayout(ROW); {
                    imInitStyles(`gap: 5px`);

                    imBeginLayout(); {
                        imInitStyles(`flex: 1`);
                        imFor(); for (const example of s.examples) {
                            nextListRoot();
                            imBeginLayout(); {
                                imInitStyles(`
display: inline-block; font-weight: bold; padding: 3px 5px; padding-right: 20px;
border: 1px solid black; border-bottom: none; border-radius: 4px 4px 0px 0px;
`);
                                imTextSpan(example.name);
                            } imEnd();
                        } imEndFor();
                    } imEnd();
                } imEnd();

                // Content
                imBeginLayout(); {
                    imInitStyles(`padding: 10px; border: 1px solid black;`);

                    imBeginLayout(ROW); {
                        imInitStyles(`gap: 5px`);
                        imInitStyles(`aspect-ratio: 16 / 6`);

                        imBeginLayout(); {
                            imInitStyles(`flex: 1`);
                            imInitStyles(`border: 1px solid black`);

                            const renderState = imStateInline(() => {
                                return {
                                    error: null as ViewableError | null,
                                };
                            });

                            if (imMemo(s.text)) {
                                try {
                                    s.code = recomputeCustomRenderFn(s.text);
                                    renderState.error = null;
                                } catch (e) {
                                    s.code = () => { };
                                    renderState.error = toViewableError(e);
                                }
                            }

                            const l = imTry(); try {
                                const err = renderState.error;
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
                                            // If using React, might need to run this inside framer-motion.
                                            domUtils.rerenderImContext(customCtx, currentCtx.lastTime, false);
                                        } catch(e) {
                                            customCtx.isRendering = false;
                                            throw e;
                                        } finally {
                                            domUtils.setImContext(currentCtx);
                                        }
                                    } imEnd();
                                } else if (imElseIf() && err) {
                                    imBeginLayout(); {
                                        imTextSpan("An error occured: " + err.error);
                                        imBeginLayout(); {
                                            imInitStyles(`white-space: pre`);
                                            imTextSpan("" + err.stack);
                                        } imEnd();
                                    } imEnd();
                                } imEndIf();
                            } catch (e) {
                                imCatch(l);
                                renderState.error = toViewableError(e);
                            } imEndTry();
                        } imEnd();

                        imBeginLayout(COL); {
                            imInitStyles(`flex: 1`);
                            imInitStyles(`border: 1px solid black`);
                            setClass(cn.overflowYAuto);

                            imBeginLayout(COL); {
                                if (imInitStyles(`
                                flex: 1; background-colour: #888; font-family: monospace; font-size: 1rem;
                                padding: 5px;
                            `)) {
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
                                        s.text = textAreaRef.val!.value;
                                    }
                                } imEnd();
                            } imEnd();
                        } imEnd();
                    } imEnd();
                } imEnd();
            } imEnd();


            imHeading("Why");

            imBeginLayout(); {
                imInitStyles(`max-width: 900px;`);
                // TODO: work on the writing skills. lmao. 

                imBeginLayout(); imTextSpan(`
There are a couple of things that I don't like about mainstream JavaScript frameworks:
                `); imEnd();
                imBeginRoot(newUl); {
                    imBeginRoot(newLi); imTextSpan(`
They make debugging and profiling far more difficult than it needs to be. 
It is a common occurance when debugging, to have no idea which component a component is rendering inside of,
or which function call kicked off a particular render event.
                    `); imEnd();
                    imBeginRoot(newLi); imTextSpan(`
They require a reliance on other libraries to do basic things like state management, styling, animations and making API requests.
There is nothing wrong with dependencies, but if I want to do all this stuff myself, then I *should* be able to.
Mainstream state management methods introduce undesireable tradeoffs. const [state, setState] = useState() is strange, because state
will only apply on the next render. This makes code harder to debug than it needs to be, and introduces the possibility of infinite dependency 
loops, which sometimes do not get caught by React and will just happen in the background till someone notices.
Observables/signal based approaches appear to work nicely at the start, but create an implicit computation graph that can easily grow out of hand.
It is possible to end up in a scenario where toggling a boolean on an object results in the recomputation of several larger datastructures for example,
and the performance bottleneck is only noticed once a large amount of code has already been written, and it is too late to do anything about it.
                    `); imEnd();
                    imBeginRoot(newLi); imTextSpan(`
UI 'components' in these frameworks do not compose in an ideal manner.
For example, in React, in order to use hooks conditionally or within a list, an entirely new component MUST be made so that the hooks 
have somewhere to go. This is contrary to normal code, where the programmer can decide
to extract some code inside an if-statement or for-loop to a new function, should it actually make sense to do so.
It also leads to large monolithic components with a large amount of logic at the top, and a large amount of markdown 
at the bottom. Ideally, I should be able to put these 'hooks' as close to where they are used, so that it is easier to find
and extract patterns in the code into their own things.
                    `); imEnd();
                    imBeginRoot(newLi); imTextSpan(`
Rendering thousands or tens of thousands of DOM nodes is frowned upon, even though it can be done relatively straightforwardly with
more vanilla solutions like JQuery or even the regular HTML DOM API.
                    `); imEnd();
                } imEnd();
                imBeginLayout(); imTextSpan(`
I had initially worked on a different framework to solve the same problems which was far simpler.
Here are some example usages: https://github.com/Tejas-H5/Working-on-Tree, https://github.com/Tejas-H5/browser-ultra-history.
It mostly worked, but it had it's own problems. I could program basically anything in them, but there were a couple things that I could never implement nicely, or at all:
                `); imEnd();
                imBeginRoot(newUl); {
                    imBeginRoot(newLi); imTextSpan(`switch statement abstraction`); imEnd();
                    imBeginRoot(newLi); imTextSpan(`try/catch style error boundary abstraction. Or any error boundary abstraction for that matter`); imEnd();
                    imBeginRoot(newLi); imTextSpan(`Error boundary that responds to errors in events like mouse-clicks and key presses (not just rendering errors)`); imEnd();
                    imBeginRoot(newLi); imTextSpan(`React.Context alternative`); imEnd();
                    imBeginRoot(newLi); imTextSpan(`Conditional rendering that actually inserted/removed DOM nodes instead of setting "display": none`); imEnd();
                    imBeginRoot(newLi); imTextSpan(`Conditional rendering that was typesafe, and did type narrowing like TypeScript if-stamements`); imEnd();
                    imBeginRoot(newLi); imTextSpan(`A way to define state close to where it was actually being used, to make component extraction easier`); imEnd();
                } imEnd();
                imBeginLayout(); imTextSpan(`
I had initially started work on this new framework to see if I could create a UI framework that completely avoids lambda-based control flow, because of how 
frustrating they are to step through in the debugger. In doing so, I had accidentally solved all of the problems above in a simple way, 
and created something that I actually enjoy writing things in. 
                `); imEnd();
                imBeginLayout(); imTextSpan(`
                `); imEnd();

                imHeading("Tradeoffs");

                imBeginRoot(newUl); {
                    imBeginRoot(newLi); imTextSpan(`
Rather than the comfy lambda APIs we all now expect as JavaScript developers, 
the main way to create abstractions here is by creating a pair of imBeginX() and imEndX() methods instead of 
a single method like imX(callback: () => void);. While I would consider this epic and based, most people would find
this to be the worst part of this framework, I am guessing.
I like this pattern due to it's flexibility R.e code-reuse and ability to co-exist with other language constructs, 
but it can occasionally be VERY hard to debug if 
you forget an imEnd() somewhere, for example. There is probably a good linting-based solution to this,
but I will only work on it if at least 1 person other than myself decides to use this framework for 
their own project. For now, that is just a future side-project.
                    `); imEnd();
                } imEnd();

                imBeginRoot(newUl); {
                    imBeginRoot(newLi); imTextSpan(`
The entire DOM is rerendered in a requestAnimationFrame loop at the same framerate as the monitor. 
This means that rendering code is forced to be fast, and most state that could otherwise just be computed every render in a framework 
like React needs to be memoized. 
This is actually not a good thing in the short term, but I've found that it helps in the long term. 
The thing I like about React is that I can just slap a bunch of code together and it will just work and scale infinitely for most of the simple stuff. 

Technically, I don't actually _need_ to rerender the framework in an animation loop. An alternate way of structuring
code is to manually rerender the code in response to every single user event that may update the state in any way,
but I have found that just rerendering everything in requestAnimationFrame results in simpler code, and is performant enough for 99% of usecases.
                `); imEnd();
                imBeginRoot(newLi); imTextSpan(`
Additionally, while the code has a tree-like structure, it no longer resembles HTML. In fact - this 'framework' has very little 
knowledge of HTML elements, so you'll need to spend some time upfront creating helper methods that make DOM nodes, 
and setting up your own styling and layout solution.
                `); imEnd();
                imBeginRoot(newLi); imTextSpan(`
Ideally, we wouldn't have to write code like if (imIf() && <condition>) { } imEndIf();.
It is the only way I've found to get control-flow to work without using uuids for every div and element, 
and it allows us to take advantage of type-narrowing in TypeScript, which is very difficult to do with a lambda-based API. 
                    `); imEnd();
                } imEnd();
            } imEnd();
        } imEnd();
    } imEnd();
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
];

initCssbStyles();
initImDomUtils(rerenderApp);
