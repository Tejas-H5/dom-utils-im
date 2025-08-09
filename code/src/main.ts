import { initCssbStyles } from "src/utils/cssb";
import {
    imBeginRoot,
    imEnd,
    imInit,
    initImDomUtils,
} from "src/utils/im-utils-core";
import { setAttr } from "src/utils/im-utils-dom";
import {
    COL,
    imBeginLayout,
    imHeading,
    imInitStyles,
    newA,
    newLi,
    newUl,
    RELATIVE,
    ROW
} from "./design";
import { newCssBuilder } from "./utils/cssb";
import { imExampleSection } from "./examples-section";

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
                imInitStyles(`width: 100%; overflow-y: auto`);

                imHeading("Examples");

                imExampleSection();
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

initCssbStyles();
initImDomUtils(rerenderApp);
