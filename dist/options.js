"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = void 0;
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
    { name: 'l310', type: Boolean }
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
