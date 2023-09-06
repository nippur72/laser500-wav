// see turbo_tape.js for high level implementation

#include <stdio.h>
#include <lib500.h>

void read_bit();

unsigned int save_bit_len;

#define THRESHOLD 68

unsigned char min_0=255;
unsigned char max_0=0;
unsigned char min_1=255;
unsigned char max_1=0;

unsigned char *wr;

byte acc[256];

unsigned char sbuf[256];

void eye_pattern() {
   set_text_mode(MODE_TEXT_80);
   cls();
   rom_prints("sum of bits\r\n");

   while(1)
   {
      for(int t=0;t<256;t++) acc[t]=0;

      __asm
      di              ; disables interrupts 
      ld a, 2         ; and switchs I/O page 
      out (0x41),a    ; in bank 2
      __endasm;

      for(int t=0;t<256;t++) acc[t] = 0;

      for(int t=0;t<2048;t++) {
         read_bit();
         read_bit(); 
         acc[save_bit_len]++;
      }

      __asm
      ld a, 1           ; restore rom in bank 2
      out (0x41), a     ; and interrupts 
      ei                ;
      __endasm;            

      for(int t=0;t<256;t++) {
         if(acc[t]>0) {
            sprintf(sbuf, "(%d:%d)", t, acc[t]);
            rom_prints(sbuf);            
         }
      }
      rom_prints("\r\n--------------------------------------\r\n");
   }
}

void test_bits() {   
   unsigned char buf[20];

   set_text_mode(MODE_TEXT_80);
   cls();
   rom_prints("testing bits\r\n\r\n");

   unsigned int counter = 0;
   
   while(1)
   {
      __asm
      di              ; disables interrupts 
      ld a, 2         ; and switchs I/O page 
      out (0x41),a    ; in bank 2
      __endasm;

      wr = buf;
      read_bit();      
      read_bit(); 
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      read_bit(); *wr++ = save_bit_len; read_bit(); read_bit();
      
      __asm
      ld a, 1           ; restore rom in bank 2
      out (0x41), a     ; and interrupts 
      ei                ;
      __endasm;            

      for(int t=0;t<16;t++) {
         unsigned char r = buf[t];
         unsigned char bit = (buf[t] > THRESHOLD);

         if(bit == 0) {
            if(r<min_0) min_0 = r;
            if(r>max_0) max_0 = r;
         }
         else {
            if(r<min_1) min_1 = r;
            if(r>max_1) max_1 = r;
         }

         sprintf(sbuf, "%2d  ", (int)buf[t]);
         rom_prints(sbuf);
      }      
      rom_prints("\r\n");
      
      counter++;
      if(counter % 10 == 0) {
         sprintf(sbuf, "\r\n0=[%d,%d] <-- %d -->  1=[%d,%d]\r\n", (int)min_0, (int)max_0, (int)THRESHOLD, (int)min_1, (int)max_1);         
         rom_prints(sbuf);
         min_0 = 255;
         min_1 = 255;
         max_0 = 0;
         max_1 = 0;
      }
   }
}

int main() {
   eye_pattern();
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

void read_bit() __naked {
   __asm      
   
   ; B = pulse width counter
   ; C = THRESHOLD value for compare

   push bc
   push hl                         

   ld  hl, 0x6800                   ; hl points to cassette I/O address
   ld  bc, THRESHOLD                ; B is pulse_duration (0), C=THRESHOLD
   
   read_bit_loop0:
      inc b                         
      bit 7, (hl)
      jr nz, read_bit_loop0
   
   read_bit_loop1:
      inc b                         
      bit 7, (hl)                  
      jr z, read_bit_loop1
      
   ld a, c                          ; if pulse_duration > THRESHOLD then goto bit_one
   cp b                             ; 
  
   ld c,b
   ld b,0
   ld (_save_bit_len), bc

   pop hl
   pop bc
      
   ret

   __endasm;
}

/*
void read_bit_old() __naked {
   __asm      
   
   ; B = pulse width counter
   ; C = THRESHOLD value for compare
   ; E = value of current bit for compare
   ; D = value of last_bit for compare   

   push bc
   push hl
   push de                          

   ld  hl, 0x6800                   ; hl points to cassette I/O address
   ld  bc, THRESHOLD                ; B is pulse_duration (0), C=THRESHOLD

   ld  a, (last_bit)
   ld  d, a                         ; d is last_bit value      
   
   read_bit_loop:
      inc b                         ; pulse_duration++            
      ld e, (hl)                    ; read cassette (bit 7) in e.        
      cp e                          ; if bit (a) == last_bit (e) then goto loop
      jr z, read_bit_loop           ; 
   
   ld a, e                          ; last_bit = bit
   ld (last_bit), a                 ; 
   
   ld a, c                          ; if pulse_duration > THRESHOLD then goto bit_one
   cp b                             ; 

   ld e,b
   ld d,0
   ld (_save_bit_len), de

   pop bc
   pop de
   pop hl
   
   ret                           

   last_bit:  defb 0   

   __endasm;
}
*/