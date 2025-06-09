import {
    getAttr,
    imBeginDiv,
    imInit,
    setAttr,
    setClass
} from "src/utils/im-dom-utils";
import { cn } from "./utils/cssb";

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

