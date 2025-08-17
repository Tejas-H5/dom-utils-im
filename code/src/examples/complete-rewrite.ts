// NOTE: this rewrite went better than expected. it will most likely replace what we have right now.

import {
    CACHE_CURRENT_ENTRIES,
    CACHE_ITEMS_ITERATED,
    CACHE_NEEDS_RERENDER,
    ENTRIES_IS_IN_CONDITIONAL_PATHWAY,
    ENTRIES_REMOVE_LEVEL,
    imCache,
    ImCache,
    imCacheEnd,
    ImCacheEntries,
    imCacheNeedsRerender,
    imFor,
    imForEnd,
    imGet,
    imIf,
    imIfElse,
    imIfEnd,
    imMemo,
    imSet,
    imSwitch,
    imSwitchEnd,
    imTry,
    imTryCatch,
    imTryEnd,
    inlineTypeId,
    isFirstishRender
} from "./im-core";
import {
    attrsSet,
    classesSet,
    EL_BUTTON,
    EL_DIV,
    EL_H1,
    EL_INPUT,
    EL_LABEL,
    elGet,
    elSetAttr,
    elSetStyle,
    imDomRoot,
    imDomRootEnd,
    imEl,
    imElEnd,
    imStr,
    stylesSet,
    ValidElement
} from "./im-dom";

// TODO:
//      - [ ] recreate our random-stuff.ts
// - Performance testing
//      - [ ] Variadic memo
//      - [ ] Making c1 a global variable
//      - [ ] Namespaced imports

const c1: ImCache = [];

let toggleA = false;
let toggleB = false;

const changeEvents: string[] = [];

let currentExample = 2;
let numAnimations = 0;

let rerenders = 0;

function imMain() {
    rerenders++;

    imCache(c1); {
        imDomRoot(c1, document.body); {
            imEl(c1, EL_DIV); {
                if (isFirstishRender(c1)) {
                    elSetStyle(c1, "display", "flex");
                    elSetStyle(c1, "gap", "10px");
                }

                imButton(c1); {
                    imStr(c1, "Conditional rendering, memo, array block");
                    if (elHasMouseDown(c1)) currentExample = 0;
                } imButtonEnd(c1);
                imButton(c1); {
                    imStr(c1, "Error boundaries");
                    if (elHasMouseDown(c1)) currentExample = 1;
                } imButtonEnd(c1);
                imButton(c1); {
                    imStr(c1, "Realtime rendering");
                    if (elHasMouseDown(c1)) currentExample = 2;
                } imButtonEnd(c1);

                imEl(c1, EL_DIV); {
                    if (isFirstishRender(c1)) {
                        elSetStyle(c1, "flex", "1");
                    }
                } imElEnd(c1, EL_DIV);

                imEl(c1, EL_DIV); {
                    if (imIf(c1) && numAnimations > 0) {
                        imStr(c1, "[" + rerenders + " rerenders ]");
                    } imIfEnd(c1);
                } imElEnd(c1, EL_DIV);

                imEl(c1, EL_DIV); {
                    if (imIf(c1) && numAnimations > 0) {
                        imStr(c1, "[" + numAnimations + " animation in progress ]");
                    } imIfEnd(c1);
                } imElEnd(c1, EL_DIV);
            } imElEnd(c1, EL_DIV);

            imDivider(c1);

            // TODO: convert these into automated tests
            imSwitch(c1, currentExample); switch (currentExample) {
                case 0: imMemoExampleView(c1); break;
                case 1: imErrorBoundaryExampleView(c1); break;
                case 2: imRealtimeExampleView(c1); break;
            } imSwitchEnd(c1);

        } imDomRootEnd(c1, document.body);
    } imCacheEnd(c1);

    if (imCacheNeedsRerender(c1)) {
        imMain();
    }
}


