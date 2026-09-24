"""Optional fixture regeneration, not needed to run the app.
Render source page 3 to tmp/pdfs/hsu-construction-p3.png at 3600 x 2400 first.
Requires Pillow, reportlab and pypdf. Attribution: public/samples/hsu-house/README.md.
"""
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from pypdf import PdfReader
from pathlib import Path
p=Path('public/samples/hsu-house'); p.mkdir(parents=True,exist_ok=True)
im=Image.open('tmp/pdfs/hsu-construction-p3.png').convert('RGB')
scan=im.resize((2400,1600),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.25))
d=ImageDraw.Draw(scan)
font_path=next((v for v in ['C:/Windows/Fonts/arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(v).exists()),None)
font=ImageFont.truetype(font_path,14) if font_path else ImageFont.load_default(size=14)
d.text((180,1530),'ADDED CALIBRATION GUIDE: 10 ft',font=font,fill='black')
d.line((180,1560,346.667,1560),fill='black',width=2)
for x in (180,346.667):d.line((x,1553,x,1567),fill='black',width=2)
d.text((380,1550),'Derived from source 1/4 inch = 1 foot at 36 x 24 inch sheet size. Verify before use.',font=font,fill='black')
scan.save(p/'hsu-p301-scan.jpg',quality=87)
c=canvas.Canvas(str(p/'hsu-p301-scan.pdf'),pagesize=(2592,1728))
c.setTitle('HSU House P-301.00 - image-only evaluation copy')
c.drawImage(str(p/'hsu-p301-scan.jpg'),0,0,width=2592,height=1728)
c.showPage();c.save()
assert not PdfReader(p/'hsu-p301-scan.pdf').pages[0].extract_text().strip()
im.crop((450,650,1600,2000)).save('tmp/pdfs/hsu-fixtures.png')
print('Image-only PDF created; zero extractable text.')
