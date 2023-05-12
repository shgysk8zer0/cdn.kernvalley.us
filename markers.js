/* eslint-env node */
import { SVGSprite } from 'svg-sprite-standardized';

let infilepath = process.argv[2];
let outfilepath = process.argv[3];

const svg = new SVGSprite(infilepath);
svg.generate('viewtranslate').write(outfilepath);
