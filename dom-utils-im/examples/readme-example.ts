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
    imFor,
    imEndFor,
    nextListRoot,
    imTextSpan,
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
    lastId: number;
    todoListItems: {
        id: string;
        text: string;
    }[];
} {
    return { 
        lastId: 100,
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
                s.todoListItems.push({
                    id: (s.lastId++).toString(),
                    text: "TODO: add a text input here"
                });
            }
        } imEnd();
    } imEnd();
    imDiv(); {
        imFor(); for (const item of s.todoListItems) {
            // Don't actually need to use item.id as the key here. 
            // re-ordering DOM nodes can be more expensive than just setting new text.
            nextListRoot(item.id); 
            imDiv(); {
                imTextSpan(item.text);
            } imEnd();
        } imEndFor();
    } imEnd();
}


initializeImDomUtils(App);
