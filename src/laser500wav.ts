#!/usr/bin/env node

// TODO turbo tape flush tail ?

import fs from "fs";
import path from 'path';

import WavEncoder from "wav-encoder";
import { options } from './options';
import { getTurboLoader } from "./turbo_loader";
import { hi, lo } from "./utils";
import { calculate_checksum } from "./checksum";
import { TT_bitsToSamples, decodeBitSize, getTurboBytes } from "./turbo_encoder";

type VZFILETYPE = "T" | "B";
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
   SILENCE_START: number;
   SILENCE_END: number;
}

export interface TurboTape {
   THRESHOLD: number;
   TURBO_BIT_SIZE: number;
   TURBO_INVERT: boolean;
   ELONGATION: number;
}

function main() {
   if(options.input === undefined) {
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

   const SAMPLE_RATE = options.samplerate || 96000;
   const VOLUME = options.volume || 1.0;
   const HEADER_LEN = options.header || 128;   
   const TAIL_LEN = 4; // 128; // TODO make it option?   
   const PULSE_SHORT = (0.277/1000) * SAMPLE_RATE; // for a total of 277 microseconds
   const PULSE_LONG = PULSE_SHORT * 2;

   const turboparams = decodeBitSize(options['turbo-speed'], SAMPLE_RATE);

   const turbo: TurboTape = { 
      THRESHOLD: turboparams.THRESHOLD, 
      TURBO_BIT_SIZE: turboparams.TURBO_BIT_SIZE, 
      TURBO_INVERT: turboparams.TURBO_INVERT,
      ELONGATION: 120 / 3670200    // about 120 t-states to add after a byte is completed
   };    

   const fileName = options.input;
   const startAddress = (options.address && !options.turbo) || 0x8995;
   const turboAddress = options['turbo-address'] || 0x8995;

   if(options.turbo) console.log(`turbo start address = 0x${turboAddress.toString(16)}`);
   else              console.log(`start address = 0x${startAddress.toString(16)}`);

   const fileNameWithoutExtension = path.parse(fileName).name;

   const tapeName = options.name || fileNameWithoutExtension;

   if(tapeName.length > 15) {
      // max is 15 chars + \0
      console.log(`'${tapeName}' tape name too long`);
      process.exit(0);
   }

   const outputName = options.output || fileNameWithoutExtension;
   const wavName = outputName + ".wav";

   if(!fs.existsSync(fileName)) {
      console.log(`file "${fileName}" not found`);
      process.exit(0);
   }

   const program = fs.readFileSync(fileName);

   const fileType: VZFILETYPE = options.text ? "T" : options.binary ? "B" : "T";
   
   const tape: Tape = {
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
      SILENCE_END: 0.01
   };

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

   const f_samples = new Float32Array(samples);
   const f_samples_inv = new Float32Array(invertSamples(samples));

   const wavData = {
      sampleRate: SAMPLE_RATE,
      channelData: !options.stereoboost ? [ f_samples ] : [ f_samples, f_samples_inv ]
   };

   const wavoptions: WavEncoder.Options = { bitDepth: 16, float: false, symmetric: false };
   const buffer = WavEncoder.encode.sync(wavData, wavoptions);

   fs.writeFileSync(wavName, Buffer.from(buffer));

   let gentype = fileType === "B" ? "B: standard file" : "T: standard file";
   if(options.turbo !== undefined) gentype = "TURBO tape";

   console.log(`file "${wavName}" generated as ${gentype}`);   
}

// ***************************************************************************************

function getNormalSamples(tape: Tape) {
   const bytes = tapeStructure(tape);
   const bits = bytesToBits(bytes);
   const pulses = bitsToPulses(bits);
   const samples = pulsesToSamples(pulses, tape);
   return samples;
}

function getTurboSamples(tape: Tape, turbo: TurboTape) {

   const { startAddress, program } = tape;

   const turbo_address = startAddress + program.length;
   const loader_program = getTurboLoader(turbo.THRESHOLD, turbo_address);   

   tape.fileType = "B";
   tape.startAddress = turbo_address;
   tape.program = loader_program;

   const bytes = tapeStructure(tape);
   const bits = bytesToBits(bytes);
   const pulses = bitsToPulses(bits);
   const samples = pulsesToSamples(pulses, tape);

   const turbo_bytes = getTurboBytes(startAddress, program);
   const turbo_bits = bytesToBits(turbo_bytes);
   const turbo_samples = TT_bitsToSamples(turbo_bits, tape, turbo);

   const total_samples = samples.concat(turbo_samples);
   return total_samples;
}

function invertSamples(samples: number[])
{
   return samples.map(e=>-e);
}

function tapeStructure(tape: Tape) {   
   const bytes = [];

   const { tapeName, fileType, startAddress, program, headerLen, tailLen } = tape;

   // header   
   for(let t=0; t<headerLen; t++) bytes.push(0x80);
   for(let t=0; t<5; t++) bytes.push(0xfe);

   // file type
   if(fileType == "T") bytes.push(0xf0);
   else                bytes.push(0xf1);

   // file name
   for(let t=0; t<tapeName.length; t++) bytes.push(tapeName.charCodeAt(t));
   bytes.push(0x00);

   // header2
   for(let t=0; t<5; t++) bytes.push(0x80); // additional header to allow print of file name

   for(let t=0; t<10; t++) bytes.push(0x80);
   bytes.push(0xff);
   
   // start address
   bytes.push(lo(startAddress));
   bytes.push(hi(startAddress));

   // end address
   const endAddress = startAddress + program.length;
   bytes.push(lo(endAddress));
   bytes.push(hi(endAddress));

   // program
   for(let t=0; t<program.length; t++) bytes.push(program[t]);

   // checksum 
   const checksum = calculate_checksum(program, startAddress, endAddress);
   bytes.push(lo(checksum));
   bytes.push(hi(checksum));

   // terminator
   for(let t=0; t<tailLen; t++) bytes.push(0x00);   
   
   return bytes;
}

function bytesToBits(bytes: number[]): number[] {
   const bits = [];
   for(let t=0; t<bytes.length; t++) {
      const b = bytes[t];
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

   const { SAMPLE_RATE, VOLUME, PULSE_LONG, PULSE_SHORT, SILENCE_START, SILENCE_END } = tape;

   const sstart = SILENCE_START * SAMPLE_RATE; 
   const send   = SILENCE_END   * SAMPLE_RATE;

   // insert silence at start
   for(let t=0; t<sstart; t++) samples.push(0);

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

   // insert silence at end
   for(let t=0; t<send; t++) samples.push(0);
   
   return samples;
}


main();
