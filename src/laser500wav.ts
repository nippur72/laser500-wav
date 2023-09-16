#!/usr/bin/env node

// TODO count T states, elongation in sync_tape
// TODO elonagtion after turbo header
// TODO autorun different "T" and "B"
// TODO investigate polarity inversion

import fs from "fs";

import { options } from './options';
import { VZ_BINARY, unpackvz } from "./vz";
import { VZ_to_WAV } from "./tape_creator";

function main() {
   if(options.input === undefined || options.output === undefined || (options.l310===undefined && options.l500===undefined)) {
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

   if(options.l310 !==undefined && options.l500 !== undefined) {
      console.log("specify only one --L option: 310 or 500");
      process.exit(0);
   }

   const VZ_file_name = options.input;
   const WAV_file_name = options.output + ".wav";

   if(!fs.existsSync(VZ_file_name)) {
      console.log(`file "${VZ_file_name}" not found`);
      process.exit(0);
   }

   const VZ_file = fs.readFileSync(VZ_file_name);
   const VZ = unpackvz(VZ_file);
   const buffer = VZ_to_WAV(VZ, options);
   
   fs.writeFileSync(WAV_file_name, Buffer.from(buffer));

   let gentype = VZ.type === VZ_BINARY ? "B: standard file" : "T: standard file";
   if(options.turbo !== 0) gentype = "TURBO tape";
   console.log(`file "${WAV_file_name}" generated as ${gentype}`);
}

main();
