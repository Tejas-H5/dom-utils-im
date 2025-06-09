import {
    getAttr,
    imBeginDiv,
    imInit,
    setAttr,
    setClass
} from "src/utils/im-dom-utils";
import { cn } from "./utils/cssb";
import { imBeginRoot, imEnd, imTextSpan } from "./utils/im-dom-utils";

export const ROW = 1 << 0;
export const COL = 1 << 1;
export const RELATIVE = 1 << 2;
export const FLEX1 = 1 << 3;

export function imBeginLayout(flags: number = 0) {
    const root = imBeginDiv();
    setClass(cn.row, flags & ROW);
    setClass(cn.col, flags & COL);
    setClass(cn.relative, flags & RELATIVE);
    setClass(cn.flex1, flags & FLEX1);
    return root;
}

export function imInitStyles(str: string) {
    if (imInit()) {
        setAttr("style", getAttr("style") + ";" + str);
        return true;
    }
    return false;
}

export const newUl     = () => document.createElement("ul");
export const newLi     = () => document.createElement("li");
export const newH3     = () => document.createElement("h3");
export const newIFrame = () => document.createElement("iframe");
export const newA      = () => document.createElement("a");


export function imHeading(text: string) {
    imBeginRoot(newH3); {
        imInitStyles(`font-weight: bold; font-size: 2rem; text-align: center;`);
        imTextSpan(text);
    } imEnd();
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
