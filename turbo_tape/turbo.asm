; TODO improve t-states during read_bit
; TODO auto RUN in stub
; TODO full pulse vs half pulse

defc THRESHOLD = 54  ; this is patched externally from JavaScript

org 0                ; adresses are 0-based and are relocated in JavaScript using .reloc file

;*******************************************************************
; Name: turbo_load()
; Purpose: reads a file in turbo tape format and writes it in memory
; Returns: nothing. Prints "LOADING ERROR" message and back to prompt if it fails
;                   Executes the program by issuing RUN if succedes
;          
; Register modified, A, BC, HL, DE
;
; turbo tape format is 
; 2 bytes header: 0xAA, 0x55
; 2 bytes starting address
; 2 bytes length of file
; n bytes file data
; 2 bytes checksum
;
; In a byte, the most significant bits are the first in time to arrive
; Checksum is calculated by adding bytes
;

turbo_load:
   di              ; disables interrupts 
   ld a, 2         ; and switchs I/O page 
   out (0x41),a    ; in bank 2

   call do_turbo_load

   ld a, (0x8669)    ; restore border color
   out (0x44), a 

   ld a, 1           ; restore rom in bank 2
   out (0x41), a     ; and interrupts 
   ei                ;

   ; *** new version with autorun ***
   jr z, autorun

error:
   ld hl, 0x1935     ; "LOADING ERROR" message in rom
   jp 0x62D3         ; call rom_prints (and RETs there)   

autorun:
   ld hl, 0x5552     ; stuffs "RU" in keyboard buffer
   ld (0x8289),hl 
   ld hl, 0x0d4e     ; stuffs "N\n"  in keyboard buffer
   ld (0x8289+2),hl 
   ld hl, 0x8289     ; keyboard buffer pointer
   ld (0x85f7), hl
   rst 0             ; call reset which triggers keyboard buffer

do_turbo_load:
   ; change border color to red (waiting for sync)
   ld a, (0x8669)
   and 0x0F
   or 0x40
   out (0x44), a 

   ; synchronizes with header
   call sync_tape 

   ; change border color to green (sync OK)
   ld a, (0x8669)
   and 0x0F
   or 0xA0
   out (0x44), a 
   
   ; checksum = 0
   ld hl, 0

   ; address is DE
   call read_byte
   ld e, a
   call checksum_byte

   call read_byte
   ld d, a
   call checksum_byte

   ; length is BC
   call read_byte
   ld c, a
   call checksum_byte

   call read_byte
   ld b, a
   call checksum_byte
      
   ; loads file

   loop_file:
      call read_byte
      ld (de), a         ; *address = byte                       \
      inc de             ; address++                              |
      call checksum_byte ; add to checksum                        |
      dec bc             ; length--                               | 97 T-states
      ld a, c            ; if length != 0 then goto loop          | 
      or b               ;                                       /
      jr nz, loop_file   ;

   ; verify checksum with tape, returns with Z=1 load error
   call read_byte        ; a = lo(checksum)
   cp l                  ;
   ret nz                ;
   call read_byte        ; a = hi(checksum)
   cp h                  ;   
   ret nz                ;

   ; move pointer to end of basic program (VARTAB)
   ld (0x83e9), de

   ; support for continue dropped
   ; call read_byte        ; a = continue? (00=stop)
   ; or a
   ; jr nz, do_turbo_load

   ret                   ;

checksum_byte:   
   ; makes checksum of A in HL (HL = HL + A)
   add l
   ld l, a
   ld a, 0
   adc h
   ld h, a
   ret

;***************************************************************
; Name: read_bit()
; Purpose: reads a bit from tape and returns it (0 or 1)
; Returns: C flag = bit read
; Registers modified: A
;
; Bit 1 is encoded as a SHORT pulse of duration <= THRESHOLD
; Bit 0 is encoded as a LONG  pulse of duration >  THRESHOLD
; A pulse is a complete and symmetrical cycle from HIGH to LOW
;
; It doesn't matter if a pulse is HIGH or LOW, only its 
; duration is relevant. 
;
; To detect variation, pulses are encoded in the file 
; by alternating them betwen high and low

read_bit:
   ; A = pulse width counter
   ; C = THRESHOLD value for compare

   push hl

load_threshold:
   ld hl, 0x6800

   xor a

   ; counts the HIGH (positive) semiwave
   read_bit_loop_H:
      inc a                         
      bit 7, (hl)
      jr nz, read_bit_loop_H
   
   ; counts the LOW (negative) semiwave
   read_bit_loop_L:
      inc a                         
      bit 7, (hl)                  
      jr z, read_bit_loop_L

set_threshold:
   cp THRESHOLD   ; if pulse_duration > THRESHOLD then C = 1; THRESHOLD byte is modified by laser500wav.js
   
   pop hl
   
   ret                           

;***************************************************************
; Name: sync_tape()
; Purpose: synchronizes the tape input by constantly looking 
; for the header
; Returns: nothing (just waits in time)
; Register modified: A, HL, DE
; 
; Header is a 2 byte signature that indicates the start
; of the input bit stream.
;
; Once the last bit in the header is read and matched 
; the function returns. Otherwise it continues to scan forever.
;
; Matching is done by putting input bits in 16 bits long shift register
;

sync_tape:
   loop_sync:
      call read_bit         ; read bit from tape, C=bit
      
      rl e                  ; puts bit in shift register {d,e}
      rl d                  ; DE holds the 16 bit shift register for matching with the header 
      
      ; compare shift register with 0xAA, 0x55 (the header bytes)

      ld  a, 0xAA
      cp  d
      jr  nz, loop_sync

      cpl
      cp  e
      jr  nz, loop_sync
   ret

;**************************************************
; Name: read_byte()
; Purpose: reads a byte from the tape and returns it.
; Returns: A = byte read
; Registers modified: A
;
; Before reading bytes, the input head must be synchronized
; by calling sync_tape()
;
read_byte:
   push bc      

   ld bc, 0x0800         ; b=7 counts bits, c=0 read shift register

   loop_byte:
      call read_bit      ; C=bit read
      rl c               ; insert in shift register, most significant bit first 
      djnz loop_byte     ; loops

   ld a, c               ; returns byte read in A   
      
   pop bc
   ret

; *************************************************************************
; T-STATES COUNT
;
; 97 T-states from last bit of byte[n] to first bit of byte[n+1]
; 120 T-state for 4-bytes shift register sync_tape
;