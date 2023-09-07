// ************************************************************************ 
// TURBO TAPE 
// ************************************************************************ 

import { calculate_checksum } from "./checksum";
import { Tape, TurboTape } from "./laser500wav";
import { getTurboLoader } from "./turbo_loader";
import { hi, lo } from "./utils";

export function decodeBitSize(speed: number, SAMPLE_RATE: number) {

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

export function getTurboBytes(startAddress: number, program: Buffer) {   
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

export function TT_bitsToSamples(bits: number[], tape: Tape, turbo: TurboTape) {

   const { SAMPLE_RATE, VOLUME } = tape;
   const { ELONGATION, TURBO_BIT_SIZE, TURBO_INVERT } = turbo;

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
