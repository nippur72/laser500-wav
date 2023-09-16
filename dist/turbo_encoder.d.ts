/// <reference types="node" />
import { Tape, TurboTape } from "./tape_creator";
export declare function decodeBitSize(speed: number, SAMPLE_RATE: number, laser500: boolean): {
    THRESHOLD: number;
    TURBO_HALFPULSE_SIZE: number;
    TURBO_INVERT: boolean;
};
export declare function getTurboBytes(startAddress: number, program: Buffer): number[];
export declare function TT_bitsToSamples(bits: number[], tape: Tape, turbo: TurboTape): number[];
