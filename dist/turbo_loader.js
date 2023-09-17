"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTurboLoader = void 0;
const bytes_1 = require("./bytes");
const turbo_L310_asm_info_1 = require("./turbo_L310_asm_info");
const turbo_L500_asm_info_1 = require("./turbo_L500_asm_info");
// get the Z80 turbo loader routine, patching two bytes and
// relocating it at the desidered address
function getTurboLoader(laser500, THRESHOLD, relocate_address, fileType) {
    const asm_info = laser500 ? turbo_L500_asm_info_1.turbo_L500_asm_info : turbo_L310_asm_info_1.turbo_L310_asm_info;
    const loader_program = asm_info.code;
    patch_bytes(loader_program, THRESHOLD, fileType, asm_info);
    const relocated = relocate(loader_program, relocate_address, asm_info);
    console.log(`turbo loader routine at ${(0, bytes_1.hex)(relocate_address, 4)}-${(0, bytes_1.hex)(relocate_address + loader_program.length - 1, 4)}`);
    // for debug purposes
    {
        let set_threshold = asm_info.symbols["set_threshold"] + relocate_address;
        console.log(`const label_set_threshold = 0x${(0, bytes_1.hex)(set_threshold, 4)};`);
        let loop_file = asm_info.symbols["loop_file"] + relocate_address;
        console.log(`const label_loop_file = 0x${(0, bytes_1.hex)(loop_file, 4)};`);
        let autorun = asm_info.symbols["autorun"] + relocate_address;
        console.log(`const label_autorun = 0x${(0, bytes_1.hex)(autorun, 4)};`);
    }
    return relocated;
}
exports.getTurboLoader = getTurboLoader;
function patch_bytes(loader_program, THRESHOLD, fileType, info) {
    loader_program[info.symbols.turbo_load + 1] = fileType; // patches the file type B: or T:
    loader_program[info.symbols.set_threshold + 1] = THRESHOLD; // patches the turbo speed threshold
}
// relocate the Z80 turbo loader routine at the desidered
// destination by changing all the interested addresses.
// .reloc file is created by the assembler and it's a list 
// of offsets (16 bits) that needs to be changed
function relocate(loader_program, relocate_address, asm_info) {
    const reloc_table = asm_info.reloc;
    const lp = Buffer.from(loader_program);
    for (let t = 0; t < reloc_table.length; t++) {
        const index = reloc_table[t];
        const address = lp.readUInt16LE(index);
        const relocated_value = address + relocate_address;
        lp.writeUInt16LE(relocated_value, index);
    }
    return lp;
}
