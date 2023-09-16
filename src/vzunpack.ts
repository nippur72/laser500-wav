#!/usr/bin/env node

import fs from "fs";
import commandLineArgs from 'command-line-args';
import { VZ_BASIC, unpackvz } from './vz';
import { hex } from "./bytes";

const options = parseOptions([
   { name: 'input', alias: 'i', type: String },
   { name: 'output', alias: 'o', type: String },
]);

function parseOptions(optionDefinitions: commandLineArgs.OptionDefinition[]) {
    try {
       return commandLineArgs(optionDefinitions);
    } catch(ex: any) {
       if(ex.message !== undefined) console.log(ex.message);
       else console.log(ex);
       process.exit(-1);
    }
}

function main() {
   if(options.input === undefined || options.output === undefined) {
      console.log("Usage: vzpack -i vzfile -o binaryfile");
      console.log("  -i or --input file          the vz file to unpack");
      console.log("  -o or --output file         the output binary file");
      process.exit(0);
   }   

   let VZ = fs.readFileSync(options.input);
   
   const info = unpackvz(VZ);

   let destname = `${options.output}.${info.filename}.${info.type==VZ_BASIC?"T":"B"}.${hex(info.start,4)}.bin`;

   fs.writeFileSync(destname, info.data);

   console.log(`${destname} file created`);
}

main();