import {
    imDiv,
    setInnerText,
    imEl,
    imEnd,
    imState,
    elementHasMousePress,
    initializeImDomUtils,
    imIf,
    imEndIf,
} from "src/utils/im-dom-utils";

function newButton() {
    return document.createElement("button");
}

function appState() {
    return { count: 0 };
}

function App() {
    const state = imState(appState);

    imDiv(); {
        setInnerText("Count: " + state.count);
    } imEnd();

    imDiv(); {
        imEl(newButton); {
            setInnerText("Increment");
            if (elementHasMousePress()) {
                state.count++;
            }
        } imEnd();
    } imEnd();

    if (imIf() && state.count > 10) {
        imDiv(); {
            setInnerText("Count is super high?!? aint no way bruh? ");
        } imEnd();
    } imEndIf();
}


initializeImDomUtils(App);
