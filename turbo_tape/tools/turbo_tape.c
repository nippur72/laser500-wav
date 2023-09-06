// see turbo_tape.js for high level implementation

#include <stdio.h>
#include <lib500.h>

void read_bit();
void sync_tape();
void read_byte();
void turbo_load();
void relocate();

//#define DEBUG 1

#ifdef DEBUG
   unsigned int save_bit_len;
   unsigned int save_byte;
   unsigned int save_address;
   unsigned int save_length;
   unsigned int save_file_checksum;
   unsigned int save_calc_checksum;
#endif

/*
void test_bits() {
   unsigned char sbuf[16];
   unsigned char buf[32];

   while(1)
   {
      __asm
      di              ; disables interrupts 
      ld a, 2         ; and switchs I/O page 
      out (0x41),a    ; in bank 2
      __endasm;
            
      //read_bit();
      //read_bit();
      //read_bit();
      //read_bit();      

      //for(int t=0;t<32;t++) {
      //   read_byte();
      //   buf[t] = (char) saved;
      //}
      //sbuf[15] = 0;

      sync_tape();
      
      __asm
      ld a, 1           ; restore rom in bank 2
      out (0x41), a     ; and interrupts 
      ei                ;
      __endasm;

      rom_prints("synched !!! \r\n");
      
      //for(int t=0;t<32;t++) {
      //   sprintf(sbuf, "%2X ", buf[t]);
      //   rom_prints(sbuf);
      //}
      //rom_prints("\r\n");
      
   }
}
*/

int main() {
   turbo_load();   
   //rom_prints("\x1B""BTURBO LOADING""\x1B""A\r\n");
   /*
   while(1) {
      turbo_load();
      sprintf(sbuf, "address: %4X\r\n", save_address); rom_prints(sbuf);
      sprintf(sbuf, "length: %4X\r\n", save_length); rom_prints(sbuf);
      sprintf(sbuf, "file checksum: %4X\r\n", save_file_checksum); rom_prints(sbuf);
      sprintf(sbuf, "calc checksum: %4X\r\n", save_calc_checksum); rom_prints(sbuf);
      if(save_file_checksum == save_calc_checksum) break;
   }
   //test_bits();
   */
}

//
// Name: read_bit()
// Purpose: reads a bit from tape and returns it (0 or 1)
// Returns: C flag = bit read
// Registers modified: A
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

void basic_stub() __naked
{
   __asm
stub:  
   defm "zzzzzzzzzzzzzzzzzzzzzzzzzzzzz" 
   defw 0x89A3                 ; points to next line 
   defw 0x00A0                 ; 10 (line number)
   defb 0x41, 0xf0, 0x0c       ; A=&H
   defw 0x89A2                 ; address
   defb 0x3a, 0xb6, 0x20, 0x41 ; :CALL A
   defb 0x00                   ; line terminator
   defw 0x0000                 ; end of program (0x89A3 points here)
   defb 0x00, 0x00, 0x00       ; filler
   __endasm;
}

void read_bit() __naked {
   __asm      

start_of_turbo_tape:   

   push hl                          ; save registers
   push de                          ;
   push bc

   ld  bc, last_bit                 ; bc points to last_bit   
   ld  l, 00                        ; l is pulse_duration      

   loop:
      inc l                         ; pulse_duration++      

      ld  a, (0x6800)               ;
      and 128                       ; TODO sub with register
      rlca                          ; read cassette (bit 7) in e
      ld  e, a                      ;             

      ld a, (bc)                    ; if bit == last_bit then goto loop
      cp e                          ; TODO sub (bc) with h
      jr z, loop                    ; 
   
   ld a, e                          ;
   ld (bc), a                       ; last_bit = bit
   
   ld a, l                          ; if pulse_duration > THRESHOLD then goto bit_one
   cp 30                            ; THRESHOLD
   jp nc, bit_one                   ;

   bit_zero:
      scf                           ;
      ccf                           ; return bit 0 (CF=0)

   exit:
#ifdef DEBUG      
      ld (_save_bit_len), hl
#endif
      pop bc                        ;
      pop de                        ; restore registers
      pop hl                        ;    
      ret                           

   bit_one:

      scf                           ;
      jr exit                       ; return bit 1 (CF=1)   

   last_bit:  defb 0   

   __endasm;
}

//
// Name: sync_tape()
// Purpose: synchronizes the tape input by constantly looking 
// for the header
// Returns: nothing (just waits in time)
// Register modified: A
// 
// Header is a 4 byte signature that indicates the start
// of the input bit stream.
//
// Once the last bit in the header is read and matched 
// the function returns. Otherwise it continues to scan forever.
//
// Matching is done by putting input bits in 32 bits long shift register
//

