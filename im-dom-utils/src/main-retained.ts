import { getCurrentNumAnimations, newComponent, newInsertable, RenderGroup, div, el, contentsDiv, appendChild } from "./utils/dom-utils";

function Button(rg: RenderGroup<{
    buttonText: string;
    onClick: () => void;
}>) {
    return el("button", {}, [
        rg.text(s => s.buttonText),
        rg.on("mousedown", (s) => {
            s.onClick();
        })
    ]);
}

function Slider(rg: RenderGroup<{
    labelText: string;
    onChange: (val: number) => void;
}>) {
    return div({}, [
        el("LABEL", {}, [
            rg.attr("for", s => s.labelText),
            rg.text(s => s.labelText),
        ]),
        // I thought this was a good idea at the time, but it wasn't. 
        // This is because if I render more things underneath, then
        // Those handlers actually get added before the ones
        // inside this function.
        // so the order of events is no longer what you think it is.
        // This has resulted in bugs.
        () => {
            const input = el<HTMLInputElement>("INPUT", {
                style: "width: 1000px",
                type: "range",
                min: "1", max: "300", step: "1",
            }, [
                rg.attr("name", s => s.labelText),
                rg.on("input", (s) => s.onChange(input.el.valueAsNumber)),
            ])
            return input;
        }
    ]);
}

function WallClock(rg: RenderGroup) {
    function WallClockNotRealtimem(rg: RenderGroup) {
        function Entry(rg: RenderGroup) {
            return div({}, [
                rg.text(() => new Date().toISOString()),
            ]);
        }

        let val = 0;
        rg.preRenderFn(() => {
            val += (-0.5 + Math.random()) * 0.02;
            if (val > 1) val = 1;
            if (val < -1) val = -1;
        });

        return rg.realtime(
            rg => contentsDiv({}, [
                div({}, [
                    div({}, [
                        rg.text(s => "Removed: " + rg.root._isHidden),
                    ]),
                    rg.text(s => "Brownian motion: " + val + ""),
                ]),
                rg.list(contentsDiv(), Entry, (getNext, s) => {
                    let n = val < 0 ? 1 : 2;
                    for (let i = 0; i < n; i++) {
                        getNext().render(null);
                    }
                })
            ]),
        );
    }

    return rg.realtime(rg => rg.c(WallClockNotRealtimem, (c, s) => c.render(s)));
}