function imMemoExampleView(c: ImCache) {
    imEl(c, EL_H1); {
        imStr(c, "Im memo changes");
    } imElEnd(c, EL_H1);

    let i = 0;
    imFor(c); for (const change of changeEvents) {
        imEl(c, EL_DIV); {
            imStr(c, i++);
            imStr(c, ":");
            imStr(c, change);
        } imElEnd(c, EL_DIV);
    } imForEnd(c);

    imDivider(c);

    imEl(c, EL_DIV); { imStr(c, `toggleA: ${toggleA}, toggleB: ${toggleB}`); } imElEnd(c, EL_DIV);
    imEl(c, EL_DIV); { imStr(c, `expected: ${toggleA ? (toggleB ? "A" : "B") : (toggleB ? "C" : "D")}`); } imElEnd(c, EL_DIV);

    if (imIf(c) && toggleA) {
        if (imIf(c) && toggleB) {
            if (imIf(c) && toggleB) {
                if (imMemo(c, toggleB)) {
                    changeEvents.push("A");
                }

                imEl(c, EL_DIV); imStr(c, "A"); imElEnd(c, EL_DIV);
            } imIfEnd(c);
        } else {
            imIfElse(c);

            if (imMemo(c, toggleB)) {
                changeEvents.push("B");
            }

            imEl(c, EL_DIV); imStr(c, "B"); imElEnd(c, EL_DIV);
        } imIfEnd(c);
    } else {
        imIfElse(c);
        if (imIf(c) && toggleB) {
            if (imMemo(c, toggleB)) {
                changeEvents.push("C");
            }

            imEl(c, EL_DIV); imStr(c, "C"); imElEnd(c, EL_DIV);
        } else {
            imIfElse(c);

            if (imMemo(c, toggleB)) {
                changeEvents.push("D");
            }

            imEl(c, EL_DIV); imStr(c, "D"); imElEnd(c, EL_DIV);
        } imIfEnd(c);
    } imIfEnd(c);
    imEl(c, EL_DIV); {
        imStr(c, "Bro");
        imStr(c, "!");
    } imElEnd(c, EL_DIV);
}

function imErrorBoundaryExampleView(c: ImCache) {
    imEl(c, EL_H1); imStr(c, "Error boundary example"); imElEnd(c, EL_H1);

    imDivider(c);

    imEl(c, EL_DIV); {
        const tryState = imTry(c); try {
            const { err, recover } = tryState;

            if (imIf(c) && err) {
                imEl(c, EL_DIV); imStr(c, "Your component encountered an error:"); imElEnd(c, EL_DIV);
                imEl(c, EL_DIV); imStr(c, err); imElEnd(c, EL_DIV);
                // Why don't we do this for the root of the program xDD)"); imElEnd(c, EL_DIV);

                imButton(c); {
                    imStr(c, "<Undo>");
                    if (elHasMouseDown(c)) {
                        recover();
                    }
                } imButtonEnd(c);
            } else {
                imIfElse(c);

                imButton(c); {
                    imStr(c, "Red button (use your imagination for this one, apologies)");
                    if (elHasMouseDown(c)) {
                        throw new Error("nooo your not supposed to actually press it! You have now initiated the eventual heat-death of the universe.");
                    }
                } imButtonEnd(c);
            } imIfEnd(c);
        } catch (err) {
            imTryCatch(c, tryState, err);
        } imTryEnd(c, tryState);
    } imElEnd(c, EL_DIV);
}

