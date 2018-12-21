#include "lib500.h"

byte peek(byte *address) FASTCALL {
   return *address;
}

word peek_word(word *address) FASTCALL {
   return *address;
}

void poke(byte *address, byte value) {
   *address = value;
}

void poke_word(word *address, word value) {
   *address = value;
}

void mapped_io_write(byte value) FASTNAKED {
   __asm 
   di
   ld a, 2
   out (0x41), a

   ld a, l
   ld (0x6800), a
   
   ld a, (0x8666)
   out (0x41), a
   ei
   ret 
   __endasm;
}

byte mapped_io_read() FASTNAKED {
   __asm 
   di
   ld a, 2
   out (0x41), a
   
   ld a, (0x6800)
   ld h, 0
   ld l, a

   ld a, (0x8666)
   out (0x41), a
   ei
   ret 
   __endasm;
}

void outp(byte port, byte value) {
   __asm     
   ld	 ix,0
	add ix,sp
	ld	a,(ix+2)    // value
	ld	c,(ix+4)    // port
   out (c),a   
	__endasm;
}

word *get_cursor_address(byte x, byte y) {   
   //word z = (word) (y >> 3) * 80;
   word z = (word) ((y & 0xF8)<<1)*5;
   word k = (word) (y & 0x7) << 8;
   word add = 0x7800 + z + k + (isText80() ? x : x*2);
   return (word *)add;   
}

void move_cursor(byte x, byte y) {
   word address = (word) get_cursor_address(x,y);
   poke(CURSOR_ROW, x);
   poke(CURSOR_COL, y);
   poke_word(CURSOR_ADDRESS, address);   
}

void rom_prints(byte *pippo) FASTNAKED {   
   __asm
   call 0x62D3
   ret
   __endasm;      
}

void rom_putc(byte c) FASTNAKED {   
   __asm
   ld a, l
   call 0x57D9
   ret
   __endasm;   
}

byte rom_getc() FASTNAKED {   
   __asm
   call 0x58F0
   ld l,a
   ret
   __endasm;   
}

void screen_poke(byte *add, byte c) {   
   __asm 
   di 
   __endasm;
   outp(0x41, 7);
   *add = c;
   outp(0x41, 1);
   __asm 
   ei    
   __endasm;   
}

// TODO find ROM's one
void set_background(byte c) FASTCALL {
   byte v = (peek(PORT_45_LATCH) & 0xF0) | (c & 0x0F);   
   outp(0x45, v);
   poke(PORT_45_LATCH, v);
}

// TODO find ROM's one
void set_foreground(byte c) {
   byte v = (peek(PORT_45_LATCH) & 0x0F) | (c<<4);   
   outp(0x45, v);
   poke(PORT_45_LATCH, v);
}

// TODO find ROM's one
void set_border(byte c) FASTCALL {
   byte v = (peek(PORT_44_LATCH) & 0x0F) | (c<<4);   
   outp(0x44, v);
   poke(PORT_44_LATCH, v);
}

byte isText80() {
   // return *((byte *)PORT_44_LATCH) & 1;
   return *((byte *)TEXT_80);
}

void set_text_mode(byte mode) FASTCALL {
   poke(TEXT_80, mode);
   byte latch = (peek(PORT_44_LATCH) & 0xFE) | mode;   
   poke(PORT_44_LATCH, latch);
   outp(0x44, latch);
}

void cls() {
   rom_putc(CLS);
}

void install_interrupt(void *handler) __z88dk_fastcall __naked
{
   __asm
      di      
      ld (0x8013), hl     ; 0x8012 contains the user interrupt routine
      ld a, $c3           ; normally it is set to RET
      ld (0x8012), a      ; 8012: C3 ?? ?? JP interrupt
      ei
      ret
   __endasm;
}

void uinstall_interrupt() __z88dk_fastcall __naked
{   
   __asm
      di      
      ld a, $c9           ;
      ld (0x8012), a      ; 8012: C9 ?? ?? RET
      ei
      ret
   __endasm;
}

void rom_bell() FASTNAKED {
   __asm   
      jp 0x09E2   ; and ret there      
   __endasm;
}

