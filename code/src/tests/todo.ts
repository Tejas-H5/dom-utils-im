// TODO: make these into tests

// visibility tests
{



    // test 1

    let pos = 0;
    let lastPos = 0;
    function imMain() {
        const ctx = imState(newGlobalContext);
        handleImKeysInput(ctx);

        if (ctx.keyboard.spaceKey.pressed) {
            pos = (pos + 1) % 2;
        }

        imBegin(COL); imFixed(0, 0, 0, 0); {
            if (pos !== lastPos) {
                console.log("nahh");
                lastPos = pos;
            }

            imSwitch(pos); switch (pos) {
                case 1: {
                    if (imNowInCodepath()) {
                        console.log("xd");
                    }

                    if (imNowInCodepath()) {
                        console.log("A 1");
                    }
                    imBegin(); {
                        if (imNowInCodepath()) {
                            console.log("B 1");
                        }
                        if (imIf() && true) {
                            if (imNowInCodepath()) {
                                console.log("C 1");
                            }
                            imBegin(); {
                                if (imNowInCodepath()) {
                                    console.log("D 1");
                                }

                                setText("henlo " + getCurrentRoot().itemRemoveLevel);
                            } imEnd();
                        } imEndIf();
                    } imEnd();
                } break;
                case 0: {
                    if (imNowInCodepath()) {
                        console.log("A 2");
                    }
                    imBegin(); {
                        if (imNowInCodepath()) {
                            console.log("B 2");
                        }
                        if (imIf() && true) {
                            if (imNowInCodepath()) {
                                console.log("C 2");
                            }
                            imBegin(); {
                                if (imNowInCodepath()) {
                                    console.log("D 2");
                                }

                                setText("henlo 2");
                                setText("henlo 2" + getCurrentRoot().itemRemoveLevel);
                            } imEnd();
                        } imEndIf();
                    } imEnd();
                } break;
            } imEndSwitch();
        } imEnd();

        return;
    }




}


{

let val1 = false;
let val2 = false;
function imMain() {
    const { keyDown } = getImKeys();
    if (keyDown?.key === "1") {
        val1 = !val1;
    }
    if (keyDown?.key === "2") {
        val2 = !val2;
    }

    imBegin(); {
        if(imIf() && val1) {
            imBegin(); {
                if(imIf() && val2) {
                    imStr("ax")
                } else {
                    imElse();
                    imStr("xb")
                } imEndIf();
            } imEnd();
        } else {
            imElse();
            imBegin(); {
                if(imIf() && val2) {
                    imStr("xxcx")
                } else {
                    imElse();
                    imStr("xxxd")
                } imEndIf();
            } imEnd();
        } imEndIf();
    } imEnd();
}
}
