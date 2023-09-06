"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculate_checksum = void 0;
const utils_1 = require("./utils");
function cksum_byte(c, sum) {
    sum = (sum + c) & 0xFFFF;
    return sum;
}
function cksum_word(word, sum) {
    sum = cksum_byte((0, utils_1.lo)(word), sum);
    sum = cksum_byte((0, utils_1.hi)(word), sum);
    return sum;
}
function calculate_checksum(program, startAddress, endAddress) {
    let checksum = 0;
    for (let t = 0; t < program.length; t++) {
        checksum = cksum_byte(program[t], checksum);
    }
    checksum = cksum_word(startAddress, checksum);
    checksum = cksum_word(endAddress, checksum);
    return checksum;
}
exports.calculate_checksum = calculate_checksum;
