import { 
    getCurrentNumAnimations, 
    imOn, 
    div, el, imState, imRerenderable, imList, realtime, imErrorBoundary, imIf, imElse, imElseIf, newUiRoot,
    text,
    startRendering,
    init,
    attributes,
    getCurrentRoot, 
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
    return div(() => {
        const b = el(newButton, () => {
            imOn("click", onClick);
        });
        b.text(buttonText);
    });
}

function Slider(labelText: string, onChange: (val: number) => void) {
    return div(() => {
        el(newLabel, () => {
            init() && attributes({
                for: labelText
            })

            const r = getCurrentRoot();
            r.a("for", labelText);

            text(labelText);
        });

        const input = el<HTMLInputElement>(newInput, () => {
            const r = getCurrentRoot();
            r.s("width", "1000px")
            r.a("name", labelText)
            r.a("type", "range")
            r.a("min", "1"); r.a("max", "300"); r.a("step", "1");
            imOn("input", () => {
                onChange(input.root.valueAsNumber);
            });
        });
    });
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

        div(() => {
            const r = getCurrentRoot();
            div().text("Removed: " + r.removed);
        });
        div(() => {
            text("brownian motion: " + value.val + "");
        });
        div(() => {
            text("FPS: " + (1 / dt).toPrecision(2) + "");
        });
        imList(l => {
            let n = value.val < 0 ? 1 : 2;

            for (let i = 0; i < n; i++) {
                l.withRoot(() => {
                    div(() => {
                        text(new Date().toISOString());
                    });
                });
            }
        });
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
        rerender: () => {},

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
            div(() => {
                Button("Click me!", () => {
                    alert("noo");
                });
                div().text("Hello world! ");
                div().text("Lets go! ");
                div().text("Count: " + s.count);
                div().text("Period: " + s.period);
                realtime(() =>
                    div().text("Realtime animations in progress: " + getCurrentNumAnimations())
                );

                // sheesh. cant win with these people...
                imIf(s.count > 1000, () => {
                    div().text("The count is too damn high!!");
                });
                imElseIf(s.count < 1000, () => {
                    div().text("The count is too damn low !!");
                });
                imElse(() => {
                    div().text("The count is too perfect!!");
                });

                div(() => {
                    const r = getCurrentRoot();
                    if (init()) {
                        r.s("height", "5px");
                        r.s("backgroundColor", "black");
                    }
                });


                div(() => {
                    const r = getCurrentRoot();
                    if (init()) {
                        r.s("padding", "10px");
                        r.s("border", "1px solid black");
                        r.s("display", "inline-block");
                    }

                    if (s.count < 500) {
                        throw new Error("The count was way too low my dude");
                    }

                    imIf(s.count < 2000, () => {
                        WallClock();
                    })
                })

            });

            /**
            list(r, l => {
                for (let i = 0; i < 10; i++) {
                    const r = l.getNext();
                    // totally redundant list. I'm just testing the framework tho.
                    list(r, l => {
                        for (let i = 0; i < s.count / 10; i++) {
                            const r = l.getNext();
                            span(() => {
                                text(r, "A");
    
                                r.isFirstRenderCall && r.s("display", "inline-block");
                                r.s("transform", `translateY(${Math.sin(s.t + (2 * Math.PI * (i / s.period))) * 50}px)`);
                            });
                        }
                    });
                }
            });
            */

            imIf(s.grid, () => {
                const gridState = imState(newGridState);

                realtime((dt) => {
                    const { values } = gridState;

                    imList(l => {
                        for (let i = 0; i < values.length; i++) {
                            l.withRoot(() => {
                                div(() => {
                                    const r = getCurrentRoot();
                                    if (init()) {
                                        r.s("display", "flex");
                                    }

                                    imList(l => {
                                        for (let j = 0; j < values[i].length; j++) {
                                            l.withRoot(() => {
                                                div(() => {
                                                    const r = getCurrentRoot();
                                                    if (init()) {
                                                        r.s("display", "inline-block");
                                                        r.s("width", "5px");
                                                        r.s("height", "5px");
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
                                                        r.s("backgroundColor", `rgba(0, 0, 0, ${val})`);
                                                    }

                                                    imOn("mousemove", () => {
                                                        values[i][j] = 1;
                                                        // rerender();
                                                    });
                                                });
                                            });
                                        }
                                    })
                                })
                            });
                        }
                    })
                });
            })

            div(() => {
                const r = getCurrentRoot();
                init() && r.a("style", `position: fixed; bottom: 10px; left: 10px`);

                Slider("period", s.setPeriod);
                Slider("increment", s.setIncrement);
                Button("Toggle grid", s.toggleGrid);
                Button("Increment count", s.incrementCount);
                Button("Refresh", rerender);
                Button("Decrement count", s.decrementCount);
            });
        }, (error, recover) => {
            console.error(error);

            div(() => {
                const r = getCurrentRoot();
                init() && r.a("style", `display: absolute;top:0;bottom:0;left:0;right:0;`);

                div(() => {
                    const r = getCurrentRoot();
                    r.a("style", `display: flex; flex-direction: column; align-items: center; justify-content: center;`);

                    div(() => text("An error occured"));
                    div(() => text("Click below to retry."));
                    Button("Retry", () => {
                        s.count = 1000;

                        recover();
                    });
                });
            });
        })
    });
}

const appRoot = newUiRoot(() => document.body);
function rerenderApp() { 
    startRendering(appRoot);
    App();
}

rerenderApp();
