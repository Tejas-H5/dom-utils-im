import {
    imBeginDiv, 
    imState, 
    imInit,
    imEnd,
    setAttr,
    setStyle,
    elementHasMousePress,
    elementHasMouseHover,
    getImMouse,
    getDeltaTimeSeconds,
    imRef,
    initImDomUtils,
    getCurrentRoot,
    imMemo,
    imBeginSpan,
    setClass,
    imIf,
    imElseIf,
    imElse,
    imEndIf,
    imTry,
    imCatch,
    imBeginRoot,
    imFor,
    imEndFor,
    imEndTry,
    setText,
    imNextListRoot,
    getImCore,
    imIsFirstishRender,
} from "src/utils/im-dom-utils";
import {
    cn,
    initCssbStyles,
    newCssBuilder
} from "src/utils/cssb";

function newButton() {
    return document.createElement("button");
}

function imButton(buttonText: string, onClick: () => void) {
    let button;

    imBeginDiv(); {
        button = imBeginRoot(newButton); {
            setText(buttonText);

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
    const root = imBeginDiv(); {
        imBeginRoot(newLabel); {
            setAttr("for", labelText);
            setText(labelText);
        }; imEnd();
        const input = imBeginRoot<HTMLInputElement>(newInput); {
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
        } imEnd();
    } imEnd();
    return root;
}

function newWallClockState() {
    return { val: 0 };
}

function WallClock() {
    const dt = getDeltaTimeSeconds();
    const s = imState(newWallClockState);

    s.val += (-0.5 + Math.random()) * 0.02;
    if (s.val > 1) s.val = 1;
    if (s.val < -1) s.val = -1;

    // The retained-mode code is actually more compact here!
    imBeginDiv(); {
        imBeginDiv(); {
            const r = getCurrentRoot();
            setText("Removed: " + r.removeLevel);
            setText("In conditional path: " + r.isInConditionalPathway);
            imMemo(1);
        } imEnd();
    } imEnd();
    imBeginDiv(); {
        setText("brownian motion: " + s.val + "");
    } imEnd();
    imBeginDiv(); {
        setText("FPS: " + (1 / dt).toPrecision(2) + "");
    } imEnd();

    let n = s.val < 0 ? 1 : 2;
    imFor(); for (let i = 0; i < n; i++) {
        imNextListRoot(); 

        imBeginDiv();  {
            setText(new Date().toISOString());
        } imEnd();
    } imEndFor();
}

function resize(values: number[], gridRows: number, gridCols: number) {
    values.length = gridRows * gridCols;
    values.fill(1);
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
    let gridRows = 1000;
    let gridCols = 100;
    const values: number[] = [];

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
    const dt = getDeltaTimeSeconds();
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
    imBeginDiv(); {
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

        imBeginSpan(); setText(fps.baselineLocked ? (fps.baselineFrameMs + "ms baseline, ") : "computing baseline..."); imEnd();

        imBeginSpan(); setText(fps.framesMsRounded + "ms frame, "); imEnd();

        imBeginSpan(); {
            const fpsChanged = imMemo(fps.renderMsRounded);
            if (fpsChanged) {
                setStyle("color", fps.renderMsRounded / fps.baselineFrameMs > 0.5 ? "red" : "");
            } 
            setText(fps.renderMsRounded + "ms render");
        } imEnd();
        // setStyle("transform", "rotate(" + angle + "deg)");

        if (elementHasMousePress()) {
            fps.baselineFrameMsFreq = 0;
        }

        const core = getImCore();
        imBeginSpan(); setText("Text span: " + core.itemsRenderedLastFrame); imEnd();

    } imEnd();
}

const cssb = newCssBuilder();
// border 1px solid red actually induces lag...
const cnGridTile = cssb.cn("grid-tile", [
    ` { display: inline-block; width: 100px; height: 100px; aspect-ratio: 1 / 1; 
        border: 1px solid red; 
} `
]);

function imApp() {
    const errRef = imRef<any>();

    const s = imState(newAppState);

    const l = imTry(); try {
        if (imIf() && !errRef.val) {

            const fps = imState(newFpsCounterState);
            startPerfTimer(fps);
            imPerfTimerOutput(fps);

            imBeginDiv(); {
                imButton("Click me!", () => {
                    alert("noo");
                });
                imBeginDiv(); {
                    setText("Hello world! ");
                }
                imEnd();
                imBeginDiv(); {
                    setText("Lets goo");
                }
                imEnd();
                imBeginDiv(); {
                    setText("Count: " + s.count);
                }
                imEnd();
                imBeginDiv(); {
                    setText("Period: " + s.period);
                }
                imEnd();

                // sheesh. cant win with these people...
                if (imIf() && s.count > 1000) {
                    imBeginDiv(); {
                        setText("The count is too damn high!!");
                    } imEnd();
                } else if (imElseIf() && s.count < 1000) {
                    imBeginDiv(); {
                        setText("The count is too damn low !!");
                    } imEnd();
                } else { 
                    imElse();
                    imBeginDiv(); {
                        setText("The count is too perfect!!");
                    } imEnd();
                } imEndIf();
                imBeginDiv(); {
                    if (imInit()) {
                        setAttr("style", "height: 5px; background-color: black");
                    }
                } imEnd();
                imBeginDiv(); {
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


            imBeginDiv(); {
                if (imInit()) {
                    setClass(cn.row);
                    setStyle("height", "4em");
                }

                const n = 20;
                const pingPong = imState(() => {
                    return { pos: 0, dir: 1 };
                }, true);
                if (pingPong.pos === 0) {
                    pingPong.dir = 1;
                } else if (pingPong.pos === n) {
                    pingPong.dir = -1;
                }
                if (pingPong.pos < n || pingPong.pos > 0) {
                    pingPong.pos += pingPong.dir;
                } 

                imFor(); for (let i = 0; i <= n; i++) {
                    imNextListRoot();
                    imBeginDiv(); {
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
                } imEndFor();
            } imEnd();
            
            const gridState = imState(newGridState);
            if (imIf() && s.grid) {
                const dt = getDeltaTimeSeconds();
                const { values, gridRows, gridCols } = gridState;

                imBeginDiv(); setText("Grid size: " + gridState.gridRows * gridState.gridCols); imEnd();

                imFor(); for (let row = 0; row < gridRows; row++) {
                    imNextListRoot();

                    imBeginDiv(); {
                        if (imIsFirstishRender()) {
                            setAttr("style", "display: flex;");
                        }

                        imFor(); for (let col = 0; col < gridCols; col++) {
                            imNextListRoot(); 
                            imBeginDiv(); {
                                if (imIsFirstishRender()) {
                                    setClass(cnGridTile);
                                }


                                const idx = col + gridCols * row;

                                if (elementHasMouseHover()) {
                                    values[idx] = 1;
                                }

                                // NOTE: usually you would do this with a CSS transition if you cared about performance, but
                                // I'm just trying out some random stuff.
                                let val = values[idx];
                                if (val > 0) {
                                    val -= dt;
                                    if (val < 0) {
                                        val = 0;
                                    }
                                    values[idx] = val;
                                }

                                const valRounded = Math.round(val * 255) / 255;
                                const styleChanged = imMemo(valRounded);
                                if (styleChanged) {
                                    setStyle("backgroundColor", `rgba(0, 0, 0, ${val})`);
                                } 
                            } imEnd();
                        } imEndFor();
                    } imEnd();
                } imEndFor();
            } imEndIf();

            imBeginDiv(); {
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

            imBeginDiv(); {
                if (imInit()) {
                    setAttr("style", `display: absolute;top:0;bottom:0;left:0;right:0;`);
                }

                imBeginDiv(); {
                    if (imInit()) {
                        setAttr("style", `display: flex; flex-direction: column; align-items: center; justify-content: center;`);
                    }

                    imBeginDiv(); {
                        setText("An error occured: " + errRef.val);
                    }
                    imEnd();
                    imBeginDiv(); {
                        setText("Click below to retry.")
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
    } imEndTry();
}

function rerenderApp() {
    imApp();
}

initCssbStyles();
initImDomUtils(rerenderApp);
