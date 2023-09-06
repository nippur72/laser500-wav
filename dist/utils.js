"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hi = exports.lo = void 0;
function lo(word) {
    return word & 0xff;
}
exports.lo = lo;
function hi(word) {
    return (word >> 8) & 0xff;
}
exports.hi = hi;
