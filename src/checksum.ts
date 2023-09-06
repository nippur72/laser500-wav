import { hi, lo } from "./utils";

function cksum_byte(c: number, sum: number) {
   sum = (sum + c) & 0xFFFF;
   return sum;
}

function cksum_word(word: number, sum: number) {
   sum = cksum_byte(lo(word), sum);
   sum = cksum_byte(hi(word), sum);
   return sum;
}

export function calculate_checksum(program: Buffer, startAddress: number, endAddress: number) {
   let checksum = 0;
   for(let t=0; t<program.length; t++) {
      checksum = cksum_byte(program[t], checksum);
   }
   checksum = cksum_word(startAddress, checksum);   
   checksum = cksum_word(endAddress, checksum);   
   return checksum;
}
