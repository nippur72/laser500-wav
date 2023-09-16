@del *.bin

z80asm -s -b -l -reloc-info -DLASER500=1 -oturbo_L500.bin turbo.asm
copy turbo.sym   turbo_L500.sym
copy turbo.lis   turbo_L500.lis

z80asm -s -b -l -reloc-info -DLASER310=1 -oturbo_L310.bin turbo.asm
copy turbo.sym   turbo_L310.sym
copy turbo.lis   turbo_L310.lis

call node ..\dist\js_asm_embed

@del *.o
@del turbo.sym
@del turbo.lis

dir *.bin
