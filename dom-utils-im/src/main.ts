import { 
    getCurrentNumAnimations, 
    on, 
    div, el, imState, rerenderFn, text, UIRoot, list, realtime, errorBoundary, If, ElseIf, newUiRoot, Else,
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

function Button(r: UIRoot, buttonText: string, onClick: () => void) {
    return div(r, r => {
        const b = el(r, newButton, r => {
            on(r, "click", onClick);
        });
        text(b, buttonText);
    });
}

function Slider(r: UIRoot, labelText: string, onChange: (val: number) => void) {
    return div(r, r => {
        el(r, newLabel, r => {
            r.a("for", labelText);
            text(r, labelText);
        });

        const input = el<HTMLInputElement>(r, newInput, r => {
            r.s("width", "1000px")
            r.a("name", labelText)
            r.a("type", "range")
            r.a("min", "1"); r.a("max", "300"); r.a("step", "1");
            on(r, "input", () => {
                onChange(input.root.valueAsNumber);
            });
        });
    });
}

function newWallClockState() {
    return { val: 0 };
}

function WallClock(r: UIRoot) {
    realtime(r, (r, dt) => {
        const value = imState(r, newWallClockState);

        value.val += (-0.5 + Math.random()) * 0.02;
        if (value.val > 1) value.val = 1;
        if (value.val < -1) value.val = -1;

        div(r, r => {
            text(div(r), "Removed: " + r.removed);
        });
        div(r, r => {
            text(r, "brownian motion: " + value.val + "");
        });
        div(r, r => {
            text(r, "FPS: " + (1 / dt).toPrecision(2) + "");
        });
        list(r, l => {
            let n = value.val < 0 ? 1 : 2;

            for (let i = 0; i < n; i++) {
                const r = l.getNext();
                div(r, r => {
                    text(r, new Date().toISOString());
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

function App(r: UIRoot) {
    const rerender = rerenderFn(r, () => App(r));

    const s = imState(r, newAppState);
    s.rerender = rerender;

    errorBoundary(r, r => {
        div(r, r => {
            Button(r, "Click me!", () => {
                alert("noo");
            });
            text(div(r), "Hello world! ");
            text(div(r), "Lets go! ");
            text(div(r), "Count: " + s.count);
            text(div(r), "Period: " + s.period);
            realtime(r, r => 
                text(div(r), "Realtime animations in progress: " + getCurrentNumAnimations())
            );

            // sheesh. cant win with these people...
            If(s.count > 1000, r, r => {
                text(div(r), "The count is too damn high!!");
            });
            ElseIf(s.count < 1000, r, r => {
                text(div(r), "The count is too damn low !!");
            });
            Else(r, r => {
                text(div(r), "The count is too perfect!!");
            });

            div(r, r => {
                if (r.isFirstRenderCall) {
                    r.s("height", "5px");
                    r.s("backgroundColor", "black");
                }
            });


            div(r, r => {
                if (r.isFirstRenderCall) {
                    r.s("padding", "10px");
                    r.s("border", "1px solid black");
                    r.s("display", "inline-block");
                }

                if (s.count < 500) {
                    throw new Error("The count was way too low my dude");
                }

                If(s.count < 2000, r, r => {
                    WallClock(r);
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
                        span(r, r => {
                            text(r, "A");

                            r.isFirstRenderCall && r.s("display", "inline-block");
                            r.s("transform", `translateY(${Math.sin(s.t + (2 * Math.PI * (i / s.period))) * 50}px)`);
                        });
                    }
                });
            }
        });
        */

        If(s.grid, r, r => {
            const gridState = imState(r, newGridState);

            realtime(r, (r, dt) => {
                const { values } = gridState;

                list(r, l => {
                    for (let i = 0; i < values.length; i++) {
                        const r = l.getNext();
                        div(r, r => {
                            if (r.isFirstRender) {
                                r.s("display", "flex");
                            }

                            list(r, l => {
                                for (let j = 0; j < values[i].length; j++) {
                                    const r = l.getNext();
                                    div(r, r => {
                                        if (r.isFirstRender) {
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

                                        on(r, "mousemove", () => {
                                            values[i][j] = 1;
                                            // rerender();
                                        });
                                    });
                                }
                            })
                        })
                    }
                })
            });
        })

        div(r, r => {
            r.isFirstRenderCall && r.a("style", `position: fixed; bottom: 10px; left: 10px`);

            Slider(r, "period", s.setPeriod);
            Slider(r, "increment", s.setIncrement);
            Button(r, "Toggle grid", s.toggleGrid);
            Button(r, "Increment count", s.incrementCount);
            Button(r, "Refresh", rerender);
            Button(r, "Decrement count", s.decrementCount);
        });
    }, (rError, error, recover) => {
        console.error(error);

        div(rError, r => {
            r.isFirstRenderCall && r.a("style", `display: absolute;top:0;bottom:0;left:0;right:0;`);

            div(r, r => {
                r.a("style", `display: flex; flex-direction: column; align-items: center; justify-content: center;`);

                div(r, r => text(r, "An error occured"));
                div(r, r => text(r, "Click below to retry."));
                Button(r, "Retry", () => {
                    s.count = 1000;

                    recover();
                });
            });
        });
    })
}

const appRoot = newUiRoot(() => document.body);
function rerenderApp() { 
    App(appRoot);
}

rerenderApp();
