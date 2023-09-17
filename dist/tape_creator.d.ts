/// <reference types="node" />
import { VZFILETYPE, VZInfo } from "./vz";
import { CommandLineOptions as TypedOptions } from "./options";
export interface Tape {
    tapeName: string;
    fileType: VZFILETYPE;
    startAddress: number;
    program: Buffer;
    headerLen: number;
    tailLen: number;
    PULSE_SHORT: number;
    PULSE_LONG: number;
    SAMPLE_RATE: number;
    VOLUME: number;
    laser500: boolean;
}
export interface TurboTape {
    THRESHOLD: number;
    TURBO_HALFPULSE_SIZE: number;
    TURBO_INVERT: boolean;
    TURBO_ADDRESS: number | undefined;
}
export declare function VZ_to_WAV(VZ: VZInfo, options: TypedOptions): ArrayBuffer;
