import fs from "fs";
import path from "path";
import { hex } from "./bytes";

// get the Z80 turbo loader routine, patching two bytes and
// relocating it at the desidered address
export function getTurboLoader(laser500: boolean, THRESHOLD: number, relocate_address: number, fileType: number) {
   const rootname = path.resolve(__dirname, laser500 ? "../turbo_tape/turbo_L500" : "../turbo_tape/turbo_L310");
   const loader_program = fs.readFileSync(`${rootname}.bin`);

   patch_bytes(loader_program, THRESHOLD, fileType, rootname);
   relocate(loader_program, relocate_address, rootname);

   // for debug purposes
   {
      const symbols = fs.readFileSync(`${rootname}.sym`).toString();

      let set_threshold = getSymbolAddress(symbols, "set_threshold") + relocate_address;
      console.log(`const label_set_threshold = 0x${hex(set_threshold,4)};`);

      let loop_file = getSymbolAddress(symbols, "loop_file") + relocate_address;
      console.log(`const label_loop_file = 0x${hex(loop_file,4)};`);

      let autorun = getSymbolAddress(symbols, "autorun") + relocate_address;
      console.log(`const label_autorun = 0x${hex(autorun,4)};`);
   }

   return loader_program;
}

function patch_bytes(loader_program: Buffer, THRESHOLD: number, fileType: number, rootname: string) {

   // read turbo.sym symbol files
   const symbols = fs.readFileSync(`${rootname}.sym`).toString();

   // do the needed byte patches
   loader_program[getSymbolAddress(symbols, "turbo_load"   ) + 1] = fileType; 
   loader_program[getSymbolAddress(symbols, "set_threshold") + 1] = THRESHOLD; 
}

function getSymbolAddress(file: string, symbolname: string) {
      
   const regex = new RegExp(symbolname + "\\s*=\\s*\\$(?<address>[0-9a-fA-F]{4})", "g");      
   const match = regex.exec(file);   
   if(match === null || match.groups === undefined) throw `can't find ${symbolname} label in .sym file`;

   // get label address from hex format
   const address = Number.parseInt(match.groups["address"], 16);

   return address;
}

// relocate the Z80 turbo loader routine at the desidered
// destination by changing all the interested addresses.
// .reloc file is created by the assembler and it's a list 
// of offsets (16 bits) that needs to be changed

function relocate(loader_program: Buffer, relocate_address: number, rootname: string) {
   const reloc_info = fs.readFileSync(`${rootname}.reloc`);

   for(let t=0; t<reloc_info.length; t+=2) {      
      const patch_address = reloc_info.readUInt16LE(t);
      const offset_value = loader_program.readUInt16LE(patch_address);
      const relocated_value = offset_value + relocate_address;
      loader_program.writeUInt16LE(relocated_value, patch_address);
      //console.log(`${t}: [${patch_address}] = ${offset_value.toString(16)} -> ${relocated_value.toString(16)}`);         
   }
}
