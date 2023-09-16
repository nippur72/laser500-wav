export interface CommandLineOptions {
    input: string;
    output: string;
    samplerate: number;
    volume: number;
    stereoboost: boolean;
    invert: boolean;
    header: number;
    pulsems: number;
    turbo: number;
    l500: boolean;
    l310: boolean;
}
export declare const options: CommandLineOptions;
