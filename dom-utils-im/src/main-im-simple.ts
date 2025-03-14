import { beginList, div, end, imElse, imElseIf, imIf, imOn, imRerenderable, startRendering, text } from "./utils/im-dom-utils";

let count = 0;
function App() {
    imRerenderable(rerender => {
        div(); {
            div(); {
                text("count: " + count);
            }
            end();
            imIf(count < 1, () => {
                div(); {
                    text("too low smh");
                }
                end();
            });
            imElseIf(count > 1, () => {
                div(); {
                    text("Too high");
                }
                end();
            });
            imElse(() => {
                div(); {
                    text("Finally, some good count");
                }
                end();
            });
            const l = beginList(); 
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
