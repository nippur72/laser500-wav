const fs = require("fs");

const fileName = "turbo.bin";
const outName = "turbo.raw.asm";

const buffer = fs.readFileSync(fileName);

const bytes = new Uint8Array(buffer);

let out = "; file generated automatically, do not edit\r\n";

bytes.forEach(b=>out+=` defb 0x${b.toString(16)}\r\n`);

fs.writeFileSync(outName,out);

console.log(`file '${outName}' generated`);