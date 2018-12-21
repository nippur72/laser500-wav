#include <lib500.h>
#include <stdio.h>

// this is copied directly from turbo.asm
// with only small modifications

word read_bit() FASTNAKED {
   __asm      

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

   threshold:
      ld l, a
      ld h, 0
      
      ret                           
   __endasm;
}

// read two bits and save bit length value
// the first bit is to acquire the lost synch
// the second is the good one

word read_some_bits() FASTNAKED {
   __asm 
   di
   ld a, 2
   out (0x41), a

   call _read_bit
   call _read_bit
   
   ld a, (0x8666)
   out (0x41), a
   ei
   ret 
   __endasm;
}

byte s[255];
void text_inspect() {
   cls();
   while(1) {
      word b = read_some_bits();
      sprintf(s, "%d\r\n", b);
      rom_prints(s);
   }
}

word draw_h_hl;
byte draw_h_x;
byte draw_h_c;

void draw_horizontal_bar(byte x, byte y, byte color)
{
   draw_h_hl = 0x4000 + gr3_getrow(y);
   draw_h_x = (x >> 1); 
   draw_h_c = color | (color << 4);

   if(x>=2) {
      __asm 
      ld a, (_draw_h_hl) 
      ld l, a
      ld a, (_draw_h_hl+1) 
      ld h, a
      ld a, (_draw_h_x)
      ld b, a
      ld a, (_draw_h_c)
      ld c, a

   draw_h_loop:
      ld (hl), c
      inc hl
      djnz draw_h_loop     
      __endasm;
   }

   if(x % 2 == 1) gr3_pset(x-1, y, color);

   /*
   for(byte xx=0; xx<=x; xx++) {
      gr3_pset(xx, y, color);
   }
   */
}

byte bars[256];

void main() {
   static byte t;
   static word j;
   static byte ruler;
   
   set_border(BLACK);
   gr_mode(GR_MODE_3);
   set_bank1(7);
   gr_mem_fill(0x00);

   while(1) {
      for(t=0; t<255; t++) bars[t] = 0;

      for(j=0; j<512; j++) {
         byte i = read_some_bits();
         bars[i]++;
      }

      for(t=0;t<192;t++) {         
         ruler = t % 8 == 0 ? DARK_GREY : BLACK;
         draw_horizontal_bar(159, t, ruler);
         //draw_horizontal_bar(159, t, GREEN);
         byte w = bars[t];
         if(w>159) w=159;
         draw_horizontal_bar(w, t, YELLOW);
      }
   }

   set_bank1(1);   
   rom_getc();
   gr_mode(GR_MODE_OFF);
   cls();
}
