"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VZ_to_WAV = void 0;
const bytes_1 = require("./bytes");
const checksum_1 = require("./checksum");
const turbo_encoder_1 = require("./turbo_encoder");
const turbo_loader_1 = require("./turbo_loader");
const vz_1 = require("./vz");
const wav_encoder_1 = __importDefault(require("wav-encoder"));
function getNormalSamples(tape) {
    const { header_bytes, body_bytes } = tapeStructure(tape);
    // header
    const header_bits = bytesToBits(header_bytes);
    const header_pulses = bitsToPulses(header_bits);
    const header_samples = pulsesToSamples(header_pulses, tape);
    // gap between header and body in Laser310
    let gap = tape.laser500 ? [] : getGapSamples(tape);
    // body
    const body_bits = bytesToBits(body_bytes);
    const body_pulses = bitsToPulses(body_bits);
    const body_samples = pulsesToSamples(body_pulses, tape);
    const samples = header_samples.concat(gap).concat(body_samples);
    return samples;
}
function getTurboSamples(tape, turbo) {
    const { startAddress, program } = tape;
    const turbo_address = startAddress + program.length;
    const loader_program = (0, turbo_loader_1.getTurboLoader)(tape.laser500, turbo.THRESHOLD, turbo_address, tape.fileType);
    tape.fileType = vz_1.VZ_BINARY;
    tape.startAddress = turbo_address;
    tape.program = loader_program;
    const { header_bytes, body_bytes } = tapeStructure(tape);
    const header_bits = bytesToBits(header_bytes);
    const header_pulses = bitsToPulses(header_bits);
    const header_samples = pulsesToSamples(header_pulses, tape);
    // gap between header and body in Laser310
    let gap = tape.laser500 ? [] : getGapSamples(tape);
    // body
    const body_bits = bytesToBits(body_bytes);
    const body_pulses = bitsToPulses(body_bits);
    const body_samples = pulsesToSamples(body_pulses, tape);
    const turbo_bytes = (0, turbo_encoder_1.getTurboBytes)(startAddress, program);
    const turbo_bits = bytesToBits(turbo_bytes);
    const turbo_samples = (0, turbo_encoder_1.TT_bitsToSamples)(turbo_bits, tape, turbo);
    const samples = header_samples.concat(gap).concat(body_samples).concat(turbo_samples);
    return samples;
}
function invertSamples(samples) {
    return samples.map(e => -e);
}
function tapeStructure(tape) {
    const header_bytes = [];
    const body_bytes = [];
    const { tapeName, fileType, startAddress, program, headerLen, tailLen, laser500 } = tape;
    // header   
    for (let t = 0; t < headerLen; t++)
        header_bytes.push(0x80);
    for (let t = 0; t < 5; t++)
        header_bytes.push(0xfe);
    // file type
    header_bytes.push(fileType);
    // file name
    for (let t = 0; t < tapeName.length; t++)
        header_bytes.push(tapeName.charCodeAt(t));
    header_bytes.push(0x00);
    if (laser500) {
        // laser 500 has additional bytes and a marker to allow print of file name      
        // laser 310 elongates the last pulse of the "0" bit to allow print of file name      
        for (let t = 0; t < 5; t++)
            header_bytes.push(0x80); // additional header to allow print of file name
        for (let t = 0; t < 10; t++)
            header_bytes.push(0x80);
        header_bytes.push(0xff); // end of header          
    }
    // start address
    body_bytes.push((0, bytes_1.lo)(startAddress));
    body_bytes.push((0, bytes_1.hi)(startAddress));
    // end address
    const endAddress = startAddress + program.length;
    body_bytes.push((0, bytes_1.lo)(endAddress));
    body_bytes.push((0, bytes_1.hi)(endAddress));
    // program
    for (let t = 0; t < program.length; t++)
        body_bytes.push(program[t]);
    // checksum 
    const checksum = (0, checksum_1.calculate_checksum)(program, startAddress, endAddress);
    body_bytes.push((0, bytes_1.lo)(checksum));
    body_bytes.push((0, bytes_1.hi)(checksum));
    // terminator
    for (let t = 0; t < tailLen; t++)
        body_bytes.push(0x00);
    return { header_bytes, body_bytes };
}
function bytesToBits(bytes) {
    const bits = [];
    for (let t = 0; t < bytes.length; t++) {
        const b = bytes[t] & 0xFF;
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
    const { SAMPLE_RATE, VOLUME, PULSE_LONG, PULSE_SHORT } = tape;
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
    return samples;
}
function getGapSamples(tape) {
    const samples = [];
    let ptr = 0;
    const { VOLUME, PULSE_SHORT } = tape;
    for (let t = 0; t < 11; t++) {
        for (; ptr < PULSE_SHORT; ptr++)
            samples.push(-VOLUME);
        ptr -= PULSE_SHORT;
    }
    return samples;
}
function VZ_to_WAV(VZ, options) {
    const laser500 = options.l500 && !options.l310;
    // note on SAMPLE_RATE: when using turbo tape 48000 Hz is the minimum to work
    // on the real machine. One the emulator the minimum is 18000 Hz
    const SAMPLE_RATE = options.samplerate;
    const VOLUME = options.volume;
    const HEADER_LEN = options.header;
    const TAIL_LEN = 4; // 128; 
    const pulsems = options.pulsems / 1000000; // for a total of 277 microseconds
    const PULSE_SHORT = pulsems * SAMPLE_RATE;
    const PULSE_LONG = PULSE_SHORT * 2;
    const turboparams = (0, turbo_encoder_1.decodeBitSize)(options.turbo, SAMPLE_RATE, laser500);
    const turbo = {
        THRESHOLD: turboparams.THRESHOLD,
        TURBO_HALFPULSE_SIZE: turboparams.TURBO_HALFPULSE_SIZE,
        TURBO_INVERT: turboparams.TURBO_INVERT
    };
    const fileType = VZ.type;
    const tape = {
        tapeName: VZ.filename,
        fileType,
        startAddress: VZ.start,
        program: Buffer.from(VZ.data),
        headerLen: HEADER_LEN,
        tailLen: TAIL_LEN,
        PULSE_SHORT: PULSE_SHORT,
        PULSE_LONG: PULSE_LONG,
        SAMPLE_RATE: SAMPLE_RATE,
        VOLUME: VOLUME,
        laser500
    };
    console.log(`target is ${tape.laser500 ? 'Laser 500' : 'Laser 310'} `);
    console.log(`SAVING ${fileType === vz_1.VZ_BASIC ? "T" : "B"}: '${VZ.filename}' from $${(0, bytes_1.hex)(VZ.start, 4)}, ${VZ.data.length} bytes`);
    let samples;
    // normal tape
    if (options.turbo === undefined) {
        samples = getNormalSamples(tape);
    }
    else {
        samples = getTurboSamples(tape, turbo);
    }
    // invert audio samples if --invert option was given
    if (options.invert)
        samples = invertSamples(samples);
    // fix_cassette_port(samples, SAMPLE_RATE);
    const f_samples = new Float32Array(samples);
    const f_samples_inv = new Float32Array(invertSamples(samples));
    const wavData = {
        sampleRate: SAMPLE_RATE,
        channelData: !options.stereoboost ? [f_samples] : [f_samples, f_samples_inv]
    };
    const wavoptions = { bitDepth: 16, float: false, symmetric: false };
    const buffer = wav_encoder_1.default.encode.sync(wavData, wavoptions);
    return buffer;
}
exports.VZ_to_WAV = VZ_to_WAV;
