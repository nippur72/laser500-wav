import commandLineArgs from 'command-line-args';

export const options = parseOptions([
   { name: 'text', alias: 't', type: Boolean },
   { name: 'binary', alias: 'b', type: Boolean },
   { name: 'input', alias: 'i', type: String, defaultOption: true },
   { name: 'output', alias: 'o', type: String },
   { name: 'name', alias: 'n', type: String },
   { name: 'address', alias: 'a', type: Number },
   { name: 'samplerate', alias: 's', type: Number },
   { name: 'volume', alias: 'v', type: Number },
   { name: 'stereoboost', type: Boolean },
   { name: 'invert', type: Boolean },
   { name: 'header', type: Number },
   { name: 'turbo', alias: 'x', type: Boolean },
   { name: 'turbo-address', type: Number },
   { name: 'turbo-speed', type: Number }
]);

function parseOptions(optionDefinitions: commandLineArgs.OptionDefinition[]) {
    try {
       return commandLineArgs(optionDefinitions);
    } catch(ex: any) {
       if(ex.message !== undefined) console.log(ex.message);
       else console.log(ex);
       process.exit(-1);
    }
}


