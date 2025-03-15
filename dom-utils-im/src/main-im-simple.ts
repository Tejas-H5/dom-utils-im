import { imList, div, end, imOn, imRerenderable, nextRoot, startRendering, text } from "./utils/im-dom-utils";

let count = 0;
function App() {
    imRerenderable(rerender => {
        div(); {
            div(); {
                text("count: " + count);
            }
            end();
            imList(); {
                if (count < 1) {
                    nextRoot(1); {
                        div(); {
                            text("too low smh");
                        } end();
                    } end();
                } else if (count > 1) {
                    nextRoot(2); {
                        div(); {
                            text("Too high");
                        } end();
                    } end();
                } else {
                    nextRoot(3); {
                        div(); {
                            text("Finally, some good count");
                        }
                        end();
                    } end();
                }
            }
            end();
            const l = imList(); 
            for (let i = 0; i < count; i++) {
                l.root(); {
                    div(); {
                        text("item " + i);
                    };
                    end();
                };
                end();
            }
            end();
            div(); {
                text("click me!");
                imOn("click", () => {
                    count++;
                    rerender();
                });
            };
            end();
            div(); {
                text("dont click me! xd");
                imOn("click", () => {
                    count--;
                    rerender();
                });
            };
            end();
        };
        end();
    });
}

function rerenderApp() {
    startRendering();
    App();
}

rerenderApp();
