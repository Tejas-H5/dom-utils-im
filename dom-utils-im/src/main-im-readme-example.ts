import { div, text, imOn, el, end, imRerenderable, imState, imIf, startRendering } from "src/utils/im-dom-utils";

function newButton() {
    return document.createElement("button");
}

function appState() {
    return { count: 0 };
}

function App() {
    imRerenderable((rerender) => {
        const state = imState(appState);

        div(); {
            text("Count: " + state.count);
        } end();

        div(); {
            el(newButton); {
                text("Increment");
                imOn("click", () => {
                    state.count++;
                    rerender();
                });
            } end();
        } end();

        imIf(state.count > 10, () => {
            div(); {
                text("Count is super high?!? aint no way bruh? ");
            } end();
        });
    });
}

function rerenderApp() { 
    startRendering();
    App();
}

// Kick-start the program by rendering it once.
rerenderApp();
