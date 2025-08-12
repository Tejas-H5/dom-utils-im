import {
    imGetState, 
    imInit,
    imEnd,
    getDeltaTimeSeconds,
    initImDomUtils,
    getCurrentRoot,
    imMemo,
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
    getImCore,
    imIsFirstishRender,
    imSetState,
    inlineTypeId,
    imBeginListItem,
    imEndListItem,
    REMOVE_LEVEL_DETATCHED,
} from "src/utils/im-utils-core";
import {
    setClass,
    setAttr,
    setStyle,
    imBeginSpan,
    imBeginDiv, 
    elementHasMousePress,
    elementHasMouseHover,
    getImMouse,
    imText,
} from "src/utils/im-utils-dom";
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
            imText(buttonText);

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
            imText(labelText);
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

    let s = imGetState(Math.random);
    if (s === undefined) s = imSetState(0);

    s += (-0.5 + Math.random()) * 0.02;
    if (s > 1) s = 1;
    if (s < -1) s = -1;

    // The retained-mode code is actually more compact here!
    imBeginDiv(); {
        imBeginDiv(); {
            const r = getCurrentRoot();
            imText("Removed: " + r.removeLevel);
            imText("In conditional path: " + r.isInConditionalPathway);
            imMemo(1);
        } imEnd();
    } imEnd();
    imBeginDiv(); {
        imText("brownian motion: " + s + "");
    } imEnd();
    imBeginDiv(); {
        imText("FPS: " + (1 / dt).toPrecision(2) + "");
    } imEnd();

    let n = s < 0 ? 1 : 2;
    n = 2; // TODO: revert
    imFor(); for (let i = 0; i < n; i++) {
        imBeginListItem(); {
            imBeginDiv(); {
                imText(new Date().toISOString());
            } imEnd();
        } imEndListItem();
    } imEndFor();
}

function resize(values: number[], gridRows: number, gridCols: number) {
    values.length = gridRows * gridCols;
    values.fill(1);
}

const GRID_DISABLED = 0;
const GRID_FRAMEWORK = 1;
const GRID_MOST_OPTIMAL = 2;
const GRID_NUM_VARIANTS = 3;

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
        grid: GRID_FRAMEWORK,
        toggleGrid() {
            s.grid = (s.grid + 1) % GRID_NUM_VARIANTS;
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

        imBeginSpan(); imText(fps.baselineLocked ? (fps.baselineFrameMs + "ms baseline, ") : "computing baseline..."); imEnd();

        imBeginSpan(); imText(fps.framesMsRounded + "ms frame, "); imEnd();

        imBeginSpan(); {
            const fpsChanged = imMemo(fps.renderMsRounded);
            if (fpsChanged) {
                setStyle("color", fps.renderMsRounded / fps.baselineFrameMs > 0.5 ? "red" : "");
            } 
            imText(fps.renderMsRounded + "ms render");
        } imEnd();
        // setStyle("transform", "rotate(" + angle + "deg)");

        if (elementHasMousePress()) {
            fps.baselineFrameMsFreq = 0;
        }

        const core = getImCore();
        imBeginSpan(); imText("Items rendered: " + core.itemsRenderedLastFrame); imEnd();

    } imEnd();
}

const cssb = newCssBuilder();
// border 1px solid red actually induces lag...
const cnGridTile = cssb.cn("grid-tile", [
    ` { position: relative; display: inline-block; width: 100px; height: 100px; aspect-ratio: 1 / 1; 
        border: 1px solid red; 
} `
]);

