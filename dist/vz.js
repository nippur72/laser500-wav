"use strict";
/*
typedef struct vzFile
{
    byte	vzmagic[4];    // VZF0
    byte	filename[17];
    byte	ftype;         // 0xF0 or 0xF1
    byte	start_addrl;
    byte	start_addrh;
} VZFILE;
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.unpackvz = exports.packvz = exports.VZ_BINARY = exports.VZ_BASIC = void 0;
const bytes_1 = require("./bytes");
exports.VZ_BASIC = 0xF0;
exports.VZ_BINARY = 0xF1;
function packvz(filename, type, start, data) {
    console.assert(type == exports.VZ_BASIC || type == exports.VZ_BINARY, `unknown VZ data type ${(0, bytes_1.hex)(type)}`);
    const VZ = [];
    // VZ header
    (0, bytes_1.stringToUint8)("VZF0").forEach(e => VZ.push(e));
    // file name
    let fname = (filename + "\0".repeat(18)).substr(0, 17);
    (0, bytes_1.stringToUint8)(fname).forEach(e => VZ.push(e));
    // VZ type
    VZ.push(type);
    // start address
    VZ.push((0, bytes_1.lo)(start));
    VZ.push((0, bytes_1.hi)(start));
    // VZ data
    data.forEach(e => VZ.push(e));
    return new Uint8Array(VZ);
}
exports.packvz = packvz;
function unpackvz(vz) {
    // TODO check header
    const header = (0, bytes_1.uint8ToString)(vz.slice(0, 4));
    const start = vz[22] + vz[23] * 256;
    const data = vz.slice(24);
    const type = vz[21];
    if (type != exports.VZ_BASIC && type != exports.VZ_BINARY)
        throw `unknown VZ data type ${(0, bytes_1.hex)(type)}`;
    let filename = "";
    for (let t = 0; t < 16; t++) {
        let c = vz[t + 4];
        if (c == 0)
            break;
        filename += String.fromCharCode(c);
    }
    return { filename, type, start, data };
}
exports.unpackvz = unpackvz;
