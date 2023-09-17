"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printHelp = exports.options = void 0;
const command_line_args_1 = __importDefault(require("command-line-args"));
exports.options = parseOptions([
    { name: 'input', alias: 'i', type: String, },
    { name: 'output', alias: 'o', type: String },
    { name: 'samplerate', alias: 's', type: Number, defaultValue: 96000 },
    { name: 'volume', alias: 'v', type: Number, defaultValue: 1 },
    { name: 'stereoboost', type: Boolean, defaultValue: false },
    { name: 'invert', type: Boolean, defaultValue: false },
    { name: 'header', type: Number, defaultValue: 128 },
    { name: 'pulsems', type: Number, defaultValue: 277 },
    { name: 'turbo', alias: 'x', type: Number, defaultValue: 0 },
    { name: 'l500', type: Boolean },
    { name: 'l310', type: Boolean },
    { name: 'address', type: String }
]);
function parseOptions(optionDefinitions) {
    try {
        return (0, command_line_args_1.default)(optionDefinitions);
    }
    catch (ex) {
        if (ex.message !== undefined)
            console.log(ex.message);
        else
            console.log(ex);
        process.exit(-1);
    }
}
function printHelp() {
    console.log("Usage: laser500wav -i file -o file [options]");
    console.log("  -i or --input file          the VZ file to be converted in WAV");
    console.log("  -o or --output file         the file name to be created");
    console.log("  --l500                      targets Laser 500/700");
    console.log("  --l310                      targets Laser 110/210/310 VZ 200/300");
    console.log("  -s or --samplerate rate     the samplerate of the WAV file (96000 default)");
    console.log("  -v or --volume number       volume between 0 and 1 (1.0 default)");
    console.log("  --stereoboost               boost volume for stereo cables by inverting the RIGHT channel (default off)");
    console.log("  --invert                    inverts the polarity of the audio (default off)");
    console.log("  --header                    number of header bytes (128 default as in ROM loader)");
    console.log("  --pulsems n                 ROM loader pulse width in microseconds (277 default)");
    console.log("  -x or --turbo speed         0=normal ROM loader WAV, 1-4 turbo tape (4 fastest)");
    console.log("  --addr hexaddress           puts the turbo loading routine at specific address");
}
exports.printHelp = printHelp;
