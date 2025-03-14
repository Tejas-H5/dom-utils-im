import { div, imElse, imElseIf, imIf, imList, imOn, imRerenderable, startRendering, text } from "./utils/im-dom-utils";

let count = 0;
function App() {
    imRerenderable(rerender => {
        div(() => {
            div(() => {
                text("count: " + count);
            });
            imIf(count < 1, () => {
                div(() => {
                    text("too low smh");
                })
            });
            imElseIf(count > 1, () => {
                div(() => {
                    text("Too high");
                })
            });
            imElse(() => {
                div(() => {
                    text("Finally, some good count");
                })
            });
            imList(l => {
                for (let i = 0; i < count; i++) {
                    l.withRoot(() => {
                        div(() => {
                            text("item " + i);
                        });
                    });
                }
            });
            div(() => {
                text("click me!");
                imOn("click", () => {
                    count++;
                    rerender();
                });
            });
            div(() => {
                text("dont click me! xd");
                imOn("click", () => {
                    count--;
                    rerender();
                });
            });
        });
    });
}

function rerenderApp() {
    startRendering();
    App();
}

rerenderApp();
