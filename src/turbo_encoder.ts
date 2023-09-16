// ************************************************************************ 
// TURBO TAPE 
// ************************************************************************ 

import { calculate_checksum } from "./checksum";
import { hi, lo } from "./bytes";
import { Tape, TurboTape } from "./tape_creator";

export function decodeBitSize(speed: number, SAMPLE_RATE: number, laser500: boolean) {

   speed = speed || 4;   

   if(speed<1 || speed>4) {
      console.log("invalid turbo speed");
      process.exit(0);
   } 

   const laser500_values = [
      { tone:  800, threshold: 86, inv: false },
      { tone: 2400, threshold: 37, inv: true  },
      { tone: 3000, threshold: 23, inv: true  },
      { tone: 4000, threshold: 16, inv: true  },
   ];

   const laser310_values = [
      { tone:  800, threshold: 111, inv: false },
      { tone: 2756, threshold: 30,  inv: true  },
      { tone: 3674, threshold: 22,  inv: true  },      
      { tone: 4000, threshold: 19,  inv: true  }, // ok
      //{ tone: 4100, threshold: 18,  inv: true  }, // no
   ];

   // riepilogo @22050 Hz
   // ROM    is short=24 long=48     ( 918 Hz /  459 Hz)
   // 2018AD is short=8, long=16     (2756 Hz / 1378 Hz) 

   const { tone, threshold, inv } = laser500 ? laser500_values[speed-1] : laser310_values[speed-1];

   const halfpulse = SAMPLE_RATE / tone / 4;
   
   return { THRESHOLD: threshold, TURBO_HALFPULSE_SIZE: halfpulse, TURBO_INVERT: !inv };
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

   // terminator (allows receiver to go past bad bits and report load error)
   for(let t=0;t<64;t++) bytes.push(0x00);    

   console.log("TURBO TAPE INFO:");
   console.log(`address: ${startAddress.toString(16)}`);
   console.log(`length: ${length.toString(16)}`);
   console.log(`checksum: ${checksum.toString(16)}`);

   return bytes;
}

export function TT_bitsToSamples(bits: number[], tape: Tape, turbo: TurboTape) {

   const { SAMPLE_RATE, VOLUME } = tape;
   const { TURBO_HALFPULSE_SIZE, TURBO_INVERT } = turbo;

   // compensate for the time lost after a byte is completed and assembled
   const BYTE_COMPENSATION = tape.laser500 ? 120 / 3670200 : 150 / 3546900;    //90

   const pulses = [];
   const elongations = [];
   const elong_size = BYTE_COMPENSATION * SAMPLE_RATE;
   
   let byte_counter = 0;
   for(let t=0; t<bits.length; t++) {
      const b = bits[t];
      const start_byte = t % 8 === 0;
      const needs_compensation = start_byte && byte_counter > 2; // first three bytes (00,AA,55) must not be compensated

      if(b === 1) {
         // 1=SHORT pulse
         pulses.push(1); elongations.push(needs_compensation ? elong_size : 0);
         pulses.push(0); elongations.push(0);
      } else {
         // 0=LONG pulse
         pulses.push(1); elongations.push(needs_compensation ? elong_size : 0);
         pulses.push(1); elongations.push(0);
         pulses.push(0); elongations.push(0);
         pulses.push(0); elongations.push(0);
      } 
      if(t % 8 === 0) byte_counter++;
   }

   // turn pulses into samples

   const samples = [];
  
   let ptr = 0 ;
   for(let t=0; t<pulses.length; t++) {
      const b = pulses[t];
      const s = (b == 0) ? -VOLUME : VOLUME;      

      const pixelsize = TURBO_HALFPULSE_SIZE + elongations[t];

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
