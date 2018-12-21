MODULE	turbotape

;
; calculate the entry point of the turbo tape routine
; after the relocation below the Basic text
;
defc routine_length = end_of_turbo_tape - start_of_turbo_tape + 1        ; TODO check if +1 is necessary
defc turbo_load_entry = 0x8995 - routine_length

org 0x8995

stub:  
   defw 0x89A3                 ; points to next line 
   defw 0x000A                 ; 10 (line number)
   defb 0x41, 0xf0, 0x0c       ; A=&H
   defw relocate               ; address
   defb 0x3a, 0xb6, 0x20, 0x41 ; :CALL A
   defb 0x00                   ; line terminator
   defw 0x0000                 ; end of program (0x89A3 points here)
   defb 0xFF, 0xFF, 0xFF       ; filler: when the program is run
   defb 0xFF, 0xFF, 0xFF       ; the assignment A=&H.... in line 10    
   defb 0xFF, 0xFF, 0xFF       ; will overwrite this area so we need   
   defb 0xFF                   ; to save writing over our routine   
   
;*************************************************************
; Name: relocate()
; Purpose relocate the turbo load routine at bottom of memory
; and the passes control to it
; Returns: nothing
;
relocate:
   ld hl, start_of_turbo_tape
   ld de, turbo_load_entry      
   ld bc, routine_length - 1         
   
   ; relocate
   ldir

   jp turbo_load_entry      

start_of_turbo_tape:   

INCLUDE "turbo.raw.asm"

end_of_turbo_tape:
