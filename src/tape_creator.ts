import { hex, hi, lo } from "./bytes";
import { calculate_checksum } from "./checksum";
import { TT_bitsToSamples, decodeBitSize, getTurboBytes } from "./turbo_encoder";
import { getTurboLoader } from "./turbo_loader";
import { VZ_BASIC, VZ_BINARY, VZFILETYPE, unpackvz, VZInfo } from "./vz";
import { CommandLineOptions as TypedOptions } from "./options";
import WavEncoder from "wav-encoder";

type Pulse = "S" | "L";

export interface Tape {
   tapeName: string;
   fileType: VZFILETYPE;
   startAddress: number;
   program: Buffer;
   headerLen: number;
   tailLen: number;
   PULSE_SHORT: number;
   PULSE_LONG: number;
   SAMPLE_RATE: number;
   VOLUME: number;
   laser500: boolean;
}

export interface TurboTape {
   THRESHOLD: number;
   TURBO_HALFPULSE_SIZE: number;
   TURBO_INVERT: boolean;
   TURBO_ADDRESS: number|undefined;
}

function getNormalSamples(tape: Tape) {
    const { header_bytes, body_bytes } = tapeStructure(tape);

    // header
    const header_bits = bytesToBits(header_bytes);
    const header_pulses = bitsToPulses(header_bits);
    const header_samples = pulsesToSamples(header_pulses, tape);

    // gap between header and body in Laser310
    let gap: number[] = tape.laser500 ? [] : getGapSamples(tape);

    // body
    const body_bits = bytesToBits(body_bytes);
    const body_pulses = bitsToPulses(body_bits);
    const body_samples = pulsesToSamples(body_pulses, tape);

    const samples = header_samples.concat(gap).concat(body_samples);

    return samples;
 }

 function getTurboSamples(tape: Tape, turbo: TurboTape) {

    const { startAddress, program } = tape;

    const turbo_address = turbo.TURBO_ADDRESS ?? startAddress + program.length;
    const loader_program = getTurboLoader(tape.laser500, turbo.THRESHOLD, turbo_address, tape.fileType);

    tape.fileType = VZ_BINARY;
    tape.startAddress = turbo_address;
    tape.program = loader_program;

    const { header_bytes, body_bytes } = tapeStructure(tape);

    const header_bits = bytesToBits(header_bytes);
    const header_pulses = bitsToPulses(header_bits);
    const header_samples = pulsesToSamples(header_pulses, tape);

    // gap between header and body in Laser310
    let gap: number[] = tape.laser500 ? [] : getGapSamples(tape);

    // body

    const body_bits = bytesToBits(body_bytes);
    const body_pulses = bitsToPulses(body_bits);
    const body_samples = pulsesToSamples(body_pulses, tape);

    const turbo_bytes = getTurboBytes(startAddress, program);

    const turbo_bits = bytesToBits(turbo_bytes);
    const turbo_samples = TT_bitsToSamples(turbo_bits, tape, turbo);

    const samples = header_samples.concat(gap).concat(body_samples).concat(turbo_samples);

    return samples;
 }

 function invertSamples(samples: number[])
 {
    return samples.map(e=>-e);
 }

 function tapeStructure(tape: Tape) {
    const header_bytes = [];
    const body_bytes = [];

    const { tapeName, fileType, startAddress, program, headerLen, tailLen, laser500 } = tape;

    // header
    for(let t=0; t<headerLen; t++) header_bytes.push(0x80);
    for(let t=0; t<5; t++) header_bytes.push(0xfe);

    // file type
    header_bytes.push(fileType);

    // file name
    for(let t=0; t<tapeName.length; t++) header_bytes.push(tapeName.charCodeAt(t));
    header_bytes.push(0x00);

    if(laser500) {
       // laser 500 has additional bytes and a marker to allow print of file name
       // laser 310 elongates the last pulse of the "0" bit to allow print of file name
       for(let t=0; t<5; t++) header_bytes.push(0x80);  // additional header to allow print of file name
       for(let t=0; t<10; t++) header_bytes.push(0x80);
       header_bytes.push(0xff);                         // end of header
    }

    // start address
    body_bytes.push(lo(startAddress));
    body_bytes.push(hi(startAddress));

    // end address
    const endAddress = startAddress + program.length;
    body_bytes.push(lo(endAddress));
    body_bytes.push(hi(endAddress));

    // program
    for(let t=0; t<program.length; t++) body_bytes.push(program[t]);

    // checksum
    const checksum = calculate_checksum(program, startAddress, endAddress);
    body_bytes.push(lo(checksum));
    body_bytes.push(hi(checksum));

    // terminator
    for(let t=0; t<tailLen; t++) body_bytes.push(0x00);

    return { header_bytes, body_bytes };
 }

 function bytesToBits(bytes: number[]): number[] {
    const bits = [];
    for(let t=0; t<bytes.length; t++) {
       const b = bytes[t] & 0xFF;
       bits.push((b & 128) >> 7);
       bits.push((b &  64) >> 6);
       bits.push((b &  32) >> 5);
       bits.push((b &  16) >> 4);
       bits.push((b &   8) >> 3);
       bits.push((b &   4) >> 2);
       bits.push((b &   2) >> 1);
       bits.push((b &   1) >> 0);
    }
    return bits;
 }

 function bitsToPulses(bits: number[]): Pulse[] {
    const pulses: Pulse[] = [];
    for(let t=0; t<bits.length; t++) {
       const b = bits[t];
       if(b == 0) { pulses.push("S"); pulses.push("L"); /*tapeBits.push(1); tapeBits.push(0); tapeBits.push(1); tapeBits.push(1); tapeBits.push(0); tapeBits.push(0);*/ }
       else       { pulses.push("S"); pulses.push("S"); pulses.push("S"); /*tapeBits.push(1); tapeBits.push(0); tapeBits.push(1); tapeBits.push(0); tapeBits.push(1); tapeBits.push(0);*/ }
    }
    return pulses;
 }

 function pulsesToSamples(tapeBits: Pulse[], tape: Tape): number[] {
    const samples = [];
    let ptr = 0;

    const { SAMPLE_RATE, VOLUME, PULSE_LONG, PULSE_SHORT } = tape;

    for(let t=0; t<tapeBits.length; t++) {
       if(tapeBits[t]==="S") {
          for(;ptr<PULSE_SHORT; ptr++) samples.push(VOLUME);   ptr -= PULSE_SHORT;
          for(;ptr<PULSE_SHORT; ptr++) samples.push(-VOLUME);  ptr -= PULSE_SHORT;
       }
       else {
          for(;ptr<PULSE_LONG; ptr++) samples.push(VOLUME);    ptr -= PULSE_LONG;
          for(;ptr<PULSE_LONG; ptr++) samples.push(-VOLUME);   ptr -= PULSE_LONG;
       }
    }

    return samples;
 }

 function getGapSamples(tape: Tape): number[] {
    const samples = [];
    let ptr = 0;

    const { VOLUME, PULSE_SHORT } = tape;

    for(let t=0; t<11; t++) {
       for(;ptr<PULSE_SHORT; ptr++) samples.push(-VOLUME);  ptr -= PULSE_SHORT;
    }

    return samples;
}