function imApp() {
    let errRef; errRef = imGetState(inlineTypeId<{ val: any }>(imApp));
    if (!errRef) errRef = imSetState({ val: null });


    // If only we can do this withouta typeId or a fn pointer?
    let s = imGetState(newAppState);
    if (!s) s = imSetState(newAppState());

    const l = imTry(); try {
        if (imIf() && !errRef.val) {

            let fps = imGetState(newFpsCounterState);
            if (!fps) fps = imSetState(newFpsCounterState());

            startPerfTimer(fps);
            imPerfTimerOutput(fps);

            imBeginDiv(); {
                imButton("Click me!", () => {
                    alert("noo");
                });
                imBeginDiv(); {
                    imText("Hello world! ");
                }
                imEnd();
                imBeginDiv(); {
                    imText("Lets goo");
                }
                imEnd();
                imBeginDiv(); {
                    imText("Count: " + s.count);
                }
                imEnd();
                imBeginDiv(); {
                    imText("Period: " + s.period);
                }
                imEnd();

                // sheesh. cant win with these people...
                if (imIf() && s.count > 1000) {
                    imBeginDiv(); {
                        imText("The count is too damn high!!");
                    } imEnd();
                } else if (imElseIf() && s.count < 1000) {
                    imBeginDiv(); {
                        imText("The count is too damn low !!");
                    } imEnd();
                } else { 
                    imElse();
                    imBeginDiv(); {
                        imText("The count is too perfect!!");
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
            } imEnd();


            imBeginDiv(); {
                if (imInit()) {
                    setClass(cn.row);
                    setStyle("height", "4em");
                }

                const n = 20;
                let pingPong; pingPong = imGetState(inlineTypeId(imBeginDiv));
                if (!pingPong) pingPong = imSetState({ pos: 0, dir: 1 });

                if (pingPong.pos === 0) {
                    pingPong.dir = 1;
                } else if (pingPong.pos === n) {
                    pingPong.dir = -1;
                }
                if (pingPong.pos < n || pingPong.pos > 0) {
                    pingPong.pos += pingPong.dir;
                } 

                imFor(); for (let i = 0; i <= n; i++) {
                    imBeginListItem(); {
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
                    } imEndListItem();
                } imEndFor();
            } imEnd();
            
            let gridState = imGetState(newGridState);
            if (!gridState) gridState = imSetState(newGridState());

            if (imIf() && s.grid === GRID_FRAMEWORK) {
                const dt = getDeltaTimeSeconds();
                const { values, gridRows, gridCols } = gridState;

                imBeginDiv(); imText("Grid size: " + gridState.gridRows * gridState.gridCols); imEnd();

                // NOTE: static list for performance. the grid size never changes. xD
                for (let row = 0; row < gridRows; row++) {
                    imBeginDiv(); {
                        if (imIsFirstishRender()) {
                            setAttr("style", "display: flex;");
                        }

                        for (let col = 0; col < gridCols; col++) {
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

                                // imBeginDiv(); {
                                //     if (imIsFirstishRender()) {
                                //         setStyle("position", "absolute");
                                //         setStyle("top", "25%");
                                //         setStyle("left", "25%");
                                //         setStyle("right", "25%");
                                //         setStyle("bottom", "25%");
                                //         setStyle("backgroundColor", "white");
                                //     }
                                // } imEnd();
                            } imEnd();
                        }
                    } imEnd();
                }
            } else if (imElseIf() && s.grid === GRID_MOST_OPTIMAL) {
                imBeginDiv(); imText("[Theoretical best performance upperbound with our current approach]  Grid size: " + gridState.gridRows * gridState.gridCols); imEnd();

                const root = imBeginDiv(); {
                    root.domAppender.manualDom = true;
                    const dt = getDeltaTimeSeconds();
                    const { values, gridRows, gridCols } = gridState;


                    const gridRowsChanged = imMemo(gridRows);
                    const gridColsChanged = imMemo(gridCols);

                    let state; state = imGetState(inlineTypeId(newGridState));
                    if (!state || gridRowsChanged || gridColsChanged) {
                        // This bit is not quite optimal. Thats ok though - we put slop behind infrequent signals all the time.

                        if (!state) state = imSetState<{ 
                            rows: {
                                root: HTMLElement;
                                children: {
                                    root: HTMLElement;
                                    idx: number;
                                    lastSignal: number;
                                }[];
                            }[];  
                        }>({ rows: [] });

                        while (state.rows.length > gridRows) state.rows.pop();
                        while (state.rows.length < gridRows) {
                            const row = document.createElement("div");
                            row.style.display = "flex";
                            root.root.appendChild(row);
                            state.rows.push({ root: row, children: [] });
                        }
                        root.root.replaceChildren(...state.rows.map(r => r.root));

                        for (let i = 0; i < state.rows.length; i++) {
                            const row = state.rows[i];
                            while (row.children.length > gridCols) row.children.pop();
                            while (row.children.length < gridCols) {
                                const child = document.createElement("div");
                                const val = { root: child, idx: 0, lastSignal: 0, };
                                row.children.push(val);
                                // Leak it. who cares. Mark and sweep should collect this when it becomes unreachable.
                                child.onmouseover = () => {
                                    if (val.idx > values.length) throw new Error("bruh");
                                    values[val.idx] = 1;
                                }
                                child.classList.add(cnGridTile);
                            }
                            row.root.replaceChildren(...row.children.map(c => c.root));
                        }

                        for (let rowIdx = 0; rowIdx < state.rows.length; rowIdx++) {
                            const row = state.rows[rowIdx];
                            for (let colIdx = 0; colIdx < row.children.length; colIdx++) {
                                const cell = row.children[colIdx];
                                cell.idx = colIdx + gridCols * rowIdx;
                            }
                        }
                    }

                    for (let i = 0; i < state.rows.length; i++) {
                        const row = state.rows[i];
                        for (let i = 0; i < row.children.length; i++) {
                            const pixel = row.children[i];
                            const idx = pixel.idx;

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
                            if (valRounded !== pixel.lastSignal) {
                                pixel.root.style.backgroundColor =`rgba(0, 0, 0, ${val})`;
                            }
                        }
                    }
                } imEnd();
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
                        imText("An error occured: " + errRef.val);
                    }
                    imEnd();
                    imBeginDiv(); {
                        imText("Click below to retry.")
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
