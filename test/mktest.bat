@rem run this from parent folder

rem call node dist/vzpack -i test/Laser500/mariel.bin     -o test/Laser500/mariel.vz     -n MARIEL    -t --address 8995
rem call node dist/vzpack -i test/Laser500/amiga_hand.bin -o test/Laser500/amiga_hand.vz -n AMIGAHAND -t --address 8995
rem 
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel0
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel1 --turbo 1
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel2 --turbo 2
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel3 --turbo 3
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel4 --turbo 4
rem 
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand0
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand1 --turbo 1
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand2 --turbo 2
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand3 --turbo 3
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand4 --turbo 4

call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello0
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello1 --turbo 1
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello2 --turbo 2
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello3 --turbo 3
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello4 --turbo 4

call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker0
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker1 --turbo 1
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker2 --turbo 2
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker3 --turbo 3
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker4 --turbo 4

call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris0
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris1 --turbo 1
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris2 --turbo 2
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris3 --turbo 3
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris4 --turbo 4 
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris4F --turbo 4 --header 64 --pulsems 270

call node dist/laser500wav --l310 -i test/Laser310/circus.vz   -o test/Laser310/circus   --turbo 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/crash.vz    -o test/Laser310/crash    --turbo 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/invaders.vz -o test/Laser310/invaders --turbo 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/vz_cave.vz  -o test/Laser310/vz_cave  --turbo 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/dawn.vz     -o test/Laser310/dawn     --turbo 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/kamikaze.vz -o test/Laser310/kamikaze --turbo 4 --header 64 --pulsems 270