function imRealtimeExampleView(c: ImCache) {
    imEl(c, EL_H1); imStr(c, "Realtime animations example"); imElEnd(c, EL_H1);

    imDivider(c);

    let currentExampleState; currentExampleState = imGet(c, imDivider);
    if (!currentExampleState) {
        currentExampleState = imSet(c, { example: 1 })
    }

    imEl(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "display", "flex");
            elSetStyle(c, "gap", "10px");
        }

        imButton(c); {
            imStr(c, "Sine waves");
            if (elHasMouseDown(c)) currentExampleState.example = 0;
        } imButtonEnd(c);
        imButton(c); {
            imStr(c, "Lots of thigns");
            if (elHasMouseDown(c)) currentExampleState.example = 1;
        } imButtonEnd(c);
    } imElEnd(c, EL_DIV);

    imDivider(c);

    const root = imEl(c, EL_DIV); {
        root.manualDom = true;

        // You can avoid all this by simply rerendering your whole app.
        let state; state = imGet(c, imRealtimeExampleView);
        if (!state) {
            const SIZE = 1;

            const val = {
                renderTime: 0,
                c: [] as ImCache,
                entries: [] as ImCacheEntries,
                isAnimating: false,
                rerenders: 0,
                itemsIterated: 0,
                t: 0,
                pingPong: (c: ImCache, phase: number) => {
                    const t = val.t;

                    imEl(c, EL_DIV); {
                        if (isFirstishRender(c)) {
                            elSetStyle(c, "height", SIZE + "px");
                            elSetStyle(c, "position", "relative");
                        }

                        imEl(c, EL_DIV); {
                            if (isFirstishRender(c)) {
                                elSetStyle(c, "backgroundColor", "black");
                                elSetStyle(c, "backgroundColor", "black");
                                elSetStyle(c, "position", "absolute");
                                elSetStyle(c, "top", "0");
                                elSetStyle(c, "bottom", "0");
                                elSetStyle(c, "aspectRatio", "10 / 1");
                            }

                            const pingPong = 0.5 * (1 + Math.sin((1 * ((t / 1000) + phase)) % (2 * Math.PI)));
                            elSetStyle(c, "left", "calc(" + (pingPong * 100) + "% - " + SIZE * 10 * (pingPong) + "px)");
                        } imElEnd(c, EL_DIV);

                    } imElEnd(c, EL_DIV);
                },
                animation: (dt: number) => {
                    const t = val.t;
                    val.t += dt;

                    const c = val.c;
                    val.rerenders++;

                    let t0 = performance.now();

                    const isAnimating = val.entries.length > 0 && val.entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY];

                    imCache(c);
                    imDomRoot(c, root.root); {
                        imEl(c, EL_DIV); {
                            if (isFirstishRender(c)) {
                                elSetStyle(c, "display", "flex");
                                elSetStyle(c, "gap", "10px");
                            }

                            imEl(c, EL_DIV); imStr(c, Math.round(val.renderTime) + "ms"); imElEnd(c, EL_DIV);
                            imEl(c, EL_DIV); imStr(c, val.rerenders + " rerenders"); imElEnd(c, EL_DIV);
                            imEl(c, EL_DIV); imStr(c, val.itemsIterated + " rerenders"); imElEnd(c, EL_DIV);
                            imEl(c, EL_DIV); imStr(c, stylesSet + " styles set"); imElEnd(c, EL_DIV);
                            imEl(c, EL_DIV); imStr(c, classesSet + " classes set"); imElEnd(c, EL_DIV);
                            imEl(c, EL_DIV); imStr(c, attrsSet + " attrs set"); imElEnd(c, EL_DIV);
                        } imElEnd(c, EL_DIV);

                        imEl(c, EL_DIV); {
                            imSwitch(c, currentExampleState.example); switch (currentExampleState.example) {
                                case 0: {
                                    imEl(c, EL_H1); imStr(c, "Snake sine thing idx"); imElEnd(c, EL_H1);

                                    imDivider(c);

                                    const NUM = 500 / SIZE;
                                    for (let i = 0; i < NUM; i++) {
                                        val.pingPong(c, (t / 1000) * i / NUM);
                                    }
                                } break;
                                case 1: {
                                    imEl(c, EL_H1); imStr(c, "Old framework example page bro I have spent a large percentage of my life on thhis page. .. :("); imElEnd(c, EL_H1);

                                    imDivider(c);

                                    imOldRandomStuffExampleApplication(c, t);
                                } break;
                            } imSwitchEnd(c);
                        } imElEnd(c, EL_DIV);
                    } imDomRootEnd(c, root.root);
                    imCacheEnd(c);

                    val.itemsIterated = c[CACHE_ITEMS_ITERATED];

                    if (imCacheNeedsRerender(c)) {
                        val.animation(t);
                    } else {
                        if (isAnimating) {
                            requestAnimationFrame(val.animation);
                        } else {
                            val.isAnimating = false;
                            numAnimations--;
                            requestAnimationFrame(imMain);
                            console.log("stopped animating");
                        }
                    }

                    {
                        const t = performance.now();
                        val.renderTime = t - t0;
                    }
                }
            };

            state = imSet(c, val);
        }

        // Need at least 1 imGet to be in the 
        state.entries = c[CACHE_CURRENT_ENTRIES];
        const isAnimating = state.entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY];

        if (imMemo(c, isAnimating) && !state.isAnimating) {
            console.log("started animating");
            state.isAnimating = true;
            numAnimations++;
            state.animation(0);
            c[CACHE_NEEDS_RERENDER] = true;
        }
    } imElEnd(c, EL_DIV);
}

