export function lo(word: number) {
   return word & 0xff;   
}

export function hi(word: number) {
   return (word >> 8) & 0xff;
}
