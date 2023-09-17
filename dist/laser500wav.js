#!/usr/bin/env node
"use strict";
// TODO count T states, elongation in sync_tape
// TODO elonagtion after turbo header
// TODO autorun different "T" and "B"
// TODO investigate polarity inversion
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const options_1 = require("./options");
const vz_1 = require("./vz");
const tape_creator_1 = require("./tape_creator");
function main() {
    if (options_1.options.input === undefined || options_1.options.output === undefined || (options_1.options.l310 === undefined && options_1.options.l500 === undefined)) {
        (0, options_1.printHelp)();
        process.exit(0);
    }
    if (options_1.options.l310 !== undefined && options_1.options.l500 !== undefined) {
        console.log("specify only one --L option: 310 or 500");
        process.exit(0);
    }
    const VZ_file_name = options_1.options.input;
    const WAV_file_name = options_1.options.output + ".wav";
    if (!fs_1.default.existsSync(VZ_file_name)) {
        console.log(`file "${VZ_file_name}" not found`);
        process.exit(0);
    }
    const VZ_file = fs_1.default.readFileSync(VZ_file_name);
    const VZ = (0, vz_1.unpackvz)(VZ_file);
    const buffer = (0, tape_creator_1.VZ_to_WAV)(VZ, options_1.options);
    fs_1.default.writeFileSync(WAV_file_name, Buffer.from(buffer));
    let gentype = VZ.type === vz_1.VZ_BINARY ? "B: standard file" : "T: standard file";
    if (options_1.options.turbo !== 0)
        gentype = "TURBO tape";
    console.log(`file "${WAV_file_name}" generated as ${gentype}`);
}
main();
