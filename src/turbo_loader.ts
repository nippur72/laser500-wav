import fs from "fs";

// get the Z80 turbo loader routine, patching the "THRESHOLD" value and
// relocating it at the desidered address
export function getTurboLoader(THRESHOLD: number, relocate_address: number) {
   const loader_program = fs.readFileSync("./turbo_tape/turbo.bin");

   patch_threshold(loader_program, THRESHOLD);
   relocate(loader_program, relocate_address);
   return loader_program;
}

// patch the "THRESHOLD" value in the turbo loader routine by
// changing the Z80 instruction: "set_threshold: CP THRESHOLD"
// the exact patching point is derived from symbol file (.sym)
// by looking at the label "set_threshold:"
// the symbol file is created by the assembler

function patch_threshold(loader_program: Buffer, THRESHOLD: number) {

   // read turbo.sym symbol files
   const symbols = fs.readFileSync("./turbo_tape/turbo.sym").toString();

   // locate 'set_threshold' label with a regex
   const regex = /set_threshold\s*=\s*\$(?<address>[0-9a-f]{4})/g;   
   const match = regex.exec(symbols);
   if(match === null || match.groups === undefined) throw "can't find set_threshold label in turbo.sym";

   // get label address from hex format
   const address = Number.parseInt(match.groups["address"], 16);
   
   // goes to "CP" instruction argument by skipping 1 byte
   const offset = address + 1; 

   // do the patch
   loader_program[offset] = THRESHOLD;
}

// relocate the Z80 turbo loader routine at the desidered
// destination by changing all the interested addresses.
// .reloc file is created by the assembler and it's a list 
// of offsets (16 bits) that needs to be changed

function relocate(loader_program: Buffer, relocate_address: number) {
   const reloc_info = fs.readFileSync("./turbo_tape/turbo.reloc");

   for(let t=0; t<reloc_info.length; t+=2) {      
      const patch_address = reloc_info.readUInt16LE(t);
      const offset_value = loader_program.readUInt16LE(patch_address);
      const relocated_value = offset_value + relocate_address;
      loader_program.writeUInt16LE(relocated_value, patch_address);
      //console.log(`${t}: [${patch_address}] = ${offset_value.toString(16)} -> ${relocated_value.toString(16)}`);         
   }
}
