import {
    getImKeys as getKeyboardEvents,
    imBeginDiv,
    imEnd,
    imInit,
    setStyle,
    getImMouse,
    imTextSpan,
    setAttr,
    nextListRoot,
    initImDomUtils,
    imFor,
    imEndFor
} from "src/utils/im-utils-core";

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

    imFor(); for (const key of currentKeys) {
        nextListRoot();
        imTextSpan(key + ", ")
    } imEndFor();

    imBeginDiv(); {
        const SIZE = 50;
        if (imInit()) {
            setAttr("style", `position: absolute; width: ${SIZE}px; height: ${SIZE}px; background-color: #000`);
        }

        const mouse = getImMouse();
        setStyle("left", -SIZE / 2 + mouse.X + "px");
        setStyle("top", -SIZE / 2 + mouse.Y + "px");
    } imEnd();
}

initImDomUtils(render);