function newWallClockState() {
    return { val: 0 };
}

function imWallClockView(c: ImCache, t: number) {
    let s = imGet(c, newWallClockState);
    if (s === undefined) s = imSet(c, newWallClockState());

    const dt = 0.02;

    s.val += (-0.5 + Math.random()) * dt;
    if (s.val > 1) s.val = 1;
    if (s.val < -1) s.val = -1;

    // The retained-mode code is actually more compact here!
    imEl(c, EL_DIV); {
        imEl(c, EL_DIV); {
            const entries = c[CACHE_CURRENT_ENTRIES];
            imStr(c, "Removed: " + entries[ENTRIES_REMOVE_LEVEL]);
            imStr(c, "In conditional path: " + entries[ENTRIES_IS_IN_CONDITIONAL_PATHWAY]);
            imMemo(c, 1);
        } imElEnd(c, EL_DIV);
    } imElEnd(c, EL_DIV);
    imEl(c, EL_DIV); {
        imStr(c, "brownian motion: " + s + "");
    } imElEnd(c, EL_DIV);
    imEl(c, EL_DIV); {
        imStr(c, "FPS: " + (1 / dt).toPrecision(2) + "");
    } imElEnd(c, EL_DIV);

    let n = s.val < 0 ? 1 : 2;
    n = 2; // TODO: revert
    imFor(c); for (let i = 0; i < n; i++) {
        imEl(c, EL_DIV); {
            imStr(c, new Date().toISOString());
        } imElEnd(c, EL_DIV);
    } imForEnd(c);
}

