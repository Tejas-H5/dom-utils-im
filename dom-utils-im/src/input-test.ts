import {
    getImKeys as getKeyboardEvents,
    imDiv,
    imList,
    imEnd,
    imEndList,
    imInit,
    setStyle,
    getImMouse,
    imTextSpan,
    setAttr,
    nextListSlot,
    initializeImDomUtils
} from "./utils/im-dom-utils";

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

    imList();
    for (const key of currentKeys) {
        nextListSlot();
        imTextSpan(key + ", ")
    }
    imEndList();

    imDiv(); {
        const SIZE = 50;
        if (imInit()) {
            setAttr("style", `position: absolute; width: ${SIZE}px; height: ${SIZE}px; background-color: #000`);
        }

        const mouse = getImMouse();
        setStyle("left", -SIZE / 2 + mouse.X + "px");
        setStyle("top", -SIZE / 2 + mouse.Y + "px");
    } imEnd();
}

initializeImDomUtils(render);
