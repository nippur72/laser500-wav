import commandLineArgs from 'command-line-args';

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

export const options = parseOptions([
   { name: 'input', alias: 'i', type: String,  },
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
]) as CommandLineOptions;

function parseOptions(optionDefinitions: commandLineArgs.OptionDefinition[]) {
    try {
       return commandLineArgs(optionDefinitions);
    } catch(ex: any) {
       if(ex.message !== undefined) console.log(ex.message);
       else console.log(ex);
       process.exit(-1);
    }
}