function imOldRandomStuffExampleApplication(c: ImCache, t: number) {
    let s = imGet(c, newAppState);
    if (!s) {
        s = imSet(c, newAppState());
        s.rerender = () => c[CACHE_NEEDS_RERENDER] = true;
    }

    const tryState = imTry(c); try {
        const { err, recover } = tryState;
        if (imIf(c) && !err) {
            imEl(c, EL_DIV); {
                if (imButtonWasClicked(c, "Click me!")) {
                    alert("noo");
                }
                imEl(c, EL_DIV); {
                    imStr(c, "Hello world! ");
                } imElEnd(c, EL_DIV);
                imEl(c, EL_DIV); {
                    imStr(c, "Lets goo");
                } imElEnd(c, EL_DIV);
                imEl(c, EL_DIV); {
                    imStr(c, "Count: " + s.count);
                } imElEnd(c, EL_DIV);
                imEl(c, EL_DIV); {
                    imStr(c, "Period: " + s.period);
                } imElEnd(c, EL_DIV);

                // sheesh. cant win with these people...
                if (imIf(c) && s.count > 1000) {
                    imEl(c, EL_DIV); {
                        imStr(c, "The count is too damn high!!");
                    } imElEnd(c, EL_DIV);
                } else if (imIfElse(c) && s.count < 1000) {
                    imEl(c, EL_DIV); {
                        imStr(c, "The count is too damn low !!");
                    } imElEnd(c, EL_DIV);
                } else {
                    imIfElse(c);
                    imEl(c, EL_DIV); {
                        imStr(c, "The count is too perfect!!");
                    } imElEnd(c, EL_DIV);
                } imIfEnd(c);
                imEl(c, EL_DIV); {
                    if (isFirstishRender(c)) {
                        elSetAttr(c, "style", "height: 5px; background-color: black");
                    }
                } imElEnd(c, EL_DIV);
                imEl(c, EL_DIV); {
                    if (isFirstishRender(c)) {
                        elSetAttr(c, "style", "padding: 10px; border: 1px solid black; display: inline-block");
                    }

                    if (s.count < 500) {
                        // throw new Error("The count was way too low my dude");
                    }

                    if (imIf(c) && s.count < 2000) {
                        imWallClockView(c, t);
                    } imIfEnd(c);
                } imElEnd(c, EL_DIV);
            } imElEnd(c, EL_DIV);


            imEl(c, EL_DIV); {
                if (isFirstishRender(c)) {
                    elSetStyle(c, "display", "flex");
                    elSetStyle(c, "height", "4em");
                }

                const n = 20;
                let pingPong; pingPong = imGet(c, inlineTypeId(imEl));
                if (!pingPong) pingPong = imSet(c, { pos: 0, dir: 1 });

                if (pingPong.pos === 0) {
                    pingPong.dir = 1;
                } else if (pingPong.pos === n) {
                    pingPong.dir = -1;
                }
                if (pingPong.pos < n || pingPong.pos > 0) {
                    pingPong.pos += pingPong.dir;
                }

                imFor(c); for (let i = 0; i <= n; i++) {
                    imEl(c, EL_DIV); {
                        if (isFirstishRender(c)) {
                            elSetStyle(c, "flex", "1");
                            elSetStyle(c, "height", "100%");
                        }

                        const present = i === pingPong.pos;
                        const changed = imMemo(c, present);
                        if (changed) {
                            // elSetStyle(c, "backgroundColor", present ? "#000" : "#FFF");
                        }
                    } imElEnd(c, EL_DIV);
                } imForEnd(c);
            } imElEnd(c, EL_DIV);

            let gridState = imGet(c, newGridState);
            if (!gridState) gridState = imSet(c, newGridState());

            if (imIf(c) && s.grid === GRID_FRAMEWORK) {
                const dt = 0.03;
                const { values, gridRows, gridCols } = gridState;

                imEl(c, EL_DIV); imStr(c, "Grid size: " + gridState.gridRows * gridState.gridCols); imElEnd(c, EL_DIV);

                // NOTE: static list for performance. the grid size never changes. xD
                imFor(c); for (let row = 0; row < gridRows; row++) {
                    imEl(c, EL_DIV); {
                        if (isFirstishRender(c)) {
                            elSetAttr(c, "style", "display: flex;");
                        }

                        imFor(c); for (let col = 0; col < gridCols; col++) {
                            imEl(c, EL_DIV); {
                                if (isFirstishRender(c)) {
                                    elSetStyle(c, "position", " relative");
                                    elSetStyle(c, "display", " inline-block");
                                    elSetStyle(c, "width", " 100px");
                                    elSetStyle(c, "height", " 100px");
                                    elSetStyle(c, "aspectRatio", "1 / 1");
                                    elSetStyle(c, "border", " 1px solid red");
                                }

                                const idx = col + gridCols * row;

                                if (elHasMouseOver(c)) {
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
                                const styleChanged = imMemo(c, valRounded);
                                if (styleChanged) {
                                    const r = elGet(c);
                                    // r.style.backgroundColor = `rgba(0, 0, 0, ${val})`;
                                    elSetStyle(c, "backgroundColor", `rgba(0, 0, 0, ${val})`);
                                }

                                // imEl(c, EL_DIV); {
                                //     if (imIsFirstishRender()) {
                                //         setStyle("position", "absolute");
                                //         setStyle("top", "25%");
                                //         setStyle("left", "25%");
                                //         setStyle("right", "25%");
                                //         setStyle("bottom", "25%");
                                //         setStyle("backgroundColor", "white");
                                //     }
                                // } imEnd();
                            } imElEnd(c, EL_DIV);
                        } imForEnd(c);
                    } imElEnd(c, EL_DIV);
                } imForEnd(c);
            } else if (imIfElse(c) && s.grid === GRID_MOST_OPTIMAL) {
                imEl(c, EL_DIV); imStr(c,
                    "[Theoretical best performance upperbound with our current approach]  Grid size: " + gridState.gridRows * gridState.gridCols
                ); imElEnd(c, EL_DIV);

                const root = imEl(c, EL_DIV); {
                    root.manualDom = true;

                    const dt = 0.02;
                    const { values, gridRows, gridCols } = gridState;

                    const gridRowsChanged = imMemo(c, gridRows);
                    const gridColsChanged = imMemo(c, gridCols);

                    let state; state = imGet(c, inlineTypeId(newGridState));
                    if (!state || gridRowsChanged || gridColsChanged) {
                        // This bit is not quite optimal. Thats ok though - we put slop behind infrequent signals all the time.

                        if (!state) state = imSet<{
                            rows: {
                                root: HTMLElement;
                                children: {
                                    root: HTMLElement;
                                    idx: number;
                                    lastSignal: number;
                                }[];
                            }[];
                        }>(c, { rows: [] });

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

                                child.style.position = " relative";
                                child.style.display = " inline-block";
                                child.style.width = " 100px";
                                child.style.height = " 100px";
                                child.style.aspectRatio = "1 / 1";
                                child.style.border = " 1px solid red";
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
                                pixel.root.style.backgroundColor = `rgba(0, 0, 0, ${val})`;
                            }
                        }
                    }
                } imElEnd(c, EL_DIV);
            } imIfEnd(c);

            imEl(c, EL_DIV); {
                if (isFirstishRender(c)) {
                    elSetAttr(c, "style", `position: fixed; bottom: 10px; left: 10px`);
                }

                let period = imSlider(c, "period");
                if (period !== null) s.setPeriod(period);

                let increment = imSlider(c, "increment");
                if (increment !== null) s.setIncrement(increment);

                if (imButtonWasClicked(c, "Toggle grid")) s.toggleGrid();
                if (imButtonWasClicked(c, "Increment count")) s.incrementCount();
                if (imButtonWasClicked(c, "Decrement count")) s.decrementCount();
            }
            imElEnd(c, EL_DIV);
        } else {
            imIfElse(c);

            imEl(c, EL_DIV); {
                if (isFirstishRender(c)) {
                    elSetAttr(c, "style", `display: absolute;top:0;bottom:0;left:0;right:0;`);
                }

                imEl(c, EL_DIV); {
                    if (isFirstishRender(c)) {
                        elSetAttr(c, "style", `display: flex; flex-direction: column; align-items: center; justify-content: center;`);
                    }

                    imEl(c, EL_DIV); {
                        imStr(c, "An error occured: " + err);
                    }
                    imElEnd(c, EL_DIV);
                    imEl(c, EL_DIV); {
                        imStr(c, "Click below to retry.")
                    }
                    imElEnd(c, EL_DIV);

                    if (imButtonWasClicked(c, "Retry")) {
                        s.count = 1000;
                        recover();
                    };
                } imElEnd(c, EL_DIV);
            } imElEnd(c, EL_DIV);
        } imIfEnd(c);
    } catch (err) {
        imTryCatch(c, tryState, err);

        console.error(err);
    } imTryEnd(c, tryState);
}


