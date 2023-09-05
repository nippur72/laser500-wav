#!/usr/bin/env node

import fs from "fs";
import path from 'path';

import WavEncoder from "wav-encoder";
import { options } from './options';

const SILENCE_START = 0.01;
const SILENCE_END = 0.01;

type VZFILETYPE = "T" | "B";
type Pulse = "S" | "L";

const fileType: VZFILETYPE = options.text ? "T" : "B";

if(options.input === undefined) {
   console.log("Usage: laser500wav -i file -o file [options]");
   console.log("  -i or --input file          the file to be converted in WAV");
   console.log("  -o or --output file         the file name to be created");
   console.log("  -b or --binary              generates a 'B:' standard binary file");
   console.log("  -t or --text                generates a 'T:' standard BASIC text file (dafault)");
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
const TAIL_LEN = 4; // 128;

console.log(`sample rate is ${SAMPLE_RATE} Hz`);

const PULSE_SHORT = (0.277/1000) * SAMPLE_RATE; // for a total of 277 microseconds
const PULSE_LONG = PULSE_SHORT * 2;

const { THRESHOLD, TURBO_BIT_SIZE, TURBO_INVERT } = decodeBitSize(options['turbo-speed']);

const ELONGATION = 120 / 3670200; // about 120 t-states to add after a byte is completed

const fileName = options.input;
const startAddress = (options.address && !options.turbo) || 0x8995;
const turboAddress = options['turbo-address'] || 0x8995;

if(options.turbo) console.log(`turbo start address = 0x${turboAddress.toString(16)}`);
else              console.log(`start address = 0x${startAddress.toString(16)}`);

const fileNameWithoutExtension = path.parse(fileName).name;

const laserName = options.name || fileNameWithoutExtension;

if(laserName.length > 15) {
   // max is 15 chars + \0
   console.log(`'${laserName}' tape name too long`);
   process.exit(0);
}

const outputName = options.output || fileNameWithoutExtension;
const wavName = outputName + ".wav";

if(!fs.existsSync(fileName)) {
   console.log(`file "${fileName}" not found`);
   process.exit(0);
}

const program = fs.readFileSync(fileName);

let samples: number[];

// normal tape
if(options.turbo === undefined) {
   // standard file
   const bytes = tapeStructure(laserName, fileType, startAddress, program);
   const bits = bytesToBits(bytes);
   const rawBits = bitsToPulses(bits);
   samples = pulsesToSamples(rawBits);
}
else {   
   samples = turboSamples();
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


// ***************************************************************************************

function invertSamples(samples: number[])
{
   return samples.map(e=>-e);
}

function tapeStructure(tapeName: string, fileType: VZFILETYPE, startAddress: number, program: Buffer) {   
   const bytes = [];

   // header
   for(let t=0; t<HEADER_LEN; t++) bytes.push(0x80);
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
   for(let t=0; t<TAIL_LEN; t++) bytes.push(0x00);   
   
   return bytes;
}

function lo(word: number) {
   return word & 0xff;   
}

function hi(word: number) {
   return (word >> 8) & 0xff;
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

function pulsesToSamples(tapeBits: Pulse[]): number[] {
   const samples = [];
   let ptr = 0;

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

function cksum_byte(c: number, sum: number) {
   sum = (sum + c) & 0xFFFF;
   return sum;
}

function cksum_word(word: number, sum: number) {
   sum = cksum_byte(lo(word), sum);
   sum = cksum_byte(hi(word), sum);
   return sum;
}

function calculate_checksum(program: Buffer, startAddress: number, endAddress: number) {
   let checksum = 0;
   for(let t=0; t<program.length; t++) {
      checksum = cksum_byte(program[t], checksum);
   }
   checksum = cksum_word(startAddress, checksum);   
   checksum = cksum_word(endAddress, checksum);   
   return checksum;
}

// ************************************************************************ 
// TURBO TAPE 
// ************************************************************************ 

function turboSamples() {
   // turbo tape file   
   const loader_program = fs.readFileSync("./turbo_tape_stub.bin");

   console.log(`shortest pulse size is ${TURBO_BIT_SIZE} samples. THRESHOLD value is ${THRESHOLD}`);

   // fix the LD BC, THRESHOLD in the assembler program
   // start_of_turbo_tape -> stub.sym +
   // set_threshold -> turbo.sym   
   const start_of_turbo_tape = 0x0028;
   const set_threshold = 0x0093;
   const offset = start_of_turbo_tape + set_threshold + 1;
   loader_program[offset] = THRESHOLD;

   const loader_bytes = tapeStructure(laserName, "T", startAddress, loader_program);
   const loader_bits = bytesToBits(loader_bytes);
   const loader_pulses = bitsToPulses(loader_bits);
   const loader_samples = pulsesToSamples(loader_pulses);

   const bytes = TT_tapeStructure(turboAddress, program);
   const bits = bytesToBits(bytes);
   samples = TT_bitsToSamples(bits);

   samples = loader_samples.concat(samples);
   return samples;
}

function decodeBitSize(speed: number) {

   speed = speed || 4;

   let threshold, size, inv, tone;
        
        if(speed === 1) { tone =  800; threshold = 86; inv = false;  }   // ? false in real machine?
   else if(speed === 2) { tone = 2400; threshold = 37; inv = true;   }
   else if(speed === 3) { tone = 3000; threshold = 23; inv = true;   }
   else if(speed === 4) { tone = 4000; threshold = 16; inv = true;   }
   else {
      console.log("invalid turbo speed");
      process.exit(0);
   } 

   size = SAMPLE_RATE / tone / 4;
   
   return { THRESHOLD: threshold, TURBO_BIT_SIZE: size, TURBO_INVERT: !inv };
}

function TT_tapeStructure(startAddress: number, program: Buffer) {   
   const bytes = [];

   // trailing byte   
   bytes.push(0x0);

   // header
   const header = [ 0xAA, 0x55 ];   
   header.forEach(e=>bytes.push(e));   
   
   // TODO bank switcher?

   // start address
   bytes.push(lo(startAddress));
   bytes.push(hi(startAddress));
         
   // length
   const length = program.length;
   bytes.push(lo(length));
   bytes.push(hi(length));

   // program
   for(let t=0; t<program.length; t++) bytes.push(program[t]);

   // checksum
   const checksum = calculate_checksum(program, startAddress, length);
   bytes.push(lo(checksum));
   bytes.push(hi(checksum));   

   // terminator
   bytes.push(0x00);    

   console.log("TURBO TAPE INFO:");
   console.log(`address: ${startAddress.toString(16)}`);
   console.log(`length: ${length.toString(16)}`);
   console.log(`checksum: ${checksum.toString(16)}`);

   return bytes;
}

function TT_bitsToSamples(bits: number[]) {
   const pulses = [];
   const elongations = [];
   const elong_size = ELONGATION * SAMPLE_RATE;
   
   let last_bit = 0;
   for(let t=0; t<bits.length; t++) {
      const b = bits[t];

      if(b === 1) {
         // 1=SHORT pulse
         pulses.push(1); elongations.push(t % 8 === 0 ? elong_size : 0);
         pulses.push(0); elongations.push(0);
      } else {
         // 0=LONG pulse
         pulses.push(1); elongations.push(t % 8 === 0 ? elong_size : 0);
         pulses.push(1); elongations.push(0);
         pulses.push(0); elongations.push(0);
         pulses.push(0); elongations.push(0);
      } 
   }

   // turn pulses into samples

   const samples = [];
  
   let ptr = 0 ;
   for(let t=0; t<pulses.length; t++) {
      const b = pulses[t];
      const s = (b == 0) ? -VOLUME : VOLUME;      

      const pixelsize = TURBO_BIT_SIZE + elongations[t];

      while(ptr < pixelsize) {
         samples.push(TURBO_INVERT ? -s : s);
         ptr++;
      }
      ptr -= pixelsize;
   }

   return samples;
}

function TT_dumpBits(samples: number[]) {
   console.log(`const tape = [`);
   let s = samples.map(s=> s<0 ? "0" : "1").join(",");
   console.log(s);
   console.log("]; module.exports = { tape };");   
}
