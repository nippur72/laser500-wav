import commandLineArgs from 'command-line-args';

export const options = parseOptions([
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

function parseOptions(optionDefinitions: commandLineArgs.OptionDefinition[]) {
    try {
       return commandLineArgs(optionDefinitions);
    } catch(ex: any) {
       if(ex.message !== undefined) console.log(ex.message);
       else console.log(ex);
       process.exit(-1);
    }
}


