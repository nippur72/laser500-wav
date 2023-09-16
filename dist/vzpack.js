#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const command_line_args_1 = __importDefault(require("command-line-args"));
const vz_1 = require("./vz");
const options = parseOptions([
    { name: 'input', alias: 'i', type: String },
    { name: 'text', alias: 't', type: Boolean },
    { name: 'binary', alias: 'b', type: Boolean },
    { name: 'output', alias: 'o', type: String },
    { name: 'name', alias: 'n', type: String },
    { name: 'address', alias: 'a', type: Number },
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
        console.log("Usage: vzpack -i binaryfile -o vzfile [options]");
        console.log("  -i or --input file          the source file to be put into the VZ container");
        console.log("  -o or --output file         the vz output file");
        console.log("  -b or --binary              generates a binary file VZ file");
        console.log("  -t or --text                generates a text VZ file");
        console.log("  -n or --name name           file name shown in CLOAD");
        console.log("  --address hexaddress        address in memory where to load the file");
        process.exit(0);
    }
    if (options.name === undefined) {
        console.log(`specify -n name`);
        process.exit(0);
    }
    if (options.name > 15) {
        // max is 15 chars + \0
        console.log(`'${options.name}' name too long`);
        process.exit(0);
    }
    let fileType;
    let address = 0x8995; // 7AE9 on VZ
    if (options.binary)
        fileType = vz_1.VZ_BINARY;
    else if (options.text)
        fileType = vz_1.VZ_BASIC;
    else {
        console.log(`specify -b or -t`);
        process.exit(0);
    }
    if (options.address)
        address = Number.parseInt(options.address, 16);
    const file = fs_1.default.readFileSync(options.input);
    const VZ = (0, vz_1.packvz)(options.name, fileType, address, file);
    fs_1.default.writeFileSync(options.output, VZ);
    console.log(`${options.output} file created`);
}
main();
