"""Build QU328 final questions from visually reviewed original-page regions.
Coordinates use a 340px wide preview with a 20px title margin; no chemistry is redrawn.
Place catalog sources.json and numbered page JPEGs in tmp/organic-final first.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path('tmp/organic-final')
SOURCES = json.loads((ROOT / 'sources.json').read_text(encoding='utf8'))
# source: [(original question number, [(page, left, top, right, bottom), ...])]
LAYOUT = {
 0: [(1,[(1,26,150,322,263)]),(2,[(1,26,264,322,369)]),
     (3,[(1,26,371,322,397)]),(4,[(1,26,398,322,460)]),
     (5,[(2,26,60,322,270)]),(6,[(2,26,279,322,420),(3,26,50,322,266)])],
 1: [(1,[(1,26,150,322,284)]),(2,[(1,26,285,322,310)]),
     (3,[(1,26,311,322,381)]),(4,[(1,26,382,322,466),(2,26,48,322,166)]),
     (5,[(2,26,168,322,435)])],
 2: [(1,[(1,18,64,322,125)]),
     (2,[(1,18,239,322,276),(1,26,312,322,326),(1,26,371,322,385),(2,26,132,322,148),(2,43,251,289,333)]),
     (7,[(4,26,377,322,402)])],
 3: [(1,[(1,26,162,328,445),(2,26,49,322,164)]),
     (2,[(2,26,170,322,225)]),
     (3,[(2,26,231,322,414),(3,26,64,322,212)]),
     (5,[(3,26,322,322,446)])],
 4: [(1,[(1,26,170,329,447),(2,26,49,329,200)]),
     (3,[(3,26,49,329,135)]),(4,[(3,26,138,329,455)]),
     (5,[(4,26,49,329,363)]),(6,[(4,26,365,329,464)])],
 6: [(1,[(1,26,169,329,232)]),(2,[(1,26,232,329,310)]),
     (3,[(1,26,313,329,379)]),(4,[(1,26,382,329,456)]),
     (5,[(2,26,49,329,167)]),(6,[(2,26,172,329,256)]),
     (7,[(2,26,258,329,350)]),(8,[(2,26,355,329,391)])],
 7: [(4,[(2,35,421,325,444),(3,45,50,285,146),(3,44,178,285,284)]),
     (6,[(3,36,337,322,363)]),
     (8,[(4,36,215,322,235),(4,198,305,285,361)])],
 8: [(1,[(1,26,153,329,225)]),(2,[(1,26,226,329,328)]),
     (3,[(1,26,329,329,410)]),
     (4,[(1,26,410,329,464),(2,26,49,329,105)]),
     (5,[(2,26,106,329,172)]),(6,[(2,26,174,329,464)])],
 11:[(1,[(1,26,155,329,174)]),(3,[(1,26,234,329,422)]),
     (4,[(1,26,427,329,469)]),(5,[(2,26,49,329,210)]),
     (6,[(2,26,213,329,308)]),(7,[(2,26,312,329,447)])],
}
# Identical exercises across terms are represented once, not just duplicate files.
EXCLUSIONS = {
 2: 'P3-P6: respuestas integradas sin enunciado íntegro recuperable. P8/P9: mismos ejercicios que 2026-1 P6/P4.',
 3: 'P4: mismo ejercicio que 2018-3 P2.',
 4: 'P2: mismo ejercicio que 2018-3 P5.',
 5: 'Copia del examen 2023-2 con soluciones; se usa el PDF sin soluciones.',
 7: 'P1: solo solución, sin enunciado íntegro. P2/P3: no se conserva enunciado completo. P5: orden resuelto. P7: reactivos entremezclados con respuestas. P9: crucigrama resuelto.',
 9: 'Solucionario del examen 2025-2; se usa su enunciado original.',
 10: 'Fotografía del mismo examen conservado, más legible, en las primeras páginas del solucionario 2026-1.',
 11: 'P2: mismo ejercicio que 2018-3 P2. Solo se usan las páginas de enunciados.',
}
output = ROOT / 'questions'
output.mkdir(exist_ok=True)
questions = []
for index, entries in LAYOUT.items():
    source = SOURCES[index]
    for number, rectangles in entries:
        chunks = []
        for page, x, y, right, bottom in rectangles:
            image = Image.open(ROOT / f'{index}_{page}.jpg').convert('RGB')
            scale = image.width / 340
            box = tuple(round(v * scale) for v in (x, y - 20, right, bottom - 20))
            assert 0 <= box[0] < box[2] <= image.width and 0 <= box[1] < box[3] <= image.height
            chunks.append(image.crop(box))
        canvas = Image.new('RGB', (max(c.width for c in chunks)+24, sum(c.height+12 for c in chunks)+12), 'white')
        top = 12
        for chunk in chunks:
            canvas.paste(chunk, ((canvas.width-chunk.width)//2, top))
            top += chunk.height + 12
        qid = f'qu328-final-{source["academic_term"]}-q{number}'
        filename = output / f'{qid}.jpg'
        canvas.save(filename, quality=94)
        pages = sorted({r[0] for r in rectangles})
        questions.append(dict(
            id=qid, duplicateKey=qid, originalNumber=number,
            sourceId=source['id'], sourceTitle=source['title'], term=source['academic_term'],
            page=pages[0], sourcePages=pages, assetPath=f'question-bank/qu328-final/v1/{qid}.jpg',
            status='reviewed', sha256=hashlib.sha256(filename.read_bytes()).hexdigest(),
            width=canvas.width, height=canvas.height, containsAnnotations=False,
            localSource=source['file_name'], rectangles=[list(r) for r in rectangles],
        ))
bank = dict(version=1, courseId=SOURCES[0]['course_id'], courseCode='QU328', courseName='Química Orgánica I',
            examType='final', examCount=len({q['term'] for q in questions}), questions=questions,
            sources=[dict(id=s['id'],title=s['title'],fileName=s['file_name'],
                          questionCount=sum(q['sourceId']==s['id'] for q in questions),notes=EXCLUSIONS.get(i,''))
                     for i,s in enumerate(SOURCES)])
Path('data/question-banks/qu328-final.json').write_text(json.dumps(bank, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
print(f'{len(questions)} preguntas, {bank["examCount"]} ciclos, {len(SOURCES)} documentos revisados')
