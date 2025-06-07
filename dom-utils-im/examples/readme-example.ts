import {
    imDiv,
    setInnerText,
    imEnd,
    imState,
    elementHasMousePress,
    initializeImDomUtils,
    imIf,
    imEndIf,
    imBeginRoot,
} from "src/utils/im-dom-utils";

function newButton() {
    return document.createElement("button");
}

function newH3() {
    return document.createElement("h3");
}

function newInput() {
    return document.createElement("input");
}

function appState(): {
    todoListItems: {
        id: string;
        text: string;
    }[];
} {
    return { 
        todoListItems: [],
    };
}

function App() {
    const s = imState(appState);

    imBeginRoot(newH3); setInnerText("TODO list"); imEnd();

    imDiv(); {
        imBeginRoot(newButton); {
            setInnerText("Add");
            if (elementHasMousePress()) {
                s.count++;
            }
        } imEnd();
    } imEnd();

    if (imIf() && s.count > 10) {
        imDiv(); {
            setInnerText("Count is super high?!? aint no way bruh? ");
        } imEnd();
    } imEndIf();
}


initializeImDomUtils(App);
