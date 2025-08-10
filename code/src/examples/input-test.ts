import { imStr } from "src/components/text";
import {
    imEnd,
    imInit,
    initImDomUtils,
    imFor,
    imEndFor,
    imNextListRoot
} from "src/utils/im-utils-core";
import {
    imBeginDiv,
    setStyle,
    getImMouse,
    setAttr,
    getImKeys,
} from "src/utils/im-utils-dom";

const currentKeys = new Set<string>();

function render() {
    if (imInit()) {
        setAttr("style", "font-size: 24px");
    }

    const { keyDown, keyUp, blur } = getImKeys();
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
        imNextListRoot();
        imStr(key + ", ");
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
