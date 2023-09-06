/* This is the JavaScript code that was used to
 * write a prototype of the turbo tape loader.
 *
 * It was later converted in C and then in Z80 assembler
 * 
 */

// TODO chunck loading 1 of n
// TODO bank loading
// TODO Z80 test suit

const THRESHOLD = 12+6;

function lo(word) {
   return word & 0xff;   
}

function hi(word) {
   return (word >> 8) & 0xff;
}

const memory = new Uint8Array(65536);

function mem_write(address, byte) {
   memory[address] = byte;
}

const tape = require("./tape.js").tape;

let tape_head = 0;
function read_tape() {   
   if(tape_head <0 || tape_head >= tape.length) return 0;   
   return tape[tape_head++];
}

//
// Name: read_bit()
// Purpose: reads a bit from tape and returns it (0 or 1)
//
// Bit 0 is encoded as a pulse of duration <= THRESHOLD
// Bit 1 is encoded as a pulse of duration >  THRESHOLD
//
// It doesn't matter if a pulse is HIGH or LOW, only its 
// duration is relevant. 
//
// To detect variation, pulses are encoded in the file 
// by alternating them betwen H and L
//

let last_bit = 0;
function read_bit() 
{
   let pulse_duration = 0;   

   while(true)
   {
      const bit = read_tape(); // read cassette bit from I/O
      //process.stdout.write(`${bit}`);
      if(bit == last_bit) pulse_duration++;         
      else {
         last_bit = bit;
         if(pulse_duration > THRESHOLD) return 1;
         else return 0;
      }
   }
}

//
// synchronizes the tape input by constantly looking 
// for the header.
// 
// Header is a 4 byte signature that indicates the start
// of the input bit stream.
//
// Once the last bit in the header is read and matched 
// the function returns. Otherwise it continues to scan forever.
//
// Matching is done by putting input bits in 32 bit long shift register
//

const h = [0,0,0,0]; // read buffer

function sync_tape() {
   
   console.log("seeking header");

   const HEAD = [ 0xAA, 0x55, 0xE7, 0x18 ]; // 4 bytes header signature, same as cartdriges :-)  
      
   while(1)
   {
      const bit = read_bit();      
      
      // puts in shift register, it will be done more efficiently in Z80 assembler
      h[0] = ((h[0] << 1) | ((h[1] & 128)>0?1:0)) & 0xFF;
      h[1] = ((h[1] << 1) | ((h[2] & 128)>0?1:0)) & 0xFF;
      h[2] = ((h[2] << 1) | ((h[3] & 128)>0?1:0)) & 0xFF;
      h[3] = ((h[3] << 1) | bit                 ) & 0xFF;

      //const xxx = binary(h[0])+binary(h[1])+binary(h[2])+binary(h[3]);
      //const xxx = hex(h[0])+hex(h[1])+hex(h[2])+hex(h[3]);
      //console.log(xxx);

      if(h[0] == HEAD[0] && h[1] == HEAD[1] && h[2] == HEAD[2] && h[3] == HEAD[3]) return;
   }
}

function binary(x) {
   const s = "0000000" + x.toString(2);
   return s.substr(s.length-8, 8);
}

function hex(x) {
   const s = "00" + x.toString(16);
   return s.substr(s.length-2, 2);
}

//
// reads a byte from the tape and returns it.
//
// Before reading bytes, the input head must be synchronized
// by calling sync_tape()
//
function read_byte() {
   let r = 0;
   for(let t=0; t<8; t++) {
      r = ((r << 1) | read_bit()) & 0xFF; 
   }
   return r;
}

