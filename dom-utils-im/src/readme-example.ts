import { imBeginDiv, setInnerText, imBeginEl, imEnd, imState, imBeginList, nextListRoot, imEndList, elementHasMouseClick, initializeDomRootAnimiationLoop } from "src/utils/im-dom-utils";

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
        imBeginEl(newButton); {
            setInnerText("Increment");
            if (elementHasMouseClick()) {
                state.count++;
            }
        } imEnd();
    } imEnd();

    imBeginList();
    if (nextListRoot() && state.count > 10) {
        imBeginDiv(); {
            setInnerText("Count is super high?!? aint no way bruh? ");
        } imEnd();
    }
    imEndList();
}

function rerenderApp() { 
    App();
}

initializeDomRootAnimiationLoop(rerenderApp);
