import {
    imBeginRoot,
    imEnd,
    imEndFor,
    imFor,
    imInit,
    imMemo,
    imTextSpan,
    initializeImDomUtils,
    nextListRoot,
    setAttr
} from "src/utils/im-dom-utils";
import { initCnStyles } from "../src/utils/cn";
import { COL, imInitStyles, imBeginLayout, RELATIVE } from "./design";

function newUl() {
    return document.createElement("ul");
}

function newLi() {
    return document.createElement("li");
}

function newIFrame() {
    return document.createElement("iframe");
}

function newA() {
    return document.createElement("a");
}

function rerenderApp() {
    imBeginLayout(); {
        imInitStyles(`font-family: Arial;`);
        imBeginLayout(COL | RELATIVE); {
            imInitStyles(`align-items: center`);
            imBeginLayout(); {
                imInitStyles(`max-width: 900px;`);
                imBeginLayout(); {
                    imInitStyles(`font-weight: bold; font-size: 2rem; text-align: center;`);
                    imTextSpan("Immediate-mode DOM");
                } imEnd();
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
                    `); imEnd();
                    imBeginRoot(newLi); imTextSpan(`
The basic building blocks of reuse that they offer do not compose in an ideal manner.
For example, in React, in order to use hooks conditionally or within a list, 
an entirely new component MUST be made so that the hooks have somewhere to go. 

This is contrary to normal code, where the programmer can decide
to extract some code inside an if-statement or for-loop to a new function, should it actually make sense to do so.
It also leads to large monolithic components with a large amount of logic at the top, and a large amount of markdown 
at the bottom. 
Ideally, I should be able to put these 'hooks' as close to where they are used, so that it is easier to find
and extract patterns in the code into their own things.
                    `); imEnd();
                    imBeginRoot(newLi); imTextSpan(`
Rendering thousands or tens of thousands of DOM nodes is frowned upon, even though it can be done relatively straightforwardly with
more vanilla solutions like JQuery or even the regular HTML DOM API.
                    `); imEnd();

                } imEnd();
                imBeginLayout(); imTextSpan(`
im-dom-utils is an alternative way of writing SPAs that leverage the performance and simplicity of plan old JavaScript functions.
I had initially made it to see if I could create a UI framework that completely avoids lambda-based control flow, because of how 
frustrating they are to step through in the debugger. In doing so, I had accidentally solved all of the problems above in a simple way, 
and created something that I actually enjoy writing things in.
                `); imEnd();
                imBeginLayout(); imTextSpan(`
The main way to create abstractions here is by creating a pair of imBeginX() and imEndX() methods instead of 
a single method like imX(callback: () => void);. This completely removes the need for lambdas for the most part,
guarantees that everything renders from the top down synchronously, and allows for a large degree of code-reuse.
                `); imEnd();
                imBeginLayout(); imTextSpan(`
The main tradeoff here is that it is a little too simple - the entire DOM is rerendered in a requestAnimationFrame loop at the same
framerate as the monitor. This means that rendering code is forced to be fast, and most state that
could otherwise just be computed every render in a framework like React needs to be memoized.
Technically, I don't actually _need_ to rerender the framework in an animation loop. An alternate way of structuring
code is to manually rerender the code in response to every single user event that may update the state in any way,
but I have found that just rerendering everything in requestAnimationFrame results in simpler code, and
is performant enough for most usecases.
                `); imEnd();
                imBeginLayout(); imTextSpan(`
Additionally, while the code has a tree-like structure, it no longer resembles HTML. 
In fact - this 'framework' has very little knowledge of HTML elements, so you'll need to 
spend some time upfront creating helper methods that make DOM nodes, and setting up your own styling solution.
                `); imEnd();
            } imEnd();

            imBeginLayout(); {
                imInitStyles(`width: 100%;`);

                imBeginLayout(); {
                    imInitStyles(`font-weight: bold; font-size: 1.5rem; text-align: center;`);
                    imTextSpan("Examples");
                } imEnd();

                imBeginLayout(); {
                    imInitStyles(`display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px;`);

                    imFor(); for (const example of examples) {
                        nextListRoot(); 

                        imBeginLayout(); {
                            imInitStyles(`display: grid;`);

                            imBeginRoot(newA); {
                                imInitStyles(`text-weight: bold; padding: 10px; font-size: 1rem`);

                                if (imMemo(example)) {
                                    setAttr("href", example.link);
                                }

                                imTextSpan(example.name);
                            } imEnd();

                            imBeginRoot(newIFrame); {
                                imInitStyles(`width: 100%; aspect-ratio: 16 / 9`);

                                if (imMemo(example)) {
                                    setAttr("src", example.link);
                                    setAttr("title", example.name);
                                }
                                imTextSpan(example.link);
                            } imEnd();
                        } imEnd(); 
                    } imEndFor();
                } imEnd();
            } imEnd();
        } imEnd();
    } imEnd();
}


const examples: {
    name: string;
    link: string;
}[] = [
    {
        name: "README example",
        link: "/examples/readme-example.html"
    },
    {
        name: "Input test",
        link: "/examples/input-test.html"
    },
    {
        name: "Random stuff",
        link: "/examples/random-stuff.html"
    },
];

initCnStyles();
initializeImDomUtils(rerenderApp);
