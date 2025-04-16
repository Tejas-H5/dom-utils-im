import { setAttributes, getKeys, imBeginDiv, imBeginList, imEnd, imEndList, imInit, initializeDomRootAnimiationLoop, KeyboardState, nextListRoot, setInnerText, setStyle, imBeginSpan, getMouse } from "./utils/im-dom-utils";

function render() {
    const keys = getKeys();

    imInit() && setAttributes({
        style: "font-size: 24px",
    });

    imBeginList();
    for (const k in keys) {
        nextListRoot();

        imBeginDiv(); {
            imBeginSpan(); {
                setInnerText(k);
            } imEnd();

            imBeginSpan(); {
                setInnerText(": ");
            } imEnd();

            imBeginList();
            const arr = keys[k as keyof KeyboardState];
            for (const key of arr) {
                nextListRoot();

                imBeginSpan(); {
                    setInnerText(key + ", ");
                } imEnd();
            }
            imEndList();
        } imEnd();
    }
    imEndList();

    imBeginDiv(); {
        const SIZE = 50;
        if (imInit()) {
            setAttributes({
                style: `position: absolute; width: ${SIZE}px; height: ${SIZE}px; background-color: #000`
            });
        }

        const mouse = getMouse();
        setStyle("left", -SIZE / 2 + mouse.X + "px");
        setStyle("top", -SIZE / 2 + mouse.Y + "px");
    } imEnd();
}

initializeDomRootAnimiationLoop(render);
