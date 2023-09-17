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
   address: string;   
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
   { name: 'l310', type: Boolean },
   { name: 'address', type: String }
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

export function printHelp() {
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