//
// reads a file in turbo tape format and writes it in memory
//
// returns 0 if there has been a loading error
//
// turbo tape format is 
// 4 bytes header: 0xAA, 0x55, 0xE7, 0x18 
// 2 bytes starting address
// 2 bytes length of file
// n bytes file data
// 2 bytes checksum
//
// In a byte, the most significant bits are the first in time to arrive
// Checksum is calculated by adding bytes
//
function turbo_load() {
   let address;
   let length;
   let checksum;

   // DI, OUT (0x41), 2

   // synchronize with header
   sync_tape();

   console.log("sync found");

   // reads info
   address  = read_byte() + read_byte() * 256; 
   length   = read_byte() + read_byte() * 256;    

   console.log(`address: 0x${address.toString(16)}`);
   console.log(`length: ${length}`);
   console.log(`checksum: 0x${checksum.toString(16)}`);

   // puts address and length into checksum
   let ck = 0;
   ck = (ck + lo(address)) & 0xFFFF;
   ck = (ck + hi(address)) & 0xFFFF;
   ck = (ck + lo(length )) & 0xFFFF;
   ck = (ck + hi(length )) & 0xFFFF;
   
   // loads file
   do 
   {
      let b = read_byte();
      mem_write(address, b); // writes in memory      
      address++;
      ck = (ck + b) & 0xFFFF;
      length--;      
   }
   while(length != 0);

   checksum = read_byte() + read_byte() * 256; 

   console.log(`calculated checksum: 0x${ck.toString(16)}`);

   // EI, OUT (0x41), 1

   // verify if load error
   if(ck != checksum) return 0;
   else return 1;
}

//***************************************************************************

// TODO disable interrupt
// TODO enable I/O page 2 on bank 1

/*
unsigned char asm_read_bit() __naked
{
   __asm
   
   last_bit       defb

   push hl
   push de

   ld  hl, 0                        ; hl is pulse_duration      

   loop:
      inc hl                        ; pulse_duration++

      ld  a, (0x6800)               ;
      and 0x80                      ;
      rlc a                         ; read cassette bit in a

      ld e, (last_bit)              ; if bit == last_bit then goto loop
      cp e                          ;
      jr z, loop                    ; 
      
      ld (last_bit), a              ; last_bit = bit
      
      ld a, h                       ; if pulse_duration > THRESHOLD then goto bit_one
      cp THRESHOLD_HIGH             ;
      jr p, bit_one                 ;
      ld a, l                       ;
      cp THRESHOLD_LOW              ;
      jr p, bit_one                 ;

      scf
      ccf                           ; return bit 0
      exit:
      pop de
      pop hl
      ret                           ;

      bit_one:
      scf                           ;
      jr exit                       ; return bit 1
         
   __endasm;
}

void sync_tape() __naked {
   __asm
      
   .hbuf1 defw 0
   .hbuf2 defw 0

   loop:
      call read_bit
      
      ld hl, (hbuf1)        ; put in shift register { h,l,d,e }
      ld de, (hbuf2)        ;
      rl e                  ;
      rl d                  ;
      rl l                  ;
      rl h                  ;
      ld (hbuf1), hl        ;
      ld (hbuf2), de        ;
      
      ; compare shift register with 0xAA, 0x55, 0xE7, 0x18

      ld  a, 0xAA
      cp  h
      jr  nz, loop

      neg a
      cp  l
      jr  nz, loop

      ld  a, 0xE7
      cp  d
      jr  nz, loop

      neg a
      cp  e
      jr  nz, loop

      ret

   __endasm;
}

read_byte() __naked 
{
   __asm
   push bc
   lh c, 0   ; 8 bit shift register
   ld b, 8   ; bit counter
loop:
   call read_bit
   rl c
   djnz loop

   ld  a, c     ; return byte
   pop bc
   ret
   __endasm;
}

unsigned char turbo_load() {
   // address  = hl
   // length   = bc
   // checksum = de

   __asm

   ck defw 0

   call sync_tape
   
   call read_byte
   ld l, a
   call read_byte
   ld h, a

   call read_byte
   ld c, a
   call read_byte
   ld b, a

   call read_byte
   ld e, a
   call read_byte
   ld d, a

   ld (ck), de   

   ld  a, l   ; de = hl + bc
   add a, c   ;
   ld  e, a   ;
   ld  a, h   ;
   adc a, b   ;
   ld  d, a   ;

   loop:
      call read_byte

      ld (hl), a      ; *address = byte

      inc hl          ; address++

      add e           ; ck += b
      ld e, a         ;
      ld a, 0         ;
      adc a, d        ;

      dec bc          ; length--

      ld a, c         ; if length != 0 then goto loop
      or b            ;
      jr nz, loop     ;

      ld hl, (ck)

      ld a, h
      cp d
      jr nz, load_error

      ld a, l
      cp e
      jr nz, load_error

      scf
      ccf   
      ret

load_error:
      scf
      ret
   __endasm;
}
*/

// 10101010010101011110011100011000
// (0b10101010010101011110011100011000).toString(16) = 'aa55e718'

const ok = turbo_load();
if(!ok) console.log("load error");
else console.log("OK");
