import {
    imBeginDiv, 
    imBeginEl, 
    imState, 
    imBeginList, 
    nextListRoot, 
    newUiRoot,
    imInit,
    imEnd,
    setInnerText,
    setAttributes,
    setAttr,
    setStyle,
    imEndList,
    elementHasMouseClick,
    elementHasMouseHover,
    getMouse,
    deltaTimeSeconds,
    imRef,
    abortListAndRewindUiStack,
    initializeDomRootAnimiationLoop,
    getCurrentRoot,
    imBeginMemo,
    imEndMemo,
} from "src/utils/im-dom-utils";


function newInput() {
    return document.createElement("input");
}

function newButton() {
    return document.createElement("button");
}

function newLabel() {
    return document.createElement("label");
}

function Button(buttonText: string, onClick: () => void) {
    let button;

    imBeginDiv(); {
        button = imBeginEl(newButton); {
            setInnerText(buttonText);

            if (elementHasMouseClick()) {
                onClick();
            }
        };
        imEnd();
    }
    imEnd();

    return button;
}

function Slider(labelText: string, onChange: (val: number) => void) {
    const root = imBeginDiv(); {
        imBeginEl(newLabel); {
            setAttr("for", labelText);
            setInnerText(labelText);
        };
        imEnd();
        const input = imBeginEl<HTMLInputElement>(newInput); {
            imInit() && setAttributes({
                type: "range",
                min: "1", max: "300", step: "1",
            });

            setAttr("name", labelText)

            if (elementHasMouseHover()) {
                const mouse = getMouse();
                if (mouse.leftMouseButton) {
                    onChange(input.root.valueAsNumber);
                }
            }
        }
        imEnd();
    }
    imEnd();
    return root;
}

function newWallClockState() {
    return { val: 0 };
}

function WallClock() {
    const dt = deltaTimeSeconds();
    const value = imState(newWallClockState);

    value.val += (-0.5 + Math.random()) * 0.02;
    if (value.val > 1) value.val = 1;
    if (value.val < -1) value.val = -1;

    imBeginDiv(); {
        imBeginDiv(); {
            const r = getCurrentRoot();
            setInnerText("Removed: " + r.removed);
        } imEnd();
    } imEnd();
    imBeginDiv(); {
        setInnerText("brownian motion: " + value.val + "");
    } imEnd();
    imBeginDiv(); {
        setInnerText("FPS: " + (1 / dt).toPrecision(2) + "");
    } imEnd();
    imBeginList();
    let n = value.val < 0 ? 1 : 2;
    for (let i = 0; i < n; i++) {
        nextListRoot(); 

        imBeginDiv();  {
            setInnerText(new Date().toISOString());
        } imEnd();
    }
    imEndList();
}

function resize(values: number[][], gridRows: number, gridCols: number) {
    while (values.length < gridRows) {
        values.push([]);
    }
    while (values.length > gridRows) {
        values.pop();
    }

    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        while (row.length < gridCols) {
            row.push(1);
        }
        while (row.length > gridCols) {
            row.pop();
        }
    }
}

function newAppState() {
    const s = {
        rerender: () => { },

        period: 2,
        setPeriod(val: number) {
            s.period = val;
            s.rerender();
        },
        incrementValue: 1,
        setIncrement(val: number) {
            s.incrementValue = val;
            s.rerender();
        },
        count: 1,
        incrementCount() {
            s.count += s.incrementValue;
            s.rerender();
        },
        decrementCount() {
            s.count -= s.incrementValue;
            s.rerender();
        },
        grid: true,
        toggleGrid() {
            s.grid = !s.grid;
            s.rerender();
        }
    }

    return s;
}

function newGridState() {
    let gridRows = 100;
    let gridCols = 400;
    const values: number[][] = [];

    resize(values, gridRows, gridCols);

    return { gridRows, gridCols, values };
}

