import { div, span, el, getState, rerenderFn, text, UIRoot, list, realtime, errorBoundary, If, ElseIf, newUiRoot, Else } from "src/utils/im-dom";
import { getCurrentNumAnimations } from "./utils/animation-queue";

function Button(r: UIRoot, buttonText: string, onClick: () => void) {
    const root = div(r);
    {
        const b = el(root, "button");
        text(b, buttonText);
        b.root.onmousedown = onClick;
    }

    return root;
}

function Slider(root: UIRoot, labelText: string, onChange: (val: number) => void) {
    div(root, r => {
        el(r, "LABEL", r => {
            r.a("for", labelText);
            text(r, labelText);
        });

        const input = el<HTMLInputElement>(r, "INPUT", r => {
            r.s("width", "1000px")
            r.a("name", labelText)
            r.a("type", "range")
            r.a("min", "1"); r.a("max", "300"); r.a("step", "1");
        });

        input.root.oninput = () => {
            onChange(input.root.valueAsNumber);
        }
    });

    return root;
}

function WallClock(r: UIRoot) {
    realtime(r, r => {
        const value = getState(r, () => ({ val: 0 }));

        value.val += (-0.5 + Math.random()) * 0.02;
        if (value.val > 1) value.val = 1;
        if (value.val < -1) value.val = -1;

        div(r, r => {
            text(div(r), "Removed: " + r.removed);
        });
        div(r, r => {
            text(r, "brownian motion: " + value.val + "");
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


function App(r: UIRoot) {
    const rerender = rerenderFn(r, () => App(r));

    const s = getState(r, () => ({
        t: 0,
        count: 1,
        incrementValue: 1,
        period: 2,
        setPeriod(val: number) {
            s.period = val;
            rerender();
        },
        setIncrement(val: number) {
            s.incrementValue = val;
            rerender();
        },
        incrementCount() {
            s.count += s.incrementValue;
            rerender();
        },
        decrementCount() {
            s.count -= s.incrementValue;
            rerender();
        }
    }));

    errorBoundary(r, r => {
        div(r, r => {
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

        div(r, r => {
            r.isFirstRenderCall && r.a("style", `position: fixed; bottom: 10px; left: 10px`);

            Slider(r, "period", s.setPeriod);
            Slider(r, "increment", s.setIncrement);
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

const appRoot = newUiRoot(document.body);

function rerenderApp() { 
    App(appRoot);
}

rerenderApp();
