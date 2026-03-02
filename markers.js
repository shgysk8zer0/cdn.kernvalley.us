import { SVGSprite } from 'svg-sprite-standardized';

let infilepath = globalThis.process.argv[2];
let outfilepath = globalThis.process.argv[3];

const svg = new SVGSprite(infilepath);
svg.generate('viewtranslate').write(outfilepath);
