@rem turbo_tape.c was a draft; it is now written completely in assembler
@rem zcc +laser500 turbo_tape.c -a -S -create-app -Cz--audio -o turbo_tape.asm 

@del turbo.bin
@del turbo.raw.asm
@del stub.bin

z80asm --cpu=z80 -s -b turbo.asm 
call node bin2asm.js
z80asm --cpu=z80 -s -b stub.asm 

copy stub.bin ..\turbo_tape_stub.bin

dir *.bin
