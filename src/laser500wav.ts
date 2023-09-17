#!/usr/bin/env node

// TODO count T states, elongation in sync_tape
// TODO elonagtion after turbo header
// TODO autorun different "T" and "B"
// TODO investigate polarity inversion

import fs from "fs";

import { options, printHelp } from './options';
import { VZ_BINARY, unpackvz } from "./vz";
import { VZ_to_WAV } from "./tape_creator";

function main() {
   if(options.input === undefined || options.output === undefined || (options.l310===undefined && options.l500===undefined)) {
      printHelp();
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
