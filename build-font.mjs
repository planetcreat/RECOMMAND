import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url));
const css=read('./dist/ui-font.css').toString('utf8');
const license=read('./dist/assets/Jua-OFL.txt').toString('utf8').split(/\r?\n/).map(line=>line.trimEnd()).join('\n').trim();
const font='data:font/ttf;base64,'+read('./dist/assets/Jua-Regular.ttf').toString('base64');

export const inlineUiFont=`<style id="uiFont">/*\n${license}\n*/\n${css.replace('./assets/Jua-Regular.ttf',font)}</style>`;
