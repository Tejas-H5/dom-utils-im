import {
    imDiv, 
    imEl, 
    imState, 
    imList, 
    nextListRoot, 
    newUiRoot,
    imInit,
    imEnd,
    setInnerText,
    setAttr,
    setStyle,
    imEndList,
    elementHasMousePress,
    elementHasMouseHover,
    getImMouse,
    deltaTimeSeconds,
    imRef,
    initializeImDomUtils,
    getCurrentRoot,
    imMemo,
    imSpan,
    imTextSpan,
    imStateInline,
    setClass,
    imIf,
    imElseIf,
    imElse,
    imEndIf,
    getNumItemsRendered,
    imTry,
    imCatch,
    imEndTryCatch,
} from "src/utils/im-dom-utils";
import { cn, initCnStyles } from "./utils/cn";

function newButton() {
    return document.createElement("button");
}

function imButton(buttonText: string, onClick: () => void) {
    let button;

    imDiv(); {
        button = imEl(newButton); {
            setInnerText(buttonText);

            if (elementHasMousePress()) {
                onClick();
            }
        }; imEnd();
    } imEnd();

    return button;
}

function newLabel() {
    return document.createElement("label");
}

function newInput() {
    return document.createElement("input");
}

function Slider(labelText: string, onChange: (val: number) => void) {
    const root = imDiv(); {
        imEl(newLabel); {
            setAttr("for", labelText);
            setInnerText(labelText);
        };
        imEnd();
        const input = imEl<HTMLInputElement>(newInput); {
            if (imInit()) {
                setAttr("width", "1000px");
                setAttr("type", "range");
                setAttr("min", "1");
                setAttr("max", "300");
                setAttr("step", "1");
            }

            setAttr("name", labelText)

            if (elementHasMouseHover()) {
                const mouse = getImMouse();
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
    const s = imState(newWallClockState);

    s.val += (-0.5 + Math.random()) * 0.02;
    if (s.val > 1) s.val = 1;
    if (s.val < -1) s.val = -1;

    // The retained-mode code is actually more compact here!
    imDiv(); {
        imDiv(); {
            const r = getCurrentRoot();
            setInnerText("Destroyed: " + r.destroyed);
        } imEnd();
    } imEnd();
    imDiv(); {
        setInnerText("brownian motion: " + s.val + "");
    } imEnd();
    imDiv(); {
        setInnerText("FPS: " + (1 / dt).toPrecision(2) + "");
    } imEnd();
    imList();
    let n = s.val < 0 ? 1 : 2;
    for (let i = 0; i < n; i++) {
        nextListRoot(); 

        imDiv();  {
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
    let gridRows = 200;
    let gridCols = 400;
    const values: number[][] = [];

    resize(values, gridRows, gridCols);

    return { gridRows, gridCols, values };
}



type FpsCounterState = {
    t: number;
    t0: number;
    frames: number;
    frameTime: number;
    screenHz: number;

    timeSpentRendering: number;
    timeSpentRenderingPerFrame: number;
    renders: number;
    renderHz: number;

    // Try to infer the 'baseline' frequency, so we know when we're lagging.
    baselineFrameMs: number;
    baselineFrameMsFreq: number;
    baselineLocked: boolean;
    nextBaseline: number;
    nextFreq: number;

    framesMsRounded: number;
    renderMsRounded: number;
}

function newFpsCounterState(): FpsCounterState {
    return {
        t: 0,
        t0: 0,
        frames: 0,
        frameTime: 0,
        screenHz: 0,

        timeSpentRendering: 0,
        timeSpentRenderingPerFrame: 0,
        renders: 0,
        renderHz: 0,

        // Try to infer the 'baseline' frequency, so we know when we're lagging.
        baselineFrameMs: 100,
        baselineFrameMsFreq: 0,
        baselineLocked: false,
        nextBaseline: 100,
        nextFreq: 0,

        framesMsRounded: 0,
        renderMsRounded: 0,
    };
}

function startPerfTimer(fps: FpsCounterState) {
    fps.t0 = performance.now();
    const dt = deltaTimeSeconds();
    fps.t += dt;
    fps.frames++;


    fps.framesMsRounded = Math.round(1000 * fps.frameTime);
    fps.renderMsRounded = Math.round(1000 * fps.timeSpentRenderingPerFrame);

    // Compute our baseline framerate based on the frames we see.
    // Lock it down once we've seen the same framerate for long enough.
    fps.baselineLocked = fps.baselineFrameMsFreq > 240
    if (!fps.baselineLocked) {
        if (fps.framesMsRounded === fps.nextBaseline) {
            if (fps.nextFreq < Number.MAX_SAFE_INTEGER) {
                fps.nextFreq++;
            }
        } else if (fps.framesMsRounded === fps.baselineFrameMs) {
            if (fps.baselineFrameMsFreq < Number.MAX_SAFE_INTEGER) {
                fps.baselineFrameMsFreq++;
            }
        } else {
            fps.nextBaseline = fps.framesMsRounded;
            fps.nextFreq = 1;
        }

        if (fps.nextFreq > fps.baselineFrameMsFreq) {
            fps.baselineFrameMs = fps.nextBaseline;
            fps.baselineFrameMsFreq = fps.nextFreq;
            fps.nextBaseline = 100;
            fps.nextFreq = 0;
        }
    }
}

function stopPerfTimer(fps: FpsCounterState) {
    // render-start     -> Timer start
    //      rendering code()
    // render-end       -> timer stop
    // --- wait for next animation frame ---
    // this timer intentionally skips all of the time here.
    // we want to know what our remaining performance budget is, basically
    // ---
    // repeat

    fps.timeSpentRendering += (performance.now() - fps.t0);
    fps.renders++;

    if (fps.t > 1) {
        fps.frameTime = fps.t / fps.frames;
        fps.screenHz = Math.round(fps.frames / fps.t);
        fps.t = 0;
        fps.frames = 0;

        fps.timeSpentRenderingPerFrame = (fps.timeSpentRendering / 1000) / fps.renders;
        fps.renderHz = Math.round(fps.renders / (fps.timeSpentRendering / 1000));
        fps.timeSpentRendering = 0;
        fps.renders = 0;
    } 
}

function imPerfTimerOutput(fps: FpsCounterState) {
    imDiv(); {
        if (imInit()) {
            setStyle("position", "absolute");
            setStyle("top", "5px");
            setStyle("right", "5px");
            setStyle("padding", "5px");
            setStyle("zIndex", "1000000");
            // YOU gotta set this.
            // setStyle("backgroundColor", );
            setStyle("borderRadius", "1000px");
            setStyle("opacity", "0.5");
            // setStyle("backgroundColor", cssVars.fg);
            // setStyle("width", "20px");
            // setStyle("height", "20px");
            // setStyle("transformOrigin", "center");
        }

        // r.text(screenHz + "hz screen, " + renderHz + "hz code");

        imTextSpan(fps.baselineLocked ? (fps.baselineFrameMs + "ms baseline, ") : "computing baseline...");

        imTextSpan(fps.framesMsRounded + "ms frame, ");

        imSpan(); {
            const fpsChanged = imMemo(fps.renderMsRounded);
            if (fpsChanged) {
                setStyle("color", fps.renderMsRounded / fps.baselineFrameMs > 0.5 ? "red" : "");
            } 
            setInnerText(fps.renderMsRounded + "ms render");
        } imEnd();
        // setStyle("transform", "rotate(" + angle + "deg)");

        if (elementHasMousePress()) {
            fps.baselineFrameMsFreq = 0;
        }

        imTextSpan("Text span: " + getNumItemsRendered());

    } imEnd();
}

function imApp() {
    const errRef = imRef<any>();

    const s = imState(newAppState);

    const l = imTry();
    try {
        if (imIf() && !errRef.val) {

            const fps = imState(newFpsCounterState);
            startPerfTimer(fps);
            imPerfTimerOutput(fps);

            imDiv(); {
                imButton("Click me!", () => {
                    alert("noo");
                });
                imDiv(); {
                    setInnerText("Hello world! ");
                }
                imEnd();
                imDiv(); {
                    setInnerText("Lets goo");
                }
                imEnd();
                imDiv(); {
                    setInnerText("Count: " + s.count);
                }
                imEnd();
                imDiv(); {
                    setInnerText("Period: " + s.period);
                }
                imEnd();

                // sheesh. cant win with these people...
                if (imIf() && s.count > 1000) {
                    imDiv(); {
                        setInnerText("The count is too damn high!!");
                    } imEnd();
                } else if (imElseIf() && s.count < 1000) {
                    imDiv(); {
                        setInnerText("The count is too damn low !!");
                    } imEnd();
                } else { 
                    imElse();
                    imDiv(); {
                        setInnerText("The count is too perfect!!");
                    } imEnd();
                } imEndIf();
                imDiv(); {
                    if (imInit()) {
                        setAttr("style", "height: 5px; background-color: black");
                    }
                } imEnd();
                imDiv(); {
                    if (imInit()) {
                        setAttr("style", "padding: 10px; border: 1px solid black; display: inline-block");
                    }

                    if (s.count < 500) {
                        // throw new Error("The count was way too low my dude");
                    }

                    if (imIf() && s.count < 2000) {
                        WallClock();
                    } imEndIf();
                }
                imEnd();

            }
            imEnd();

            imDiv(); {
                if (imInit()) {
                    setClass(cn.row);
                    setStyle("height", "4em");
                }

                const n = 20;
                const pingPong = imStateInline(() => {
                    return { pos: 0, dir: 1 };
                });
                if (pingPong.pos === 0) {
                    pingPong.dir = 1;
                } else if (pingPong.pos === n) {
                    pingPong.dir = -1;
                }
                if (pingPong.pos < n || pingPong.pos > 0) {
                    pingPong.pos += pingPong.dir;
                } 

                imList();
                for (let i = 0; i <= n; i++) {
                    nextListRoot();
                    imDiv(); {
                        if (imInit()) {
                            setStyle("flex", "1");
                            setStyle("height", "100%");
                        }

                        const present = i === pingPong.pos;
                        const changed = imMemo(present);
                        if (changed) {
                            setStyle("backgroundColor", present ? "#000" : "#FFF");
                        }
                    } imEnd();
                }
                imEndList();
            } imEnd();
            
            const gridState = imState(newGridState);
            if (imIf() && s.grid) {
                const dt = deltaTimeSeconds();
                const { values } = gridState;

                imList();
                for (let i = 0; i < values.length; i++) {
                    nextListRoot();

                    imDiv(); {
                        if (imInit()) {
                            setAttr("style", "display: flex;");
                        }

                        imList();
                        for (let j = 0; j < values[i].length; j++) {
                            nextListRoot(); 
                            imDiv(); {
                                if (imInit()) {
                                    setAttr("style", "display: inline-block; width: 50px; height: 50px; aspect-ratio: 1 / 1; border: 1px solid red;");
                                }

                                if (elementHasMouseHover()) {
                                    values[i][j] = 1;
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
                                const styleChanged = imMemo(valRounded);
                                if (styleChanged) {
                                    setStyle("backgroundColor", `rgba(0, 0, 0, ${val})`);
                                } 
                            } imEnd();
                        }
                        imEndList();
                    } imEnd();
                }
                imEndList();
            } imEndIf();

            imDiv(); {
                if (imInit()) {
                    setAttr("style", `position: fixed; bottom: 10px; left: 10px`);
                }

                Slider("period", s.setPeriod);
                Slider("increment", s.setIncrement);
                imButton("Toggle grid", s.toggleGrid);
                imButton("Increment count", s.incrementCount);
                imButton("Decrement count", s.decrementCount);
            }
            imEnd();

            stopPerfTimer(fps);
        } else {
            imElse();

            imDiv(); {
                if (imInit()) {
                    setAttr("style", `display: absolute;top:0;bottom:0;left:0;right:0;`);
                }

                imDiv(); {
                    if (imInit()) {
                        setAttr("style", `display: flex; flex-direction: column; align-items: center; justify-content: center;`);
                    }

                    imDiv(); {
                        setInnerText("An error occured: " + errRef.val);
                    }
                    imEnd();
                    imDiv(); {
                        setInnerText("Click below to retry.")
                    }
                    imEnd();

                    imButton("Retry", () => {
                        s.count = 1000;
                        errRef.val = null;
                    });
                } imEnd();
            } imEnd();
        } imEndIf();
    } catch(err) {
        imCatch(l);

        console.error(err);
        errRef.val = err;
    }
    imEndTryCatch();
}

const appRoot = newUiRoot(() => document.body);

function rerenderApp() {
    imApp();
}

initCnStyles();
initializeImDomUtils(rerenderApp, appRoot);
