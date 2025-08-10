import { initCssbStyles } from "src/utils/cssb";
import {
    imEnd,
    initImDomUtils,
    imBeginRoot,
    imFor,
    imEndFor,
    imNextListRoot,
} from "src/utils/im-utils-core";
import {
    imBeginDiv,
    elementHasMousePress,
    setText,
} from "src/utils/im-utils-dom";

function newButton() {
    return document.createElement("button");
}

function newH3() {
    return document.createElement("h3");
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
    const s = imGetStateFromFn(appState);

    imBeginRoot(newH3); setText("TODO list"); imEnd();

    imBeginDiv(); {
        imBeginRoot(newButton); {
            setText("Add");
            if (elementHasMousePress()) {
                s.todoListItems.push({
                    id: (s.lastId++).toString(),
                    text: "TODO: add a text input here"
                });
            }
        } imEnd();
    } imEnd();
    imBeginDiv(); {
        imFor(); for (const item of s.todoListItems) {
            imNextListRoot(item); 
            imBeginDiv(); setText(item.text); imEnd();
        } imEndFor();
    } imEnd();
}


initCssbStyles();
initImDomUtils(App);
