;* * * * *  Small-C/Plus z88dk * * * * *
;  Version: 12970-824f4b9-20180926
;
;	Reconstructed for z80 Module Assembler
;
;	Module compile time: Tue Dec 18 15:26:49 2018



	MODULE	turbo_tape_c


	INCLUDE "z80_crt0.hdr"


	SECTION	code_compiler

; Function main flags 0x00000000 __stdc 
; int main()
._main
	call	_turbo_load
	ret



; Function basic_stub flags 0x00000a00 __smallc __naked 
; void basic_stub()
._basic_stub
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

; Function read_bit flags 0x00000a00 __smallc __naked 
; void read_bit()
._read_bit
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
      pop bc                        ;
      pop de                        ; restore registers
      pop hl                        ;    
      ret                           
   bit_one:
      scf                           ;
      jr exit                       ; return bit 1 (CF=1)   
   last_bit:  defb 0   

; Function sync_tape flags 0x00000a00 __smallc __naked 
; void sync_tape()
._sync_tape
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

; Function read_byte flags 0x00000a00 __smallc __naked 
; void read_byte()
._read_byte
   push bc   
   push hl
   ld bc, 0x0800 ; b=7 counts bits, c=0 read shift register
   loop_byte:
      call _read_bit     ; C=bit read
      rl c               ; insert in shift register, most significant bit first 
      djnz loop_byte     ; loops
   ld  a, c              ; return byte
   pop hl
   pop bc
   ret

; Function turbo_load flags 0x00000a00 __smallc __naked 
; void turbo_load()
._turbo_load
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
   ; synchronizes with header
   call _sync_tape 
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
   ; verify checksum with tape, returns with Z=1 load error
   call _read_byte       ; a = lo(checksum)
   cp l                  ;
   ret nz                ;
   call _read_byte       ; a = hi(checksum)
   cp h                  ;   
   ret                   ;
checksum_byte:   
   ; adds A to checksum in HL
   add l
   ld l, a
   ld a, 0
   adc h
   ld h, a
   ret
end_of_turbo_tape:

; Function relocate flags 0x00000a00 __smallc __naked 
; void relocate()
._relocate
   ld hl, start_of_turbo_tape
   ld de, 0xF000      ; topmem
   ld bc, end_of_turbo_tape - start_of_turbo_tape + 1
   ; relocate
   ldir
   jp _turbo_load
   ld hl, stub
   defm "zzzzzzzzzzzzzzzzzzzzzzzzzzzzz"

; --- Start of Static Variables ---

	SECTION	bss_compiler
	SECTION	code_compiler


; --- Start of Scope Defns ---

	GLOBAL	open
	GLOBAL	creat
	GLOBAL	close
	GLOBAL	read
	GLOBAL	write
	GLOBAL	lseek
	GLOBAL	readbyte
	GLOBAL	writebyte
	GLOBAL	getcwd
	GLOBAL	chdir
	GLOBAL	getwd
	GLOBAL	rmdir
	GLOBAL	_RND_BLOCKSIZE
	GLOBAL	rnd_loadblock
	GLOBAL	rnd_saveblock
	GLOBAL	rnd_erase
	GLOBAL	__FOPEN_MAX
	GLOBAL	__sgoioblk
	GLOBAL	__sgoioblk_end
	GLOBAL	fopen_zsock
	GLOBAL	fopen
	GLOBAL	freopen
	GLOBAL	fdopen
	GLOBAL	_freopen1
	GLOBAL	fmemopen
	GLOBAL	funopen
	GLOBAL	fclose
	GLOBAL	fflush
	GLOBAL	closeall
	GLOBAL	fgets
	GLOBAL	fputs
	GLOBAL	fputc
	GLOBAL	fputs_callee
	GLOBAL	fputc_callee
	GLOBAL	fgetc
	GLOBAL	ungetc
	GLOBAL	feof
	GLOBAL	puts
	GLOBAL	ftell
	GLOBAL	fgetpos
	GLOBAL	fseek
	GLOBAL	fread
	GLOBAL	fwrite
	GLOBAL	gets
	GLOBAL	printf
	GLOBAL	fprintf
	GLOBAL	sprintf
	GLOBAL	snprintf
	GLOBAL	vfprintf
	GLOBAL	vsnprintf
	GLOBAL	printn
	GLOBAL	scanf
	GLOBAL	fscanf
	GLOBAL	sscanf
	GLOBAL	vfscanf
	GLOBAL	vsscanf
	GLOBAL	getarg
	GLOBAL	fchkstd
	GLOBAL	fgetc_cons
	GLOBAL	fgetc_cons_inkey
	GLOBAL	fputc_cons
	GLOBAL	fgets_cons
	GLOBAL	fabandon
	GLOBAL	fdtell
	GLOBAL	fdgetpos
	GLOBAL	rename
	GLOBAL	remove
	GLOBAL	getk
	GLOBAL	getk_inkey
	GLOBAL	printk
	GLOBAL	_peek
	GLOBAL	_peek_word
	GLOBAL	_poke
	GLOBAL	_poke_word
	GLOBAL	_outp
	GLOBAL	_mapped_io_write
	GLOBAL	_mapped_io_read
	GLOBAL	_set_bank1
	GLOBAL	_install_interrupt
	GLOBAL	_uinstall_interrupt
	GLOBAL	_rom_getc
	GLOBAL	_rom_bell
	GLOBAL	_keyboard_hit
	GLOBAL	_read_keyboard
	GLOBAL	_set_background
	GLOBAL	_set_foreground
	GLOBAL	_set_border
	GLOBAL	_get_cursor_address
	GLOBAL	_move_cursor
	GLOBAL	_rom_prints
	GLOBAL	_rom_putc
	GLOBAL	_screen_poke
	GLOBAL	_isText80
	GLOBAL	_set_text_mode
	GLOBAL	_cls
	GLOBAL	_gr_mode
	GLOBAL	_gr_mem_fill
	GLOBAL	_gr3_getrow
	GLOBAL	_gr3_pset
	GLOBAL	_read_bit
	GLOBAL	_sync_tape
	GLOBAL	_read_byte
	GLOBAL	_turbo_load
	GLOBAL	_relocate
	GLOBAL	_main
	GLOBAL	_basic_stub


; --- End of Scope Defns ---


; --- End of Compilation ---