export function VZ_to_WAV(VZ: VZInfo, options: TypedOptions) {
    const laser500 = options.l500 && !options.l310;

    // note on SAMPLE_RATE: when using turbo tape 48000 Hz is the minimum to work
    // on the real machine. One the emulator the minimum is 18000 Hz

    const SAMPLE_RATE = options.samplerate;
    const VOLUME = options.volume;
    const HEADER_LEN = options.header;
    const TAIL_LEN = 4; // 128;
    const pulsems = options.pulsems/1000000;  // for a total of 277 microseconds
    const PULSE_SHORT = pulsems * SAMPLE_RATE;
    const PULSE_LONG = PULSE_SHORT * 2;

    const turboparams = decodeBitSize(options.turbo, SAMPLE_RATE, laser500);

    const turbo: TurboTape = {
       THRESHOLD: turboparams.THRESHOLD,
       TURBO_HALFPULSE_SIZE: turboparams.TURBO_HALFPULSE_SIZE,
       TURBO_INVERT: turboparams.TURBO_INVERT,
       TURBO_ADDRESS: options.address !== undefined ? parseInt(options.address,16) : undefined
    };

    const fileType = VZ.type;

    const tape: Tape = {
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
    console.log(`SAVING ${fileType === VZ_BASIC ? "T" : "B"}: '${VZ.filename}' from $${hex(VZ.start,4)}, ${VZ.data.length} bytes`);

    let samples: number[];

    // normal tape
    if(options.turbo === undefined) {
       samples = getNormalSamples(tape);
    }
    else {
       samples = getTurboSamples(tape, turbo);
    }

    // invert audio samples if --invert option was given
    if(options.invert) samples = invertSamples(samples);

    // fix_cassette_port(samples, SAMPLE_RATE);

    const f_samples = new Float32Array(samples);
    const f_samples_inv = new Float32Array(invertSamples(samples));

    const wavData = {
       sampleRate: SAMPLE_RATE,
       channelData: !options.stereoboost ? [ f_samples ] : [ f_samples, f_samples_inv ]
    };

    const wavoptions: WavEncoder.Options = { bitDepth: 16, float: false, symmetric: false };
    const buffer = WavEncoder.encode.sync(wavData, wavoptions);

    return buffer;
 }
