import {
    imDiv,
    imInit,
    setAttr,
    setClass
} from "src/utils/im-dom-utils";
import { cn } from "./utils/dom-utils";

export const ROW = 1 << 0;
export const COL = 1 << 1;

export function imLayout(flags: number = 0) {
    imDiv();
    setClass(cn.row, flags & ROW);
    setClass(cn.col, flags & COL);
}

export function imInitStyles(str: string) {
    if (imInit()) {
        setAttr("style", str);
    }
}

