const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { join } = require('path');
GlobalFonts.registerFromPath(join(__dirname, 'apps/api/assets/fonts/Roboto-Regular.ttf'), 'Roboto');
GlobalFonts.registerFromPath(join(__dirname, 'apps/api/assets/fonts/Roboto-Bold.ttf'), 'Roboto');

const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000';
ctx.fillRect(0,0,200,200);
ctx.fillStyle = '#fff';
ctx.font = 'bold 24px Roboto';
ctx.fillText('Hello', 50, 50);
ctx.font = '24px Roboto';
ctx.fillText('World', 50, 100);
const fs = require('fs');
fs.writeFileSync('test.png', canvas.toBuffer('image/png'));
console.log('Done test.png');
