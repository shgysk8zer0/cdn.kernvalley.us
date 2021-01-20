/* eslint-env node */
const SVGSprite = require('svg-sprite-standardized').SVGSprite;

let infilepath = process.argv[2];
let outfilepath = process.argv[3];

const svg = new SVGSprite(infilepath);
svg.generate('viewtranslate').write(outfilepath);
