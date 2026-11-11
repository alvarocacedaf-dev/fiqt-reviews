import json,hashlib
from pathlib import Path
from PIL import Image
root=Path('tmp/physics-pc1'); out=root/'questions';out.mkdir(exist_ok=True)
sources=json.loads((root/'sources.json').read_text(encoding='utf8'))
# Rectangles inspected against the rendered originals. Multiple rectangles keep figures with their question.
items=[
(2,1,1,[(80,450,1050,540)]),(2,1,2,[(80,560,1050,640)]),(2,1,3,[(80,670,1050,770)]),(2,1,4,[(80,800,1050,900)]),
(3,1,1,[(75,405,705,570),(715,400,1090,695)]),(3,1,2,[(75,615,710,820)]),(3,1,3,[(125,850,785,970),(790,765,1080,1025)]),(3,1,4,[(75,1110,1070,1290)]),
(4,1,1,[(145,370,1000,770)]),(4,1,2,[(145,785,1000,1420)]),
(4,2,3,[(145,130,1000,195)]),(4,2,4,[(145,200,1000,490)]),(4,2,5,[(140,500,1000,930)]),
(11,1,1,[(135,340,1050,725)]),(11,1,2,[(135,740,1000,1430)]),
(11,2,3,[(150,135,1040,425)]),(11,2,4,[(150,430,1040,615)]),(11,2,5,[(145,625,1040,900)]),
(17,1,3,[(60,920,1080,1305)]),(17,1,4,[(60,1340,1090,1540)])]
local_files=sorted((root/'originals').iterdir()); mappings={2:9,3:12,4:16,11:7,17:19}
questions=[]
for i,p,n,rects in items:
 im=Image.open(root/f'page-{i}-{p}.png').convert('RGB'); crops=[im.crop(r) for r in rects]
 canvas=Image.new('RGB',(max(c.width for c in crops)+24,sum(c.height for c in crops)+24+12*(len(crops)-1)),'white');y=12
 for c in crops:canvas.paste(c,((canvas.width-c.width)//2,y));y+=c.height+12
 source=sources[mappings[i]];qid=f'bfi01-pc1-{source["academic_term"] or source["title"].split("Física I ")[1][:6]}-{i}-q{n}'
 dest=out/(qid+'.jpg');canvas.save(dest,quality=94)
 questions.append({'id':qid,'sourceId':source['id'],'sourceTitle':source['title'],'term':source['title'].split('Física I ')[1][:6], 'originalNumber':n,'page':p,'status':'reviewed','duplicateKey':qid,'assetPath':'question-bank/bfi01-pc1/v1/'+dest.name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'width':canvas.width,'height':canvas.height,'rectangles':rects,'localSource':local_files[i].name})
bank={'version':1,'courseId':sources[0]['course_id'],'courseCode':'BFI01','courseName':'Física I','practiceNumber':1,'questions':questions,'sources':[{'id':s['id'],'title':s['title'],'status':'included' if s['id'] in {q['sourceId'] for q in questions} else 'solution-only' if 'SOLUCIONARIO' in s['title'] else 'pending-review'} for s in sources]}
Path('data/question-banks/bfi01-pc1.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(len(questions),'questions')
