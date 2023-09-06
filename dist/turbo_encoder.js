"use strict";
// ************************************************************************ 
// TURBO TAPE 
// ************************************************************************ 
Object.defineProperty(exports, "__esModule", { value: true });
exports.TT_bitsToSamples = exports.getTurboBytes = exports.decodeBitSize = void 0;
const checksum_1 = require("./checksum");
const utils_1 = require("./utils");
/*
function getTurboSamples(program: Buffer, startAddress: number) {
   // turbo tape file
   const loader_program = getTurboLoader(THRESHOLD);

   console.log(`shortest pulse size is ${TURBO_BIT_SIZE} samples. THRESHOLD value is ${THRESHOLD}`);

   const loader_bytes = tapeStructure({
      tapeName: laserName,
      fileType: "T",
      startAddress,
      program: loader_program
   });

   const loader_bits = bytesToBits(loader_bytes);
   const loader_pulses = bitsToPulses(loader_bits);
   const loader_samples = pulsesToSamples(loader_pulses);

   const bytes = TT_tapeStructure(turboAddress, program);
   const bits = bytesToBits(bytes);
   samples = TT_bitsToSamples(bits);

   samples = loader_samples.concat(samples);
   return samples;
}
*/
function decodeBitSize(speed, SAMPLE_RATE) {
    speed = speed || 4;
    let threshold, size, inv, tone;
    if (speed === 1) {
        tone = 800;
        threshold = 86;
        inv = false;
    } // ? false in real machine?
    else if (speed === 2) {
        tone = 2400;
        threshold = 37;
        inv = true;
    }
    else if (speed === 3) {
        tone = 3000;
        threshold = 23;
        inv = true;
    }
    else if (speed === 4) {
        tone = 4000;
        threshold = 16;
        inv = true;
    }
    else {
        console.log("invalid turbo speed");
        process.exit(0);
    }
    size = SAMPLE_RATE / tone / 4;
    return { THRESHOLD: threshold, TURBO_BIT_SIZE: size, TURBO_INVERT: !inv };
}
exports.decodeBitSize = decodeBitSize;
function getTurboBytes(startAddress, program) {
    const bytes = [];
    // trailing byte   
    bytes.push(0x0);
    // header
    const header = [0xAA, 0x55];
    header.forEach(e => bytes.push(e));
    // TODO bank switcher?
    // start address
    bytes.push((0, utils_1.lo)(startAddress));
    bytes.push((0, utils_1.hi)(startAddress));
    // length
    const length = program.length;
    bytes.push((0, utils_1.lo)(length));
    bytes.push((0, utils_1.hi)(length));
    // program
    for (let t = 0; t < program.length; t++)
        bytes.push(program[t]);
    // checksum
    const checksum = (0, checksum_1.calculate_checksum)(program, startAddress, length);
    bytes.push((0, utils_1.lo)(checksum));
    bytes.push((0, utils_1.hi)(checksum));
    // terminator
    bytes.push(0x00);
    console.log("TURBO TAPE INFO:");
    console.log(`address: ${startAddress.toString(16)}`);
    console.log(`length: ${length.toString(16)}`);
    console.log(`checksum: ${checksum.toString(16)}`);
    return bytes;
}
exports.getTurboBytes = getTurboBytes;
function TT_bitsToSamples(bits, tape) {
    const { ELONGATION, SAMPLE_RATE, TURBO_BIT_SIZE, TURBO_INVERT, VOLUME } = tape;
    const pulses = [];
    const elongations = [];
    const elong_size = ELONGATION * SAMPLE_RATE;
    let last_bit = 0;
    for (let t = 0; t < bits.length; t++) {
        const b = bits[t];
        if (b === 1) {
            // 1=SHORT pulse
            pulses.push(1);
            elongations.push(t % 8 === 0 ? elong_size : 0);
            pulses.push(0);
            elongations.push(0);
        }
        else {
            // 0=LONG pulse
            pulses.push(1);
            elongations.push(t % 8 === 0 ? elong_size : 0);
            pulses.push(1);
            elongations.push(0);
            pulses.push(0);
            elongations.push(0);
            pulses.push(0);
            elongations.push(0);
        }
    }
    // turn pulses into samples
    const samples = [];
    let ptr = 0;
    for (let t = 0; t < pulses.length; t++) {
        const b = pulses[t];
        const s = (b == 0) ? -VOLUME : VOLUME;
        const pixelsize = TURBO_BIT_SIZE + elongations[t];
        while (ptr < pixelsize) {
            samples.push(TURBO_INVERT ? -s : s);
            ptr++;
        }
        ptr -= pixelsize;
    }
    return samples;
}
exports.TT_bitsToSamples = TT_bitsToSamples;
function TT_dumpBits(samples) {
    console.log(`const tape = [`);
    let s = samples.map(s => s < 0 ? "0" : "1").join(",");
    console.log(s);
    console.log("]; module.exports = { tape };");
}