function App() {
    const errRef = imRef<any>();

    const s = imState(newAppState);

    const l = imBeginList();
    try {
        if (nextListRoot() && !errRef.val) {
            imBeginDiv(); {
                Button("Click me!", () => {
                    alert("noo");
                });
                imBeginDiv(); {
                    setInnerText("Hello world! ");
                }
                imEnd();
                imBeginDiv(); {
                    setInnerText("Lets goo");
                }
                imEnd();
                imBeginDiv(); {
                    setInnerText("Count: " + s.count);
                }
                imEnd();
                imBeginDiv(); {
                    setInnerText("Period: " + s.period);
                }
                imEnd();

                // sheesh. cant win with these people...
                imBeginList();
                if (nextListRoot() && s.count > 1000) {
                    imBeginDiv(); {
                        setInnerText("The count is too damn high!!");
                    } imEnd();
                } else if (nextListRoot() && s.count < 1000) {
                    imBeginDiv(); {
                        setInnerText("The count is too damn low !!");
                    } imEnd();
                } else {
                    nextListRoot();
                    imBeginDiv(); {
                        setInnerText("The count is too perfect!!");
                    } imEnd();
                }
                imEndList();

                // again, with the list
                imBeginList();
                if (s.count > 1000) {
                    nextListRoot(1); 

                    imBeginDiv(); {
                        setInnerText("The count is too damn high!!");
                    } imEnd();
                } else if (s.count === 1001) {
                    nextListRoot(2); 

                    imBeginDiv(); {
                        setInnerText("Noo how");
                    } imEnd();
                } else if (s.count < 1000) {
                    nextListRoot(3); 

                    imBeginDiv(); {
                        setInnerText("The count is too damn low !!");
                    } imEnd();
                } else {
                    nextListRoot(4); 

                    imBeginDiv(); {
                        setInnerText("The count is too perfect!!");
                    } imEnd();
                }
                imEndList();


                imBeginDiv(); {
                    imInit() && setAttributes({
                        style: "height: 5px; background-color: black"
                    });
                }
                imEnd();


                imBeginDiv(); {
                    imInit() && setAttributes({
                        style: "padding: 10px; border: 1px solid black; display: inline-block",
                    });

                    if (s.count < 500) {
                        throw new Error("The count was way too low my dude");
                    }

                    imBeginList();
                    if (nextListRoot() && s.count < 2000) {
                        WallClock();
                    }
                    imEndList();
                }
                imEnd();

            }
            imEnd();

            const gridState = imState(newGridState);
            imBeginList();
            if (nextListRoot() && s.grid) {
                const dt = deltaTimeSeconds();
                const { values } = gridState;

                imBeginList();
                for (let i = 0; i < values.length; i++) {
                    nextListRoot();

                    imBeginDiv(); {
                        imInit() && setAttributes({
                            style: "display: flex;"
                        });

                        imBeginList();
                        for (let j = 0; j < values[i].length; j++) {
                            nextListRoot(); 
                            imBeginDiv(); {
                                if (imInit()) {
                                    setAttributes({
                                        style: "display: inline-block; width: 5px; height: 5px"
                                    });
                                }

                                if (elementHasMouseHover()) {
                                    const mouse = getMouse();
                                    if (mouse.leftMouseButton) {
                                        values[i][j] = 1;
                                    }
                                }

                                // NOTE: usually you would do this with a CSS transition if you cared about performance, but
                                // I'm just trying out some random stuff.
                                let val = values[i][j];
                                if (val > 0) {
                                    val -= dt;
                                    if (val < 0) {
                                        val = 0;
                                    }
                                    values[i][j] = val;
                                }

                                const valRounded = Math.round(val * 255) / 255;
                                if (imBeginMemo().val(valRounded).changed()) {
                                    setStyle("backgroundColor", `rgba(0, 0, 0, ${val})`);
                                } imEndMemo();
                            } imEnd();
                        }
                        imEndList();
                    } imEnd();
                }
                imEndList();
            } 
            imEndList();

            imBeginDiv(); {
                imInit() && setAttributes({
                    style: `position: fixed; bottom: 10px; left: 10px`
                });

                Slider("period", s.setPeriod);
                Slider("increment", s.setIncrement);
                Button("Toggle grid", s.toggleGrid);
                Button("Increment count", s.incrementCount);
                Button("Decrement count", s.decrementCount);
            }
            imEnd();
        } else {
            nextListRoot();

            imBeginDiv(); {
                imInit() && setAttributes({
                    style: `display: absolute;top:0;bottom:0;left:0;right:0;`
                });

                imBeginDiv(); {
                    imInit() && setAttributes({
                        style: `display: flex; flex-direction: column; align-items: center; justify-content: center;`
                    });

                    imBeginDiv(); {
                        setInnerText("An error occured: " + errRef.val);
                    }
                    imEnd();
                    imBeginDiv(); {
                        setInnerText("Click below to retry.")
                    }
                    imEnd();

                    Button("Retry", () => {
                        s.count = 1000;
                        errRef.val = null;
                    });
                } imEnd();
            } imEnd();
        }
    } catch(err) {
        abortListAndRewindUiStack(l);
        console.error(err);
        errRef.val = err;
    }
    imEndList();
}

const appRoot = newUiRoot(() => document.body);

function rerenderApp() {
    App();
}

initializeDomRootAnimiationLoop(rerenderApp, appRoot);
