type CatalogItem = {
  courseId: string;
  professorId: string;
  courseCode: string | null;
  professorName: string;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function meaningfulTokens(value: string) {
  return normalize(value).split(' ').filter(token => token.length >= 3);
}

function professorScore(name: string, context: string) {
  const tokens = meaningfulTokens(name);
  if (!tokens.length) return 0;
  const normalizedContext = ` ${normalize(context)} `;
  const hits = tokens.filter(token => normalizedContext.includes(` ${token} `)).length;
  return hits / tokens.length;
}

function lineHasCourseCode(line: string, code: string) {
  const compactCode = code.replaceAll(' ', '');
  const letterCount = compactCode.search(/\d/);
  const canonicalize = (value: string) => value.split('').map((char, index) => {
    if (index < letterCount) return ({ '1': 'I', '0': 'O', '5': 'S', '8': 'B' } as Record<string, string>)[char] ?? char;
    return ({ O: '0', D: '0', Q: '0', I: '1', L: '1', S: '5', B: '8' } as Record<string, string>)[char] ?? char;
  }).join('');
  const expected = canonicalize(compactCode);
  return line.split(' ').some(token => {
    const candidate = token.replaceAll(' ', '');
    if (candidate.includes(compactCode)) return true;
    return candidate.length >= compactCode.length && canonicalize(candidate.slice(0, compactCode.length)) === expected;
  });
}

export function matchOcrCatalog(lines: string[], catalog: CatalogItem[]) {
  const normalizedLines = lines.map(normalize);
  const fullDocument = lines.join(' ');
  return catalog.flatMap(item => {
    if (!item.courseCode) return [];
    const code = normalize(item.courseCode);
    const lineIndex = normalizedLines.findIndex(line => lineHasCourseCode(line, code));
    if (lineIndex < 0) return [];

    const context = lines.slice(Math.max(0, lineIndex - 1), lineIndex + 2).join(' ');
    const rowScore = professorScore(item.professorName, context);
    const documentScore = professorScore(item.professorName, fullDocument);
    const confidence = rowScore >= 0.45 ? rowScore : documentScore * 0.85;
    if (confidence < 0.42) return [];

    return [{
      value: `${item.courseId}|${item.professorId}`,
      confidence: Math.round(confidence * 100),
      courseCode: item.courseCode,
      professorName: item.professorName,
    }];
  });
}
