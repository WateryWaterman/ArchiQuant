// Package the original sample raster in a minimal, standards-compliant PDF.
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const jpg=await sharp('public/samples/residence-plumbing.png').jpeg({quality:96}).toBuffer();
const content=Buffer.from('q 800 0 0 550 0 0 cm /Im0 Do Q');
const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 550] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1600 /Height 1100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,Buffer.from('\nendstream')]),Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')])];
const parts=[Buffer.from('%PDF-1.4\n')],offsets=[0];let offset=parts[0].length;
for(let i=0;i<objects.length;i++){offsets.push(offset);const obj=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),objects[i],Buffer.from('\nendobj\n')]);parts.push(obj);offset+=obj.length;}
parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`));
await writeFile('public/samples/residence-plumbing.pdf',Buffer.concat(parts));