function imSlider(c: ImCache, labelText: string): number | null {
    let result: number | null = null;

    const root = imEl(c, EL_DIV); {
        imEl(c, EL_LABEL); {
            if (imMemo(c, labelText)) elSetAttr(c, "for", labelText);
            imStr(c, labelText);
        }; imElEnd(c, EL_LABEL);
        const input = imEl(c, EL_INPUT); {
            if (isFirstishRender(c)) {
                elSetAttr(c, "width", "1000px");
                elSetAttr(c, "type", "range");
                elSetAttr(c, "min", "1");
                elSetAttr(c, "max", "300");
                elSetAttr(c, "step", "1");
            }

            if (imMemo(c, labelText)) elSetAttr(c, "name", labelText)
            if (imMemo(c, input.root.value)) result = input.root.valueAsNumber;
        } imElEnd(c, EL_INPUT);
    } imElEnd(c, EL_DIV);

    return result;
}




function resize(values: number[], gridRows: number, gridCols: number) {
    values.length = gridRows * gridCols;
    values.fill(0);
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
    // TODO: revert
    let gridRows = 1000;
    let gridCols = 100;
    // let gridRows = 10;
    // let gridCols = 10;
    const values: number[] = [];

    resize(values, gridRows, gridCols);

    return { gridRows, gridCols, values };
}

