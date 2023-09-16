export declare const VZ_BASIC = 240;
export declare const VZ_BINARY = 241;
export type VZFILETYPE = typeof VZ_BASIC | typeof VZ_BINARY;
export declare function packvz(filename: string, type: number, start: number, data: Uint8Array): Uint8Array;
export interface VZInfo {
    filename: string;
    type: VZFILETYPE;
    start: number;
    data: Uint8Array;
}
export declare function unpackvz(vz: Uint8Array): VZInfo;
