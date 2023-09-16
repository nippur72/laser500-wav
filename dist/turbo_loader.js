"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTurboLoader = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bytes_1 = require("./bytes");
// get the Z80 turbo loader routine, patching two bytes and
// relocating it at the desidered address
function getTurboLoader(laser500, THRESHOLD, relocate_address, fileType) {
    const rootname = path_1.default.resolve(__dirname, laser500 ? "../turbo_tape/turbo_L500" : "../turbo_tape/turbo_L310");
    const loader_program = fs_1.default.readFileSync(`${rootname}.bin`);
    patch_bytes(loader_program, THRESHOLD, fileType, rootname);
    relocate(loader_program, relocate_address, rootname);
    // for debug purposes
    {
        const symbols = fs_1.default.readFileSync(`${rootname}.sym`).toString();
        let set_threshold = getSymbolAddress(symbols, "set_threshold") + relocate_address;
        console.log(`const label_set_threshold = 0x${(0, bytes_1.hex)(set_threshold, 4)};`);
        let loop_file = getSymbolAddress(symbols, "loop_file") + relocate_address;
        console.log(`const label_loop_file = 0x${(0, bytes_1.hex)(loop_file, 4)};`);
        let autorun = getSymbolAddress(symbols, "autorun") + relocate_address;
        console.log(`const label_autorun = 0x${(0, bytes_1.hex)(autorun, 4)};`);
    }
    return loader_program;
}
exports.getTurboLoader = getTurboLoader;
function patch_bytes(loader_program, THRESHOLD, fileType, rootname) {
    // read turbo.sym symbol files
    const symbols = fs_1.default.readFileSync(`${rootname}.sym`).toString();
    // do the needed byte patches
    loader_program[getSymbolAddress(symbols, "turbo_load") + 1] = fileType;
    loader_program[getSymbolAddress(symbols, "set_threshold") + 1] = THRESHOLD;
}
function getSymbolAddress(file, symbolname) {
    const regex = new RegExp(symbolname + "\\s*=\\s*\\$(?<address>[0-9a-fA-F]{4})", "g");
    const match = regex.exec(file);
    if (match === null || match.groups === undefined)
        throw `can't find ${symbolname} label in .sym file`;
    // get label address from hex format
    const address = Number.parseInt(match.groups["address"], 16);
    return address;
}
// relocate the Z80 turbo loader routine at the desidered
// destination by changing all the interested addresses.
// .reloc file is created by the assembler and it's a list 
// of offsets (16 bits) that needs to be changed
function relocate(loader_program, relocate_address, rootname) {
    const reloc_info = fs_1.default.readFileSync(`${rootname}.reloc`);
    for (let t = 0; t < reloc_info.length; t += 2) {
        const patch_address = reloc_info.readUInt16LE(t);
        const offset_value = loader_program.readUInt16LE(patch_address);
        const relocated_value = offset_value + relocate_address;
        loader_program.writeUInt16LE(relocated_value, patch_address);
        //console.log(`${t}: [${patch_address}] = ${offset_value.toString(16)} -> ${relocated_value.toString(16)}`);         
    }
}
