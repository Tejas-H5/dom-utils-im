# Typescript 'Immediate-Mode' UI framwork

This is my attempt at creating a simple frontend framework with these points:
- Fast performance characteristics, i.e no V-DOM and diffing
- Generates as little garbage as possible 
- Simple to use and understand
    - may have failed here a little - hopefully my explanation below will suffice
- Has an actual callstack that I can use to debug things
- Flexible enough to write things quickly
- Ability to colocate all normal code with rendering code as needed

The code for an app will look something like this right now:

```ts

import { UIRoot, div, text, on, el } from "dom-utils-im";

function newButton() {
    document.createElement("button");
}

function appState() {
    return { count: 0 };
}

function App(r: UIRoot) {
    imRerenderable(r, (r, rerender) => {
        const state = getState(r);

        div(r, r => {
            text(r, "Count: " + count);
        });

        div(r, r => {
            el(r, newButton, r => {
                text(r, "Increment");
                on(r, "click", () => {
                    state.count++;
                    rerender();
                });
            });
            text(r, "" + count);
        });

        If(condition, r, r => {
            div(r, r => {
                text(r, "Conditional logicksaldksdj");
            });
        });
    });
}

const appRoot = newUiRoot(() => document.body);
function rerenderApp() { 
    App(appRoot);
}

// Kick-start the program by rendering it once.
rerenderApp();

```

## How it works

This 'framework' is built around immediate mode state. An array of im-state entries are initialized in the first
render, and then reused insubsequent renders. Im-state consists of the following three things(1):

- Regular state is the primitive used to implement most of the other functinality
- The dom elements are what are actually being inserted into the DOM
- `ListRender` can be used to generate an arbitrary number of `UIRoot`s

(Due to the fact that we need to traverse the 'component tree' to unmount DOM nodes, we need to be able to distinguish between 
'regular state' and the other stuff, so I haven't actually been able to 100% unify them).

Each component takes in a `UIRoot` as an argument (and more arguments as necessary), and then renders the same number
of im-state entries in the same order every single time:

```ts

function newBasicComponentState() {
    return { renderCount: 0 };
}

function BasicComponent(r: UIRoot) {
    const state = imState(r, newBasicComponentState);
    state.renderCount++;

    // starts rendering a div onto `uiRoot`, creates a new UIRoot with that new div, and then 
    // calls another function. This is similar to a lambda query building pattern you may have seen in other APIs
    div(r, r => {
        text(r, "Renders: " + state.renderCount);
    });
    // We can't use a normal `if` statement here, since that will change the number of components being rendered each time.
    // I've created `If`, `ElseIf` ande `Else` components that can be used instead.
    If(condition, r, r => {
        text(r, "Component 2");
    });

    // This function will also render the same number of things to `r` every time, so this is also doable
    SomeOtherComponent(r);
}
```

This means that on the first render, I can append all the entries to an im-state array, and on every render after, 
I can just reset and increment an index `i`, and then when you call `div()`, Ill just give you the `i`th immediate mode state entry.

(This probably sounds very similar to 'hooks' from React - and it probably is, except I've extended DOM elements themselves
to be a part of im-state as well)

We've seen how we persist state between renders, but there are two more useful things that components need to be able to do:
- Render an arbitrary number of thigns in an arbitrary way
- Rerender itself to respond to changes in state

The `list` component allows us to render an arbitrary number of components:

```ts

function App(r: UIRoot) {
    list(r, l => {
        for (let i = 0; i < 200; i++) {
            const r = l.getNext();
            RenderListItem(r):
        }
    });
}

```

The `l.getNext()` method can be used to return as many UIRoots as needed (TODO: keyed version). This works in a similar way to the im-state array,
in that it's size may vary. And once I implement the keyed version, the order may vary as well. But once you've rendered a component to a root, 
you cannot render other components to the same root (without incurring a lot of bugs). The main benefit of this API is that
you don't need to put your data into an array before you can render it. You can do things like this as well:

```ts

function App(r: UIRoot) {
    list(r, l => {
        for (let i = 0; i < n; i++) {
            const r = l.getNext();
            RenderListItem(r):
            // every odd and even component will render to the same root, so this is fine
            if (i < n - 1) {
                const r = l.getNext();
                div(r, r => text(r, ", "));
            }
        }
    });
}

```

We now need a way to rerender ourselves when we update state. This used to be extremely complicated 
to understand, and error-prone, but it is now a lot simpler. You'll just need to wrap the part of your
component tree you want to rerender in `imRerenderable`:

```ts

function newRenderableComponentState() {
    return { count: 0 };
}
function RerenderableComponent(r: UIRoot, arg1: A, arg2: B, ...etc) {
    imRerenderable(r, (r, rerender) => {
        const state = imState(r, newRenderableComponentState);

        Button(r, r => {
            text(r, "Count: " + state.count);
            on(r, "mousedown", () => {
                state.count++;
                rerender();
            });
        });
    });
}
```

A lot of things that I struggled to conceptualize or implement in my old framework (Source also included, next to `im-dom-utils.ts`, you'll find a regular
`dom-utils.ts` with a lot of overlapping functionality, but totally different DOM 'rendering' code) just fell out for free when I created this framework.
E.g in the old framework, you couldn't conditionally render DOM nodes. The way I achieved this effect was by disabling a node with `display: none !important` css.
This meant that realtime animations 1 level under a component we've hidden were actually never cancelled, because it checks `isConnected` and `isHidden`, but
not the computed css (I figured it would be too expensive to check this each time) to determine if the component is hidden. 