function imButton(c: ImCache) {
    return imEl(c, EL_BUTTON);
}

function imButtonWasClicked(c: ImCache, text: string): boolean {
    let result = false;

    imButton(c); {
        imStr(c, text);
        if (elHasMouseDown(c)) result = true;
    } imButtonEnd(c);

    return result;
}

function imButtonEnd(c: ImCache) {
    imElEnd(c, EL_BUTTON);
}

const mouseDownElements = new Set<ValidElement>();
const mouseClickedElements = new Set<ValidElement>();
const mouseOverElements = new Set<ValidElement>();
let lastMouseOverRoot: ValidElement | null = null;

function findParents(el: ValidElement, elements: Set<ValidElement>) {
    elements.clear();
    let current: ValidElement | null = el;
    while (current !== null) {
        elements.add(current);
        current = current.parentElement;
    }
}

function elHasMouseDown(c: ImCache) {
    const el = elGet(c);
    const result = mouseDownElements.has(el);
    mouseDownElements.delete(el);
    return result;
}

function elHasMouseOver(c: ImCache) {
    const el = elGet(c);
    const result = mouseOverElements.has(el);
    mouseDownElements.delete(el);
    return result;
}

function elWasClicked(c: ImCache) {
    const el = elGet(c);
    const result = mouseClickedElements.has(el);
    mouseClickedElements.delete(el);
    return result;
}

function imDivider(c: ImCache) {
    imEl(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "height", "2px");
            elSetStyle(c, "backgroundColor", "black");
        }
    } imElEnd(c, EL_DIV);
}

document.addEventListener("keydown", (e) => {
    if (e.key === "1") {
        toggleA = !toggleA;
    }
    if (e.key === "2") {
        toggleB = !toggleB;
    }

    imMain();
});


document.addEventListener("mousedown", (e: MouseEvent) => {
    findParents(e.target as ValidElement, mouseDownElements);
    imMain();
    mouseDownElements.clear();
});

document.addEventListener("click", (e: MouseEvent) => {
    findParents(e.target as ValidElement, mouseClickedElements);
    imMain();
});

document.addEventListener("mouseover", (e: MouseEvent) => {
    if (e.target !== lastMouseOverRoot) {
        console.log("Moue over");
        lastMouseOverRoot = e.target as ValidElement;
        findParents(e.target as ValidElement, mouseOverElements);
        imMain();
        // TODO: turn it back on.
    }
});


// TODO: userland code
//

/*
if (r.parentRoot !== null) {
    // The only way to know that a root is no longer removed is that
    // we have actually started rendering things underneath it.
    r.parentRoot.removeLevel = REMOVE_LEVEL_NONE;
} */

// if (r.debug === true) {
//     console.log("visibility change", r.parentRoot);
//     setClass(debug1PxSolidRed, true, r);
//     setTimeout(() => {
//         setClass(debug1PxSolidRed, false, r);
//     }, 1000);
// }
//





imMain();
