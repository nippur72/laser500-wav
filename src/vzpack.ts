#!/usr/bin/env node

import fs from "fs";
import commandLineArgs from 'command-line-args';
import { VZ_BASIC, VZ_BINARY, packvz } from './vz';

const options = parseOptions([
   { name: 'input', alias: 'i', type: String },
   { name: 'text', alias: 't', type: Boolean },
   { name: 'binary', alias: 'b', type: Boolean },   
   { name: 'output', alias: 'o', type: String },
   { name: 'name', alias: 'n', type: String },
   { name: 'address', alias: 'a', type: Number },
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
      console.log("Usage: vzpack -i binaryfile -o vzfile [options]");
      console.log("  -i or --input file          the source file to be put into the VZ container");
      console.log("  -o or --output file         the vz output file");
      console.log("  -b or --binary              generates a binary file VZ file");
      console.log("  -t or --text                generates a text VZ file");
      console.log("  -n or --name name           file name shown in CLOAD");
      console.log("  --address hexaddress        address in memory where to load the file");
      process.exit(0);
   }   

   if(options.name === undefined) {
      console.log(`specify -n name`);
      process.exit(0);
   }

   if(options.name > 15 ) {
      // max is 15 chars + \0
      console.log(`'${options.name}' name too long`);
      process.exit(0);
   }

   let fileType: number;
   let address: number = 0x8995;  // 7AE9 on VZ

        if(options.binary) fileType = VZ_BINARY;
   else if(options.text)   fileType = VZ_BASIC;
   else {
      console.log(`specify -b or -t`);
      process.exit(0);
   }

   if(options.address) address = Number.parseInt(options.address, 16);

   const file = fs.readFileSync(options.input);
   
   const VZ = packvz(options.name, fileType, address, file);

   fs.writeFileSync(options.output, VZ);

   console.log(`${options.output} file created`);
}

main();