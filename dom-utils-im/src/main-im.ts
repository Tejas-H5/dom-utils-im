import {
    getCurrentNumAnimations,
    imOn,
    div, el, imState, imRerenderable, realtime, imErrorBoundary, imIf, imElse, imElseIf, newUiRoot,
    text,
    startRendering,
    init,
    end,
    setAttributes,
    attr,
    beginList,
    nextRoot,
    style,
    getCurrentRootInternal,
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

    div(); {
        button = el(newButton); {
            text(buttonText);
            imOn("click", onClick);
        };
        end();
    }
    end();

    return button;
}

function Slider(labelText: string, onChange: (val: number) => void) {
    const root = div(); {
        el(newLabel); {
            init() && setAttributes({
                for: labelText
            })

            attr("for", labelText);

            text(labelText);
        };
        end();

        const input = el<HTMLInputElement>(newInput); {
            init() && setAttributes({
                style: "width: 1000px",
                type: "range",
                min: "1", max: "300", step: "1",
            });

            attr("name", labelText)
            imOn("input", () => {
                onChange(input.root.valueAsNumber);
            });
        }
        end();
    }
    end();

    return root;
}

function newWallClockState() {
    return { val: 0 };
}

function WallClock() {
    realtime((dt) => {
        const value = imState(newWallClockState);

        value.val += (-0.5 + Math.random()) * 0.02;
        if (value.val > 1) value.val = 1;
        if (value.val < -1) value.val = -1;

        div(); {
            div(); {
                const r = getCurrentRootInternal();
                text("Removed: " + r.removed);
            }
            end();
        }
        end();
        div(); {
            text("brownian motion: " + value.val + "");
        }
        end();
        div(); {
            text("FPS: " + (1 / dt).toPrecision(2) + "");
        }
        end();
        beginList();
        let n = value.val < 0 ? 1 : 2;
        for (let i = 0; i < n; i++) {
            nextRoot(); {
                div();  {
                    text(new Date().toISOString());
                }
                end();
            }
            end();
        }
        end();
    });
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
    let gridCols = 100;
    const values: number[][] = [];

    resize(values, gridRows, gridCols);

    return { gridRows, gridCols, values };
}

function App() {
    imRerenderable((rerender) => {
        const s = imState(newAppState);
        s.rerender = rerender;

        imErrorBoundary(() => {
            div(); {
                Button("Click me!", () => {
                    alert("noo");
                });
                div(); {
                    text("Hello world! ");
                }
                end();
                div(); {
                    text("Lets goo");
                }
                end();
                div(); {
                    text("Count: " + s.count);
                }
                end();
                div(); {
                    text("Period: " + s.period);
                }
                end();
                realtime(() => {
                    div(); {
                        text("Realtime animations in progress: " + getCurrentNumAnimations())
                    }   
                    end();
                });

                // sheesh. cant win with these people...
                imIf(s.count > 1000, () => {
                    div(); {
                        text("The count is too damn high!!");
                    }
                    end();
                });
                imElseIf(s.count < 1000, () => {
                    div(); {
                        text("The count is too damn low !!");
                    }
                    end();
                });
                imElse(() => {
                    div(); {
                        text("The count is too perfect!!");
                    }
                    end();
                });

                div(); {
                    init() && setAttributes({
                        style: "height: 5px; background-color: black"
                    });
                }
                end();


                div(); {
                    init() && setAttributes({
                        style: "padding: 10px; border: 1px solid black; display: inline-block",
                    });

                    if (s.count < 500) {
                        throw new Error("The count was way too low my dude");
                    }

                    imIf(s.count < 2000, () => {
                        WallClock();
                    });
                }
                end();

            }
            end();

            imIf(s.grid, () => {
                const gridState = imState(newGridState);

                realtime((dt) => {
                    const { values } = gridState;

                    beginList();
                    for (let i = 0; i < values.length; i++) {
                        nextRoot(); {
                            div(); {
                                init() && setAttributes({
                                    style: "display: flex;"
                                });

                                beginList(); 
                                for (let j = 0; j < values[i].length; j++) {
                                    nextRoot(); {
                                        div(); {
                                            if (init()) {
                                                setAttributes({
                                                    style: "display: inline-block; width: 5px; height: 5px"
                                                });
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
                                                style("backgroundColor", `rgba(0, 0, 0, ${val})`);
                                            }

                                            imOn("mousemove", () => {
                                                values[i][j] = 1;
                                                // rerender();
                                            });
                                        }
                                        end();
                                    }
                                    end();
                                }
                                end();
                            }
                            end();
                        }
                        end();
                    }
                    end();
                });
            });

            div(); {
                init() && setAttributes({
                   style: `position: fixed; bottom: 10px; left: 10px`
                });

                Slider("period", s.setPeriod);
                Slider("increment", s.setIncrement);
                Button("Toggle grid", s.toggleGrid);
                Button("Increment count", s.incrementCount);
                Button("Refresh", rerender);
                Button("Decrement count", s.decrementCount);
            }
            end();

        }, (error, recover) => {
            console.error(error);

            div(); {
                init() && setAttributes({
                    style: `display: absolute;top:0;bottom:0;left:0;right:0;`
                });

                div(); {
                    init() && setAttributes({
                        style: `display: flex; flex-direction: column; align-items: center; justify-content: center;`
                    });

                    div(); {
                        text("An error occured");
                    }
                    end();
                    div(); {
                        text("Click below to retry.")
                    }
                    end();

                    Button("Retry", () => {
                        s.count = 1000;

                        recover();
                    });
                }
                end();
            }
            end();
        });
    });
}

const appRoot = newUiRoot(() => document.body);
function rerenderApp() {
    startRendering(appRoot);
    App();
}

rerenderApp();
