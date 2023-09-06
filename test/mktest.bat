@rem run this from parent folder
call node dist/laser500wav -i test/mariel.bin -o test/mariel0 -n MARIEL0 -b
call node dist/laser500wav -i test/mariel.bin -o test/mariel1 -n MARIEL1 -x --turbo-speed 1
call node dist/laser500wav -i test/mariel.bin -o test/mariel2 -n MARIEL2 -x --turbo-speed 2
call node dist/laser500wav -i test/mariel.bin -o test/mariel3 -n MARIEL3 -x --turbo-speed 3
call node dist/laser500wav -i test/mariel.bin -o test/mariel4 -n MARIEL4 -x --turbo-speed 4

call node dist/laser500wav -i test/amiga_hand.bin -o test/amiga_hand0 -n AMIGAHAND0 --header 32 -t
call node dist/laser500wav -i test/amiga_hand.bin -o test/amiga_hand1 -n AMIGAHAND1 --header 32 -x --turbo-speed 1
call node dist/laser500wav -i test/amiga_hand.bin -o test/amiga_hand2 -n AMIGAHAND2 --header 32 -x --turbo-speed 2
call node dist/laser500wav -i test/amiga_hand.bin -o test/amiga_hand3 -n AMIGAHAND3 --header 32 -x --turbo-speed 3
call node dist/laser500wav -i test/amiga_hand.bin -o test/amiga_hand4 -n AMIGAHAND4 --header 32 -x --turbo-speed 4

