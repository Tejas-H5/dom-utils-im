import { imBeginRoot, } from "./utils/im-utils-core";
import { imInitStyles } from "./components/core/layout";

const newH3 = () => document.createElement("h3");

export function imH3() {
    imBeginRoot(newH3); {
        imInitStyles(`font-weight: bold; font-size: 2rem; text-align: center;`);
    };
}

export type ViewableError = { error: string; stack: string; };

export function toViewableError(e: any): ViewableError {
    let val: ViewableError = {
        error: "" + e,
        stack: "",
    };

    if (e instanceof Error && e.stack) {
        val.stack = e.stack
            .split("\n")
            .filter(line => !line.includes("FrameRequestCallback"))
            .join("\n");
    }

    return val;
}