void sync_tape() __naked {
   __asm
      
   push hl
   push de

   loop_sync:
      call _read_bit        ; read bit from tape, C=bit
      
      rl e                  ; puts bit in shift register { h,l,d,e }
      rl d                  ;
      rl l                  ;
      rl h                  ;
      
      ; compare shift register with 0xAA, 0x55, 0xE7, 0x18 (the header bytes)

      ld  a, 0xAA
      cp  h
      jr  nz, loop_sync

      cpl
      cp  l
      jr  nz, loop_sync

      ld  a, 0xE7
      cp  d
      jr  nz, loop_sync

      cpl
      cp  e
      jr  nz, loop_sync

   pop de
   pop hl

   ret

   __endasm;
}

//
// Name: read_byte()
// Purpose: reads a byte from the tape and returns it.
// Returns: A = byte read
// Registers modified: A
//
// Before reading bytes, the input head must be synchronized
// by calling sync_tape()
//

void read_byte() __naked {
   __asm
   push bc   
   push hl

   ld bc, 0x0800 ; b=7 counts bits, c=0 read shift register

   loop_byte:
      call _read_bit     ; C=bit read
      rl c               ; insert in shift register, most significant bit first 
      djnz loop_byte     ; loops

   ld  a, c              ; return byte

#ifdef DEBUG
   ld l, a
   ld h, 0
   ld (_save_byte), hl
#endif
   
   pop hl
   pop bc
   ret
   __endasm;
}

//
// Name: turbo_load()
// Purpose: reads a file in turbo tape format and writes it in memory
// Returns: nothing
// Register modified, A, BC, HL, DE
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

void turbo_load() __naked {
   __asm

   di              ; disables interrupts 
   ld a, 2         ; and switchs I/O page 
   out (0x41),a    ; in bank 2

   call do_turbo_load

   ld a, 1           ; restore rom in bank 2
   out (0x41), a     ; and interrupts 
   ei                ;

   ret z             ; if load is ok, exit without message

   ld hl, 0x1935     ; "LOADING ERROR" message in rom
   jp 0x62D3         ; call rom_prints (and RETs there)   

   ;=========================
   do_turbo_load:

#ifdef DEBUG   
   ld a, 0xF1
   out (0x45), a
#endif

   ; synchronizes with header
   call _sync_tape 

#ifdef DEBUG   
   ; debug
   ld a, 0xE2
   out (0x45), a
#endif
   
   ; address is DE
   call _read_byte
   ld e, a
   call _read_byte
   ld d, a

   ; length is BC
   call _read_byte
   ld c, a
   call _read_byte
   ld b, a

#ifdef DEBUG   
   ; debug 
   ld (_save_address), de
   ld (_save_length), bc   
#endif
   
   ; checksum = 0
   ld hl, 0

   ; puts address and length into checksum
   ld a, e
   call checksum_byte
   ld a, d
   call checksum_byte
   ld a, c
   call checksum_byte
   ld a, b
   call checksum_byte
   
   ; loads file

   loop_file:
      call _read_byte

      ld (de), a       ; *address = byte

      inc de           ; address++

      call checksum_byte ; add to checksum

      ; TODO animate border here

      dec bc           ; length--

      ld a, c          ; if length != 0 then goto loop
      or b             ;
      jr nz, loop_file ;

#ifdef DEBUG
   ; when debugging checksum is read from tape into BC and saved in memory
   ; when not debugging storing is not necessary and we can compare checksum
   ; without passing from BC thus saving bytes
   
   ; calc checksum is HL, file checksum is BC
   call _read_byte
   ld c, a
   call _read_byte
   ld b, a

   ld (_save_file_checksum), bc
   ld (_save_calc_checksum), hl

   ld a, l
   cp c
   ret nz
   ld a, h
   cp b
   ret
#else
   ; verify checksum with tape, returns with Z=1 load error
   call _read_byte       ; a = lo(checksum)
   cp l                  ;
   ret nz                ;
   call _read_byte       ; a = hi(checksum)
   cp h                  ;   
   ret                   ;
#endif

checksum_byte:   
   ; adds A to checksum in HL
   add l
   ld l, a
   ld a, 0
   adc h
   ld h, a
   ret

end_of_turbo_tape:
   __endasm;
}

//
// Name: relocate
// Purpose relocate the turbo load routine at bottom of memory
// and the passes control to it
// Returns: nothing
//

void relocate() __naked {
   __asm

   ld hl, start_of_turbo_tape
   ld de, 0xF000      ; topmem
   ld bc, end_of_turbo_tape - start_of_turbo_tape + 1
   
   ; relocate
   ldir

   jp _turbo_load
   // TODO run here?
   ld hl, stub
   defm "zzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
   __endasm;
}
