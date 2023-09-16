; TODO improve t-states during read_bit
; TODO load HL out of read_bit

defc THRESHOLD = 54  ; this is patched externally from JavaScript

IF LASER500
   defc STARTADDR = 8662h    ; (word) start address of the loaded program
   defc VZTYPE    = 866Bh    ; type of file F0 or F1
   defc ROM_RUN   = 1766h    ; entry point in ROM that executes T: or B:
ENDIF
IF LASER310
   defc STARTADDR = 781Eh    ; (word) start address of the loaded program   
   defc VZTYPE    = 7AD2h    ; type of file F0 or F1
   defc ROM_RUN   = 36BFh    ; entry point in ROM that executes T: or B:        
ENDIF

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

   ld a, $f1       ; file type is fixed and it's changed from JavaScript
   ld (VZTYPE), a  ;     

   di              ; disables interrupts 

   IF LASER500
      ld a, 2        ; selects I/O
      out (41h),a    ; in bank 2
   ENDIF

   call do_turbo_load   ; Z loaded ok, NZ there's load error

   IF LASER500
      ld a, (8669h)     ; restore border color
      out (44h), a 
      ld a, 1           ; restore page 1 ROM
      out (41h), a      ; in bank 2
   ENDIF      

   ei                   ; restore interrupts 
   
   jr z, autorun

error:
   IF LASER500
      ld hl, 1935h      ; "LOADING ERROR" message in rom
      jp 62D3h          ; call rom_prints (and RETs there)  ; JP 18F3 is the rom entry for loading error                        
   ENDIF
   IF LASER310      
      ld hl, 384Ah      ; text "LOADING ERROR"
      call 28A7h        ; prints message 
      ld hl, 1929h      ; text "READY"
      call 28A7h        ; prints message       
      jp 1AE8h          ; return to basic
   ENDIF

autorun:
   jp ROM_RUN           ; executes the T: or B: program from ROM

do_turbo_load:
   ; change screen color to signal "waiting for sync"
   IF LASER500
      ; change border color to red
      ld a, (8669h)
      and 0Fh
      or 40h
      out (44h), a 
   ENDIF
   IF LASER310          
      ; change screen color to orange
      ld a, 16          
      ld (6800h), a    
   ENDIF

   ; synchronizes with header
   call sync_tape 

   ; change color to signal "sync OK"
   IF LASER500
      ; green border color   
      ld a, (8669h)
      and $0F
      or $A0
      out (44h), a 
   ENDIF
   IF LASER310          
      ; green screen color
      xor a          
      ld (6800h), a    
   ENDIF
   
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

   ; save start address for later execution
   ld (STARTADDR), de

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

   ; verify in-memory checksum with the one saved on tape, returns NZ load error, Z load ok
   call read_byte        ; a = lo(checksum)
   cp l                  ;
   ret nz                ;
   call read_byte        ; a = hi(checksum)
   cp h                  ;   
   ;ret nz               ; implicit ret nz
   ret                   

checksum_byte:   
   ; makes checksum of A in HL (HL = HL + A)
   add l
   ld l, a
   ld a, 0    ; can't do "xor a" here, we need the carry intact
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

   ld hl, 6800h

   xor a

   ; counts the HIGH (positive) semiwave
   read_bit_loop_H:
      inc a      
      IF LASER500                   
         bit 7, (hl)
      ENDIF
      IF LASER310                   
         bit 6, (hl)
      ENDIF
      jr nz, read_bit_loop_H
   
   ; counts the LOW (negative) semiwave
   read_bit_loop_L:
      inc a                         
      IF LASER500                   
         bit 7, (hl)
      ENDIF
      IF LASER310                   
         bit 6, (hl)
      ENDIF
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
; Header is a 2 byte signature (AAh,55h) that indicates the start
; of the input bit stream.
;
; Once the last bit in the header is read and matched 
; the function returns. Otherwise it continues to scan forever.
;
; Matching is done by putting input bits in 16 bits long shift register
;

sync_tape:
   call read_bit         ; read bit from tape, C=bit
   
   rl e                  ; puts bit in shift register {d,e}
   rl d                  ; DE holds the 16 bit shift register for matching with the header 
   
   ld  a, $AA            ; compare with AA
   cp  d
   jr  nz, sync_tape

   cpl                   ; compare with 55 (AA negated)
   cp  e
   jr  nz, sync_tape
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

   ld bc, 0800h         ; b=7 counts bits, c=0 read shift register

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