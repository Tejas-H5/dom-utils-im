import {
    imEnd,
    imTextSpan,
    initializeImDomUtils
} from "src/utils/im-dom-utils";
import { initCnStyles } from "../src/utils/cn";
import { COL, imInitStyles, imLayout } from "./design";

function rerenderApp() {
    imLayout(); {
        imInitStyles(`font-family: Arial;`);
        imLayout(COL); {
            imInitStyles(`align-items: center`);
            imLayout(); {
                imInitStyles(`max-width: 900px;`);
                imLayout(); {
                    imInitStyles(`font-weight: bold; font-size: 2rem; text-align: center;`);
                    imTextSpan("Immediate-mode DOM");
                } imEnd();
                // TODO: work on the writing skills. lmao. 
                imLayout(); imTextSpan(`
There are a lot of things that I don't like about mainstream JavaScript frameworks.
                `); imEnd();
                imLayout(); imTextSpan(`
- These frameworks encourage you to rely other libraries to do basic things, like state management.
Your state cannot simply be some global or context-based plain-javascript object,
because the framework just has no way of reacting to any of those state changes.
I am all for external dependencies, but I believe that dependencies should completely 
solve a specific subset of a problem, such that it is not required to add more dependencies
to make the first dependency useable.
                `); imEnd();
                imLayout(); imTextSpan(`
- It is a common occurance when debugging, to have no idea which component we are inside,
which event or invocation kicked off a particular render, or which part of a component was contributing the most to a particular render.
                `); imEnd();
                imLayout(); imTextSpan(`
- The basic building blocks of reuse, 'components', do not compose properly.
For example, in React, in order to use hooks conditionally, or in a list rendering context,
an entirely new component MUST be made. This is contrary to normal code, where the programmer can decide
to extract some code inside an if-statement or for-loop to a new function, should it actually make sense to do so.
Ideally, inlining the code, and making a separate 'component' should behave identically.
                `); imEnd();
                imLayout(); imTextSpan(`
- Rendering thousands or tens of thousands of DOM nodes is also frowned upon, even though it can be done relatively straightforwardly with
more vanilla solutions like JQuery or even the regular HTML DOM API.
                `); imEnd();
                imLayout(); imTextSpan(`
im-dom-utils is an alternative way of writing SPAs that leverage the performance and simplicity of plan old JavaScript.
By avoiding lambda-based APIs like the plague, the 'framework' achieves a large degree of simplicity,
debuggability, ease-of-use and code-reuse that I have found lacking in other frameworks that I 
have spent a large amount of my time using.
                `); imEnd();
                imLayout(); imTextSpan(`
A lot of problems that used to be quite difficult, like user interaction, animation, error boundaries, testing, 
rendering the source code of a particular component, and passing around components as values, end up being extremely simple.
This is achieved by simply using existing mechanisms inside of JavaScript and keeping the abstraction layer somewhat minimal.
                `); imEnd();
            } imEnd();
        } imEnd();
    } imEnd();
}

initCnStyles();
initializeImDomUtils(rerenderApp);
