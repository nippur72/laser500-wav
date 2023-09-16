import fs from "fs";
import path from "path";

function extract_asm_info(rootname: string) {
    const asm_info = {
        reloc: get_reloc_table(rootname),
        symbols: get_sym_table(rootname),
        code: get_code(rootname)
    }
    return asm_info;
}

function get_reloc_table(rootname: string) {
    const reloc_file = fs.readFileSync(`${rootname}.reloc`);
    const reloc_table: number[] = [];
    for(let t=0; t<reloc_file.length; t+=2) {      
       const address = reloc_file.readUInt16LE(t);
       reloc_table.push(address);
    }
    return reloc_table;    
}

function get_sym_table(rootname: string) {
    const symbols = fs.readFileSync(`${rootname}.sym`).toString();

    const regex = /(?<symbol>[^\s]*)\s*=\s*\$(?<address>[0-9a-fA-F]{4})/gm;

    const symbol_table: {[key:string]: number} = {};

    while(true) {
        let match = regex.exec(symbols);   
        if(match === null || match.groups === undefined) break;
        symbol_table[match.groups.symbol] = Number.parseInt(match.groups["address"], 16);        
    }

    return symbol_table;
}

function get_code(rootname: string) {
    const bin_file = fs.readFileSync(`${rootname}.bin`);    
    return Array.from(new Uint8Array(bin_file));    
}


function embed_asm_file(rootname: string, outname: string, varname: string) {
    const ob = extract_asm_info(rootname);
    const file_content = `// file generated automatically, do not edit\r\n\r\n`+
                         `export const ${varname} = ${JSON.stringify(ob,undefined,3)};`;
    fs.writeFileSync(outname, file_content );
}

embed_asm_file(path.resolve(__dirname, "../turbo_tape/turbo_L310"), path.resolve(__dirname, "../src/turbo_L310_asm_info.ts"), "turbo_L310_asm_info");
embed_asm_file(path.resolve(__dirname, "../turbo_tape/turbo_L500"), path.resolve(__dirname, "../src/turbo_L500_asm_info.ts"), "turbo_L500_asm_info");

