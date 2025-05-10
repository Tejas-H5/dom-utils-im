import { getKeyEvents as getKeyboardEvents, imBeginDiv, imBeginList, imEnd, imEndList, imInit, initializeDomRootAnimiationLoop, setInnerText, setStyle, imBeginSpan, getMouse, imTextSpan, setAttr, nextListRoot } from "./utils/im-dom-utils";

const currentKeys = new Set<string>();

function render() {
    if (imInit()) {
        setAttr("style", "font-size: 24px");
    }

    const { keyDown, keyUp, blur } = getKeyboardEvents();
    if (keyDown) {
        currentKeys.add(keyDown.key);
    }
    if (keyUp) {
        currentKeys.delete(keyUp.key);
    }
    if (blur) {
        currentKeys.clear();
    }

    imBeginList();
    for (const key of currentKeys) {
        nextListRoot();
        imTextSpan(key + ", ")
    }
    imEndList();

    imBeginDiv(); {
        const SIZE = 50;
        if (imInit()) {
            setAttr("style", `position: absolute; width: ${SIZE}px; height: ${SIZE}px; background-color: #000`);
        }

        const mouse = getMouse();
        setStyle("left", -SIZE / 2 + mouse.X + "px");
        setStyle("top", -SIZE / 2 + mouse.Y + "px");
    } imEnd();
}

initializeDomRootAnimiationLoop(render);
