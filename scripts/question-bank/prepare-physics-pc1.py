import json,hashlib
from pathlib import Path
from PIL import Image, ImageDraw
root=Path('tmp/physics-pc1'); out=root/'questions';out.mkdir(exist_ok=True)
sources=json.loads((root/'sources.json').read_text(encoding='utf8'))
for index in [0,1,5,6,9,10]:
 raw=Image.open(root/f'page-{index}-0.png').convert('RGB')
 if index in [0,1]: raw=raw.rotate(-90,expand=True)
 raw.resize((round(raw.width*1600/raw.height),1600)).save(root/f'review-{index}.jpg',quality=95)
# Rectangles inspected against the rendered originals. Multiple rectangles keep figures with their question.
items=[
(2,1,1,[(80,450,1050,540)]),(2,1,2,[(80,560,1050,640)]),(2,1,3,[(80,670,1050,770)]),(2,1,4,[(80,800,1050,900)]),
(3,1,1,[(75,405,705,570),(715,400,1090,695)]),(3,1,2,[(75,615,710,820)]),(3,1,3,[(125,850,785,970),(790,765,1080,1025)]),(3,1,4,[(75,1110,1070,1290)]),
(4,1,1,[(145,370,1000,770)]),(4,1,2,[(145,785,1000,1420)]),
(4,2,3,[(145,130,1000,195)]),(4,2,4,[(145,200,1000,490)]),(4,2,5,[(140,500,1000,930)]),
(11,1,1,[(135,340,1050,725)]),(11,1,2,[(135,740,1000,1430)]),
(11,2,3,[(150,135,1040,425)]),(11,2,4,[(150,430,1040,615)]),(11,2,5,[(145,625,1040,900)]),
(17,1,3,[(60,920,1080,1305)]),(17,1,4,[(60,1340,1090,1540)])]
items += [
(0,0,1,[(55,415,850,510)]),(0,0,2,[(55,510,850,680)]),(0,0,3,[(55,665,850,925)]),(0,0,4,[(55,930,850,1005),(55,1010,175,1095),(210,1010,650,1355)]),
(1,0,1,[(70,455,865,580)]),(1,0,2,[(70,590,810,795)]),(1,0,3,[(75,840,650,965),(665,780,870,985)]),(1,0,4,[(70,1080,810,1155)]),
(5,0,1,[(95,330,1180,560)]),(5,0,2,[(95,590,1180,920)]),(5,0,3,[(95,960,1190,1360)]),(5,0,4,[(95,1375,1190,1570)]),
(6,0,5,[(90,105,875,1065)]),
(7,1,1,[(265,460,1060,720)]),(7,1,2,[(265,720,1060,920)]),(7,1,3,[(260,920,1080,1520)]),(7,2,4,[(220,225,1070,300)]),(7,2,5,[(220,300,1060,875)]),
(9,0,1,[(90,495,1075,670)]),(9,0,2,[(90,675,1080,790)]),(9,0,3,[(90,790,1080,1020),(120,1025,490,1295)]),(9,0,4,[(85,1305,1020,1455)]),
(10,0,1,[(95,530,1060,605)]),(10,0,2,[(95,610,1090,795)]),(10,0,3,[(95,800,1090,915),(125,925,625,1200)]),(10,0,4,[(95,1225,1040,1430),(655,930,970,1170)]),
(13,1,1,[(95,295,1160,510)]),(13,1,2,[(85,530,1130,700)]),(13,1,3,[(70,725,1195,910)]),(13,1,4,[(60,930,1160,1290)]),
(14,1,1,[(125,425,960,925)]),(14,1,2,[(145,930,980,1360)]),(14,2,3,[(95,140,1030,430)]),(14,2,4,[(105,455,1030,1000)]),
(15,1,1,[(160,415,1050,590)]),(15,1,2,[(160,605,1030,1235)]),(15,1,3,[(155,1235,1010,1440)]),(15,2,4,[(135,165,1000,310),(460,350,720,750)]),(15,2,5,[(140,770,1010,960),(270,980,860,1380)]),
(16,1,1,[(130,425,1010,795)]),(16,1,2,[(140,800,1010,845),(365,845,720,1120),(140,1120,980,1270)]),(16,1,3,[(140,1280,1010,1490)]),(16,2,4,[(80,350,1020,650)]),(16,2,5,[(110,660,1030,905)]),
(17,1,1,[(60,360,1090,475),(155,475,810,540)]),(17,1,2,[(65,605,560,815),(565,505,1090,910)]),
(18,1,1,[(230,270,900,465)]),(18,1,2,[(225,465,905,820)]),(18,1,3,[(225,820,915,1045),(205,1245,930,1320)]),(18,1,4,[(200,1335,930,1480)]),
(19,1,1,[(105,465,1000,570),(495,660,1080,1000)]),(19,1,2,[(110,575,1010,665),(90,665,495,985)]),(19,1,3,[(95,1020,1000,1280)]),(19,1,4,[(100,1310,1000,1520)]),
]
local_files=sorted((root/'originals').iterdir()); mappings={0:3,1:5,2:9,3:12,4:16,5:4,6:6,7:10,9:17,10:1,11:7,13:14,14:2,15:0,16:8,17:19,18:15,19:18}
questions=[]
# Masks remove neighboring text from tilted photographs without changing the exercise.
polygons={
 (0,1):[(55,450),(850,407),(850,510),(55,510)],
 (0,2):[(55,510),(850,510),(850,655),(55,680)],
 (0,3):[(55,687),(850,658),(850,925),(55,925)],
 (17,1):[(60,425),(1090,365),(1090,505),(810,505),(810,540),(60,540)],
}
for i,p,n,rects in items:
 im=Image.open(root/(f'review-{i}.jpg' if p==0 else f'page-{i}-{p}.png')).convert('RGB')
 if (i,n) in polygons:
  mask=Image.new('L',im.size,0);ImageDraw.Draw(mask).polygon(polygons[i,n],fill=255)
  im=Image.composite(im,Image.new('RGB',im.size,'white'),mask)
  if (i,n)==(17,1): rects=[(60,360,1090,540)]
 if (i,n)==(10,4): rects=[(95,1225,1110,1430),(655,930,970,1170)]
 crops=[im.crop(r) for r in rects]
 if (i,n)==(16,3):
  crops.append(Image.open(root/'page-16-2.png').convert('RGB').crop((70,185,1040,345)))
 canvas=Image.new('RGB',(max(c.width for c in crops)+24,sum(c.height for c in crops)+24+12*(len(crops)-1)),'white');y=12
 for c in crops:canvas.paste(c,((canvas.width-c.width)//2,y));y+=c.height+12
 source=sources[mappings[i]];qid=f'bfi01-pc1-{source["academic_term"] or source["title"].split("Física I ")[1][:6]}-{i}-q{n}'
 dest=out/(qid+'.jpg');canvas.save(dest,quality=94)
 questions.append({'id':qid,'sourceId':source['id'],'sourceTitle':source['title'],'term':source['title'].split('Física I ')[1][:6], 'originalNumber':n,'page':max(1,p),'sourcePages':[1,2] if (i,n)==(16,3) else [max(1,p)],'status':'reviewed','duplicateKey':qid,'assetPath':'question-bank/bfi01-pc1/v2/'+dest.name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'width':canvas.width,'height':canvas.height,'rectangles':rects,'localSource':local_files[i].name,'containsAnnotations':i in [0,1,5,6,7,9,10,14,15,16,18,19],'gravity':9.81 if i==19 else 9.8})
bank={'version':2,'courseId':sources[0]['course_id'],'courseCode':'BFI01','courseName':'Física I','practiceNumber':1,'examCount':17,'questions':questions,'sources':[{'id':s['id'],'title':s['title'],'status':'included' if s['id'] in {q['sourceId'] for q in questions} else 'solution-only' if 'SOLUCIONARIO' in s['title'] else 'pending-review'} for s in sources]}
Path('data/question-banks/bfi01-pc1.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(len(questions),'questions')
