#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const command_line_args_1 = __importDefault(require("command-line-args"));
const vz_1 = require("./vz");
const bytes_1 = require("./bytes");
const options = parseOptions([
    { name: 'input', alias: 'i', type: String },
    { name: 'output', alias: 'o', type: String },
]);
function parseOptions(optionDefinitions) {
    try {
        return (0, command_line_args_1.default)(optionDefinitions);
    }
    catch (ex) {
        if (ex.message !== undefined)
            console.log(ex.message);
        else
            console.log(ex);
        process.exit(-1);
    }
}
function main() {
    if (options.input === undefined || options.output === undefined) {
        console.log("Usage: vzpack -i vzfile -o binaryfile");
        console.log("  -i or --input file          the vz file to unpack");
        console.log("  -o or --output file         the output binary file");
        process.exit(0);
    }
    let VZ = fs_1.default.readFileSync(options.input);
    const info = (0, vz_1.unpackvz)(VZ);
    let destname = `${options.output}.${info.filename}.${info.type == vz_1.VZ_BASIC ? "T" : "B"}.${(0, bytes_1.hex)(info.start, 4)}.bin`;
    fs_1.default.writeFileSync(destname, info.data);
    console.log(`${destname} file created`);
}
main();