function App(rg: RenderGroup) {
    let gridRows = 100;
    let gridCols = 400;
    const values: number[][] = [];
    function resize() {
        while (values.length < gridRows) {
            values.push([]);
        }
        while (values.length > gridRows) {
            values.pop();
        }

        for (let i = 0; i < values.length; i++) {
            const row = values[i];
            while (row.length < gridCols) {
                row.push(0);
            }
            while (row.length > gridCols) {
                row.pop();
            }
        }
    }
    resize();
    let gridVisible = true;

    rg.realtimeFn((dt) => {
        for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values[i].length; j++) {
                if (values[i][j] > 0) {
                    values[i][j] -= dt;
                }
                if (values[i][j] < 0) {
                    values[i][j] = 0;
                }
            }
        }
    });

    const state = {
        t: 0,
        count: 1,
        incrementValue: 1,
        period: 2,
        setPeriod(val: number) {
            state.period = val;
            rg.render(rg.s);
        },
        setIncrement(val: number) {
            state.incrementValue = val;

            for (let i = 0; i < 10; i) {
                values.push([]);
            }

            rg.render(rg.s);
        },
        incrementCount() {
            gridRows += 5;
            gridCols += 5;
            resize();

            state.count += state.incrementValue;
            rg.render(rg.s);
        },
        decrementCount() {
            gridRows -= 5;
            gridCols -= 5;
            resize();

            state.count -= state.incrementValue;
            rg.render(rg.s);
        },
        toggleGrid() {
            gridVisible = !gridVisible;
            rg.renderWithCurrentState();
        }
    }

    // TODO: error boundary (I wasnt able to implement it here for the entire year I had this framework)

    return div({}, [
        div({}, "Hello world! "),
        div({}, "Lets go! "),
        div({}, rg.text(s => "Count: " + state.count)),
        div({}, rg.text(s => "Period: " + state.period)),
        rg.realtime(rg => 
            div({}, rg.text(s => "Realtime animations in progress: " + getCurrentNumAnimations())),
        ),
        rg.if(() => state.count < 1000, rg =>
            div({}, rg.text(s => "The count is too damn low !!"))
        ),
        rg.else_if(() => state.count < 1000, rg =>
            div({}, rg.text(s => "The count is too damn high!!"))
        ),
        rg.else(rg =>
            div({}, rg.text(s => "The count is too perfect!!"))
        ),
        div({ style: "height: 5px; background-color: black" }),
        div({ 
            style:  "padding: 10px; border: 1px solid black; display: inline-block"
        }, [
                /// TODO: 
                // if (s.count < 500) {
                //     throw new Error("The count was way too low my dude");
                // }
            rg.if(() => state.count < 2000, rg => 
                rg.c(WallClock, (c, s) => c.render(s)),
            )
        ]),
        /**
        () => {
            function InnerList2(rg: RenderGroup<{ i: number }>) {
                return span({ style: "display: inline-block" }, [
                    "A",
                    rg.style("transform", s => `translateY(${Math.sin(state.t + (2 * Math.PI * (s.i / state.period))) * 50}px)`),
                ]);
            }

            function InnerList(rg: RenderGroup) {
                return rg.list(contentsDiv(), InnerList2, (getNext) => {
                    for (let i = 0; i < state.count / 10; i++) {
                        getNext().render({ i });
                    }
                });
            }

            return rg.list(contentsDiv(), InnerList, (getNext) => {
                for (let i = 0; i < 10; i++) {
                    getNext().render(null);
                }
            });
        },
        */
        () => {
            function Item(rg: RenderGroup<{ i: number; j: number; values: number[][]; }>) {
                return rg.realtime(rg =>
                    div({
                        style: "width: 5px; height: 5px;",
                    }, [
                        rg.style("backgroundColor", s => `rgba(0, 0, 0, ${0.1 + s.values[s.i][s.j]})`),
                        rg.on("mouseenter", s => {
                            s.values[s.i][s.j] = 1;
                        }),
                    ])
                );
            }

            function Row(rg: RenderGroup<{ i: number }>) {
                return rg.list(div({ 
                    style: "display: flex;"
                }), Item, (getNext, s) => {
                    const row = values[s.i];
                    for (let j = 0; j < row.length; j++) {
                        getNext().render({ i: s.i, j, values });
                    }
                });
            }

            return rg.if(() => gridVisible, rg => rg.list(contentsDiv(), Row, (getNext) => {
                for (let i = 0; i < gridRows; i++) {
                    getNext().render({ i });
                }
            }));
        },
        div({ style: "position: fixed; bottom: 10px; left: 10px" }, [
            rg.c(Slider, (c, s) => c.render({
                labelText: "period",
                onChange: state.setPeriod,
            })),
            rg.c(Slider, (c, s) => c.render({
                labelText: "increment",
                onChange: state.setIncrement,
            })),
            rg.c(Button, (c, s) => c.render({
                buttonText: "Increment count",
                onClick: state.incrementCount,
            })),
            rg.c(Button, (c, s) => c.render({
                buttonText: "Refresh",
                onClick: rg.renderWithCurrentState,
            })),
            rg.c(Button, (c, s) => c.render({
                buttonText: "Decrement count",
                onClick: state.decrementCount,
            })),
            rg.c(Button, (c, s) => c.render({
                buttonText: "Toggle grid",
                onClick: state.toggleGrid,
            })),
        ]),
    ]);
}

const root = newInsertable(document.body);
const app = newComponent(App);
appendChild(root, app)

function rerenderApp() {
    app.render(null);
}
rerenderApp();
