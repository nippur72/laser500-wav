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
        console.log("Usage: laser500wav -i file -o file [options]");
        console.log("  -i or --input file          the VZ file to be converted in WAV");
        console.log("  -o or --output file         the file name to be created");
        console.log("  --l500                      targets Laser 500/700");
        console.log("  --l310                      targets Laser 110/210/310 VZ 200/300");
        console.log("  -s or --samplerate rate     the samplerate of the WAV file (96000 default)");
        console.log("  -v or --volume number       volume between 0 and 1 (1.0 default)");
        console.log("  --stereoboost               boost volume for stereo cables by inverting the RIGHT channel (default off)");
        console.log("  --invert                    inverts the polarity of the audio (default off)");
        console.log("  --header                    number of header bytes (128 default as in ROM loader)");
        console.log("  --pulsems n                 ROM loader pulse width in microseconds (277 default)");
        console.log("  -x or --turbo speed         0=normal ROM loader WAV, 1-4 turbo tape (4 fastest)");
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
