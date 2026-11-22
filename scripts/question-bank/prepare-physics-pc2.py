# Coordinates in a 340px-wide preview with 20px title margin. A row joins its rectangles into one exercise.
import json,hashlib,re
from pathlib import Path
from PIL import Image
r=Path('tmp/physics-pc2')
sources=json.loads((r/'sources.json').read_text(encoding='utf8'))
layout={
(0,1):['30 194 320 219;18 330 130 434','30 220 320 253;135 330 318 440','30 255 320 290;10 446 145 525','30 291 320 318;157 429 274 544'],
(1,1):['14 212 172 312','14 311 171 383','12 383 173 510','12 512 182 547;184 212 335 306'],
(2,1):['26 150 236 186;242 140 322 204','26 205 225 239;225 208 325 262','25 246 138 315;137 265 319 313','25 335 322 436'],
(3,1):['41 71 311 101','40 107 310 181','40 185 311 273','41 278 310 397'],
(4,1):['44 143 302 231','44 234 302 442'],(4,2):['43 55 305 199','43 205 305 411'],
(5,1):['12 183 338 278','12 279 338 356','8 357 338 451','8 452 338 549'],
(6,1):['45 124 304 272','46 272 304 439'],(7,1):['43 70 306 212','44 212 306 316','43 316 306 406'],
(8,1):['8 124 339 211','8 211 339 319','8 319 339 402','8 407 339 497'],
(9,1):['60 116 306 221','60 222 306 283','60 284 306 445'],(9,2):['42 47 307 212'],
(10,1):['15 143 337 212','15 212 337 319','13 321 219 419','14 423 334 454;204 318 319 422'],
(11,1):['22 160 327 256','23 256 325 319','23 320 325 367;34 372 165 436','24 437 328 466;185 366 319 437'],
(12,1):['30 169 308 257','29 262 311 461'],(12,2):['25 66 303 234','25 237 304 426'],
(13,1):['29 99 319 162;40 162 218 215','27 225 231 268;231 174 331 269','21 272 335 352','12 356 336 423'],
(14,1):['48 145 313 241','48 242 313 313','48 319 313 442'],(14,2):['48 77 314 242'],
(15,1):['33 85 307 167','32 168 313 218','29 218 316 297','32 297 315 464'],
(16,1):['34 100 319 320','33 323 316 486'],(16,2):['14 28 316 213','14 215 316 424'],
(17,1):['40 129 308 203','39 203 333 288','38 288 331 353','37 360 332 433']}
out=r/'questions';out.mkdir(exist_ok=True);qs=[];counts={}
for (i,p),rows in layout.items():
 im=Image.open(r/f'{i}_{p}.jpg');scale=im.width/340
 for row in rows:
  n=counts.get(i,2 if i==7 else 0)+1;counts[i]=n
  chunks=[]
  for box in row.split(';'):
   x,y,X,Y=map(int,box.split());chunks.append(im.crop(tuple(round(v*scale) for v in [x,y-20,X,Y-20])))
  canvas=Image.new('RGB',(max(c.width for c in chunks)+24,sum(c.height+12 for c in chunks)+12),'white');y=12
  for c in chunks:canvas.paste(c,((canvas.width-c.width)//2,y));y+=c.height+12
  s=sources[i];qid=f'bfi01-pc2-{s["id"]}-q{n}';f=out/(qid+'.jpg');canvas.save(f,quality=94)
  qs.append(dict(id=qid,duplicateKey=qid,originalNumber=n,sourceId=s['id'],sourceTitle=s['title'],term=re.search(r'20\d\d-\d',s['title'])[0],page=p,sourcePages=[p],assetPath='question-bank/bfi01-pc2/v1/'+f.name,status='reviewed',sha256=hashlib.sha256(f.read_bytes()).hexdigest(),width=canvas.width,height=canvas.height,gravity=9.81 if i==0 else 9.8,containsAnnotations=i not in [2,3,4],localSource=s['file_name'],rectangles=[list(map(int,b.split())) for b in row.split(';')]))
Path('data/question-banks/bfi01-pc2.json').write_text(json.dumps(dict(examCount=17,practiceNumber=2,questions=qs),ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(len(qs))

