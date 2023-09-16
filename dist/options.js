"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = void 0;
const command_line_args_1 = __importDefault(require("command-line-args"));
exports.options = parseOptions([
    { name: 'input', alias: 'i', type: String, defaultOption: true },
    { name: 'output', alias: 'o', type: String },
    { name: 'samplerate', alias: 's', type: Number },
    { name: 'volume', alias: 'v', type: Number },
    { name: 'stereoboost', type: Boolean },
    { name: 'invert', type: Boolean },
    { name: 'header', type: Number },
    { name: 'pulsems', type: Number },
    { name: 'turbo', alias: 'x', type: Boolean },
    { name: 'turbo-speed', type: Number },
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
