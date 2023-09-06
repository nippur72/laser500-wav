@rem zcc +laser500 lib500.c %1.c -pragma-define:CRT_INITIALIZE_BSS=0 -pragma-define:CLIB_EXIT_STACK_SIZE=0 -pragma-define:CRT_ENABLED_STDIO=0 -pragma-define:CLIB_FOPEN_MAX=0 -O2 -create-app -Cz--audio -o %1.bin
@rem -lm is math

@SET PRG=gr_inspect

@del %PRG%.bin
zcc +laser500 lib500.c %PRG%.c --list -O2 -create-app -Cz--audio -o %PRG%.bin
@del *.cas

