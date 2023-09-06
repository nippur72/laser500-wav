#!/usr/bin/env node
"use strict";
// TODO turbo tape flush tail ?
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const wav_encoder_1 = __importDefault(require("wav-encoder"));
const options_1 = require("./options");
const turbo_loader_1 = require("./turbo_loader");
const utils_1 = require("./utils");
const checksum_1 = require("./checksum");
const turbo_encoder_1 = require("./turbo_encoder");
function main() {
    if (options_1.options.input === undefined) {
        console.log("Usage: laser500wav -i file -o file [options]");
        console.log("  -i or --input file          the file to be converted in WAV");
        console.log("  -o or --output file         the file name to be created");
        console.log("  -b or --binary              generates a 'B:' standard binary file");
        console.log("  -t or --text                generates a 'T:' standard BASIC text file (default)");
        console.log("  -n or --name name           specify name to be shown during CLOAD");
        console.log("  --address hexaddress        address in memory where to load the file (0x8995 default)");
        console.log("  -s or --samplerate rate     the samplerate of the WAV file (96000 default)");
        console.log("  -v or --volume number       volume between 0 and 1 (1.0 default)");
        console.log("  --stereoboost               boost volume for stereo cables by inverting the RIGHT channel");
        console.log("  --invert                    inverts the polarity of the audio");
        console.log("  --header                    number of header bytes (128 default as in ROM loader)");
        console.log("  -x or --turbo               generates a turbo tape loadable file");
        console.log("  --turbo-address hexaddress  address in memory of the turbo tape file (0x8995 default)");
        console.log("  --turbo-speed speed         speed 1,2,3,4 defaults to 4 (fastest)");
        process.exit(0);
    }
    // note on SAMPLE_RATE: when using turbo tape 48000 Hz is the minimum to work
    // on the real machine. One the emulator the minimum is 18000 Hz
    const SAMPLE_RATE = options_1.options.samplerate || 96000;
    const VOLUME = options_1.options.volume || 1.0;
    const HEADER_LEN = options_1.options.header || 128;
    const TAIL_LEN = 4; // 128; // TODO make it option?   
    const PULSE_SHORT = (0.277 / 1000) * SAMPLE_RATE; // for a total of 277 microseconds
    const PULSE_LONG = PULSE_SHORT * 2;
    const { THRESHOLD, TURBO_BIT_SIZE, TURBO_INVERT } = (0, turbo_encoder_1.decodeBitSize)(options_1.options['turbo-speed'], SAMPLE_RATE);
    const ELONGATION = 120 / 3670200; // about 120 t-states to add after a byte is completed
    const fileName = options_1.options.input;
    const startAddress = (options_1.options.address && !options_1.options.turbo) || 0x8995;
    const turboAddress = options_1.options['turbo-address'] || 0x8995;
    if (options_1.options.turbo)
        console.log(`turbo start address = 0x${turboAddress.toString(16)}`);
    else
        console.log(`start address = 0x${startAddress.toString(16)}`);
    const fileNameWithoutExtension = path_1.default.parse(fileName).name;
    const tapeName = options_1.options.name || fileNameWithoutExtension;
    if (tapeName.length > 15) {
        // max is 15 chars + \0
        console.log(`'${tapeName}' tape name too long`);
        process.exit(0);
    }
    const outputName = options_1.options.output || fileNameWithoutExtension;
    const wavName = outputName + ".wav";
    if (!fs_1.default.existsSync(fileName)) {
        console.log(`file "${fileName}" not found`);
        process.exit(0);
    }
    const program = fs_1.default.readFileSync(fileName);
    const fileType = options_1.options.text ? "T" : options_1.options.binary ? "B" : "T";
    const tape = {
        tapeName,
        fileType,
        startAddress,
        program,
        headerLen: HEADER_LEN,
        tailLen: TAIL_LEN,
        PULSE_SHORT: PULSE_SHORT,
        PULSE_LONG: PULSE_LONG,
        SAMPLE_RATE: SAMPLE_RATE,
        VOLUME: VOLUME,
        SILENCE_START: 0.01,
        SILENCE_END: 0.01,
        THRESHOLD,
        TURBO_BIT_SIZE,
        TURBO_INVERT,
        ELONGATION
    };
    let samples;
    // normal tape
    if (options_1.options.turbo === undefined) {
        samples = getNormalSamples(tape);
    }
    else {
        samples = getTurboSamples(tape);
    }
    // invert audio samples if --invert option was given
    if (options_1.options.invert)
        samples = invertSamples(samples);
    const f_samples = new Float32Array(samples);
    const f_samples_inv = new Float32Array(invertSamples(samples));
    const wavData = {
        sampleRate: SAMPLE_RATE,
        channelData: !options_1.options.stereoboost ? [f_samples] : [f_samples, f_samples_inv]
    };
    const wavoptions = { bitDepth: 16, float: false, symmetric: false };
    const buffer = wav_encoder_1.default.encode.sync(wavData, wavoptions);
    fs_1.default.writeFileSync(wavName, Buffer.from(buffer));
    let gentype = fileType === "B" ? "B: standard file" : "T: standard file";
    if (options_1.options.turbo !== undefined)
        gentype = "TURBO tape";
    console.log(`file "${wavName}" generated as ${gentype}`);
}
// ***************************************************************************************
function getNormalSamples(tape) {
    const bytes = tapeStructure(tape);
    const bits = bytesToBits(bytes);
    const pulses = bitsToPulses(bits);
    const samples = pulsesToSamples(pulses, tape);
    return samples;
}
function getTurboSamples(tape) {
    const { startAddress, program } = tape;
    const turbo_address = startAddress + program.length;
    const loader_program = (0, turbo_loader_1.getTurboLoader)(tape.THRESHOLD, turbo_address);
    tape.fileType = "B";
    tape.startAddress = turbo_address;
    tape.program = loader_program;
    const bytes = tapeStructure(tape);
    const bits = bytesToBits(bytes);
    const pulses = bitsToPulses(bits);
    const samples = pulsesToSamples(pulses, tape);
    const turbo_bytes = (0, turbo_encoder_1.getTurboBytes)(startAddress, program);
    const turbo_bits = bytesToBits(turbo_bytes);
    const turbo_samples = (0, turbo_encoder_1.TT_bitsToSamples)(turbo_bits, tape);
    const total_samples = samples.concat(turbo_samples);
    return total_samples;
}
function invertSamples(samples) {
    return samples.map(e => -e);
}
function tapeStructure(tape) {
    const bytes = [];
    const { tapeName, fileType, startAddress, program, headerLen, tailLen } = tape;
    // header   
    for (let t = 0; t < headerLen; t++)
        bytes.push(0x80);
    for (let t = 0; t < 5; t++)
        bytes.push(0xfe);
    // file type
    if (fileType == "T")
        bytes.push(0xf0);
    else
        bytes.push(0xf1);
    // file name
    for (let t = 0; t < tapeName.length; t++)
        bytes.push(tapeName.charCodeAt(t));
    bytes.push(0x00);
    // header2
    for (let t = 0; t < 5; t++)
        bytes.push(0x80); // additional header to allow print of file name
    for (let t = 0; t < 10; t++)
        bytes.push(0x80);
    bytes.push(0xff);
    // start address
    bytes.push((0, utils_1.lo)(startAddress));
    bytes.push((0, utils_1.hi)(startAddress));
    // end address
    const endAddress = startAddress + program.length;
    bytes.push((0, utils_1.lo)(endAddress));
    bytes.push((0, utils_1.hi)(endAddress));
    // program
    for (let t = 0; t < program.length; t++)
        bytes.push(program[t]);
    // checksum 
    const checksum = (0, checksum_1.calculate_checksum)(program, startAddress, endAddress);
    bytes.push((0, utils_1.lo)(checksum));
    bytes.push((0, utils_1.hi)(checksum));
    // terminator
    for (let t = 0; t < tailLen; t++)
        bytes.push(0x00);
    return bytes;
}
function bytesToBits(bytes) {
    const bits = [];
    for (let t = 0; t < bytes.length; t++) {
        const b = bytes[t];
        bits.push((b & 128) >> 7);
        bits.push((b & 64) >> 6);
        bits.push((b & 32) >> 5);
        bits.push((b & 16) >> 4);
        bits.push((b & 8) >> 3);
        bits.push((b & 4) >> 2);
        bits.push((b & 2) >> 1);
        bits.push((b & 1) >> 0);
    }
    return bits;
}
function bitsToPulses(bits) {
    const pulses = [];
    for (let t = 0; t < bits.length; t++) {
        const b = bits[t];
        if (b == 0) {
            pulses.push("S");
            pulses.push("L"); /*tapeBits.push(1); tapeBits.push(0); tapeBits.push(1); tapeBits.push(1); tapeBits.push(0); tapeBits.push(0);*/
        }
        else {
            pulses.push("S");
            pulses.push("S");
            pulses.push("S"); /*tapeBits.push(1); tapeBits.push(0); tapeBits.push(1); tapeBits.push(0); tapeBits.push(1); tapeBits.push(0);*/
        }
    }
    return pulses;
}
function pulsesToSamples(tapeBits, tape) {
    const samples = [];
    let ptr = 0;
    const { SAMPLE_RATE, VOLUME, PULSE_LONG, PULSE_SHORT, SILENCE_START, SILENCE_END } = tape;
    const sstart = SILENCE_START * SAMPLE_RATE;
    const send = SILENCE_END * SAMPLE_RATE;
    // insert silence at start
    for (let t = 0; t < sstart; t++)
        samples.push(0);
    for (let t = 0; t < tapeBits.length; t++) {
        if (tapeBits[t] === "S") {
            for (; ptr < PULSE_SHORT; ptr++)
                samples.push(VOLUME);
            ptr -= PULSE_SHORT;
            for (; ptr < PULSE_SHORT; ptr++)
                samples.push(-VOLUME);
            ptr -= PULSE_SHORT;
        }
        else {
            for (; ptr < PULSE_LONG; ptr++)
                samples.push(VOLUME);
            ptr -= PULSE_LONG;
            for (; ptr < PULSE_LONG; ptr++)
                samples.push(-VOLUME);
            ptr -= PULSE_LONG;
        }
    }
    // insert silence at end
    for (let t = 0; t < send; t++)
        samples.push(0);
    return samples;
}
main();
