from pathlib import Path
import zipfile,re,json,subprocess
from PIL import Image,ImageDraw,ImageOps
r=Path('tmp/physics-pc2')
r.mkdir(parents=True,exist_ok=True)
src=sorted((s for s in json.loads(Path('tmp/physics-pc1/catalog.json').read_text(encoding='utf8')) if 'calificada 2 ' in s['title']),key=lambda s:s['title'])
pages=[]
for i,s in enumerate(src):
 term=re.search(r'20\d\d-\d',s['title'])[0]
 for z in Path.home().joinpath('Downloads').glob('Fisica_I*.zip'):
  with zipfile.ZipFile(z) as a:
   for n in a.namelist():
    if 'calificada 2 ' not in n.lower() or term not in n:continue
    if len([t for t in src if term in t['title']])>1 and not any(key in n.upper() and key in s['title'].upper() for key in ['PARTE 1','PARTE 2','SECCIÓN B','SECCIÓN C','SECCIÓN D','SECCIÓN A']):continue
    if 'PARTE' in s['title'] and s['title'][-1] not in n[-5:]:continue
    f=r/(str(i)+Path(n).suffix);f.write_bytes(a.read(n))
    if f.stat().st_size != s['file_size']: raise ValueError('El original no coincide con el catálogo: '+n)
    if f.suffix.lower()=='.pdf':
     subprocess.run(['pdftoppm','-scale-to','1800','-jpeg',str(f),str(r/f'p{i}')],check=True);fs=sorted(r.glob(f'p{i}-*.jpg'))
    else:fs=[f]
    for p,g in enumerate(fs,1):
     im=ImageOps.exif_transpose(Image.open(g)).convert('RGB')
     if im.width>im.height and i==1:im=im.rotate(-90,expand=True)
     im.thumbnail((2000,2400));im.save(r/f'{i}_{p}.jpg',quality=95)
     pages.append((i,p))
    break
   else:continue
   break
print(pages)
(r/'sources.json').write_text(json.dumps(src,ensure_ascii=False),encoding='utf8')
for k in range(0,len(pages),4):
 c=Image.new('RGB',(1440,740),'gray');d=ImageDraw.Draw(c)
 for j,(i,p) in enumerate(pages[k:k+4]):
  im=Image.open(r/f'{i}_{p}.jpg');im=im.resize((340,round(340*im.height/im.width)));c.paste(im,(360*j,20));d.text((360*j,0),f'{i}_{p}',fill='white')
  for y in range(0,700,50):d.text((360*j+340,y+20),str(y),fill='white')
 c.save(r/f's{k}.jpg')


