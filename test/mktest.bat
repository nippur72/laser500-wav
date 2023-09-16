@rem run this from parent folder

rem call node dist/vzpack -i test/Laser500/mariel.bin     -o test/Laser500/mariel.vz     -n MARIEL    -t --address 8995
rem call node dist/vzpack -i test/Laser500/amiga_hand.bin -o test/Laser500/amiga_hand.vz -n AMIGAHAND -t --address 8995
rem 
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel0
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel1 -x --turbo-speed 1
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel2 -x --turbo-speed 2
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel3 -x --turbo-speed 3
rem call node dist/laser500wav --l500 -i test/Laser500/mariel.vz -o test/Laser500/mariel4 -x --turbo-speed 4
rem 
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand0
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand1 -x --turbo-speed 1
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand2 -x --turbo-speed 2
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand3 -x --turbo-speed 3
rem call node dist/laser500wav --l500 -i test/Laser500/amiga_hand.vz -o test/Laser500/amiga_hand4 -x --turbo-speed 4

call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello0
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello1 -x --turbo-speed 1
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello2 -x --turbo-speed 2
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello3 -x --turbo-speed 3
call node dist/laser500wav --l310 -i test/Laser310/hello.vz -o test/Laser310/hello4 -x --turbo-speed 4

call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker0
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker1 -x --turbo-speed 1
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker2 -x --turbo-speed 2
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker3 -x --turbo-speed 3
call node dist/laser500wav --l310 -i test/Laser310/test_speaker.vz -o test/Laser310/test_speaker4 -x --turbo-speed 4

call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris0
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris1 -x --turbo-speed 1
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris2 -x --turbo-speed 2
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris3 -x --turbo-speed 3
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris4 -x --turbo-speed 4 
call node dist/laser500wav --l310 -i test/Laser310/tetris.vz -o test/Laser310/tetris4F -x --turbo-speed 4 --header 64 --pulsems 270

call node dist/laser500wav --l310 -i test/Laser310/circus.vz   -o test/Laser310/circus   -x --turbo-speed 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/crash.vz    -o test/Laser310/crash    -x --turbo-speed 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/invaders.vz -o test/Laser310/invaders -x --turbo-speed 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/vz_cave.vz  -o test/Laser310/vz_cave  -x --turbo-speed 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/dawn.vz     -o test/Laser310/dawn     -x --turbo-speed 4 --header 64 --pulsems 270
call node dist/laser500wav --l310 -i test/Laser310/kamikaze.vz -o test/Laser310/kamikaze -x --turbo-speed 4 --header 64 --pulsems 270