byte keyboard_hit() FASTNAKED {
   __asm
   di

   ld a, 2
   out (0x41), a

   ; assume key is hit
   ld hl, 1

   ld b, 0xff
   call inner

   ld a, 1
   out (0x41), a

   ei
   ret

inner:
   ld a, (0x68fe)
   cp b
   ret nz

   ld a, (0x68fd)
   cp b
   ret nz

   ld a, (0x68fb)
   cp b
   ret nz

   ld a, (0x68f7)
   cp b
   ret nz

   ld a, (0x68ef)
   cp b
   ret nz

   ld a, (0x68bf)
   cp b
   ret nz

   ld a, (0x687f)
   cp b
   ret nz

   ld a, (0x69ff)
   cp b
   ret nz

   ld a, (0x6aff)
   cp b
   ret nz

   ld a, (0x6bff)
   cp b
   ret nz

   ; row 5 is special because bit 5,4 contains french and german layout bit   
   ld a, (0x68df)
   or 0x30
   cp b
   ret nz

   ; no key was hit
   ld hl, 0
   ret
   
   __endasm;
}

/*
byte keyboard_hit() FASTNAKED {
   __asm
   di

   ld a, 2
   out (0x41), a
   
   call keyboard_hit_inner

   ld a, 1
   out (0x41), a

   ld h, e        ; return value hl = d  (e is zero)
   ld l, d

   ei
   ret

keyboard_hit_inner:  
   ld hl, rows    ; point to key row table
   ld d, 1        ; return value 1=hit 0=not hit
   ld e, 0x30     ; OR value for the first row only (KDA5/KDB5-4 contain french/german bit)
   ld b, 10       ; key row table length
   ld c, 0xff     ; value to check for 0xff = no key hit
   
   loop:
      ld a, (hl)  ; read keyboard row
      or e        ; OR for KDA5 keyboard layout
      cp c        ;
      ret nz      ; if not 0xff then return (with d=1)
      ld e, 0     ; clears the KDA5 or value
      inc hl      ; next row
      inc hl      ;
      djnz loop   ; repeats
      
   ld d, 0        ; all passed, no key way hit, return d=0
   ret

rows:
   defw 0x68fe, 0x68fd, 0x68fb, 0x68f7, 0x68ef, 0x68bf, 0x687f, 0x69ff, 0x6aff, 0x6bff, 0x68df
   
   __endasm;
}
*/

// goes in GRAPHIC mode 3 (160x192x16)
void gr_mode(byte mode) {
   byte io = mapped_io_read();

   if(mode == GR_MODE_OFF) {
      // turn off graphic mode
      mapped_io_write(io & 0b11110111); 

      // set previous text mode
      set_text_mode(isText80());
   } else {
      // turn on graphic mode
      mapped_io_write(io | 0b1000);      

      // sets specific mode
      byte latch = (peek(PORT_44_LATCH) & 0b11111000) | mode;
      outp(0x44, latch);
      poke(PORT_44_LATCH, latch);
   }
}

void set_bank1(byte page) FASTNAKED {
   __asm
   di
   ld a, l
   out (0x41), a   
   ld (0x8666),a    
   ei
   ret 
   __endasm;   
}

void gr_mem_fill(byte value) FASTNAKED {
   __asm

   ; save value
   ld a, l

   ; HL = start video memory
   ld hl, 0x4000

   ; DE = HL + 1
   ld e,l
   ld d,h
   inc de

   ; initialise first byte of block   
   ld (hl), a 
      
   ; BC = length of block in bytes, HL+BC-1 = end address of block

   ld bc, 0x4000

   ; fill memory
   ldir

   ret
   __endasm;
}

// goes in TEXT mode
void mode_0() {

}

word gr3_getrow(byte row) FASTNAKED {
   __asm

   ld e, l
   
   ld   a, e         ; a = e;
   and  0b11000000   ; a = a & 0b11000000;
   ld   l, a         ; l = a;

   rra
   rra               ; a = a >> 2;
   add  a, l         ; a = a + l; 
   ld   l, a         ; l = a;    

   ld   a, e         ; a = r;
   and  0b111000     ; a = a & 0b111000;
   rra
   rra
   rra               ; a = a >> 3;
   ld   h, a         ; h = a;       
   
   ld   a, e         ; a = r;
   and  0b111        ; a = a & 0b111;
   rla
   rla
   rla               ; a = a << 3;
   add  h            ; a = a + h;
   ld   h, a         ; h = a;  

   ret
   __endasm;
}

void gr3_pset(byte col, byte row, byte color) {
   word row_address = gr3_getrow(row);
   word x = col >> 1;
   word address = 0x4000 + row_address + x;
   byte old = peek(address);
   if(col % 2 == 0) old = old & 0xF0 | color;
   else             old = old & 0x0F | (color << 4);
   poke(address, old);
}
