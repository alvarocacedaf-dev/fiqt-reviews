function crearFormularioFIQTReviews() {
  const form = FormApp.create('FIQT Reviews — Referencias académicas de cursos y profesores');

  form.setDescription(
    'FIQT Reviews es un proyecto estudiantil independiente. No pertenece ni representa oficialmente a la Universidad Nacional de Ingeniería.\n\n' +
    'Este formulario busca recopilar referencias académicas respetuosas sobre cursos y docentes para iniciar una base de reseñas moderadas.\n\n' +
    'No escribas insultos, acusaciones personales, datos privados, comentarios sobre apariencia física, religión, política, raza, orientación sexual, vida personal ni información no académica.\n\n' +
    'Tus respuestas serán revisadas antes de publicarse. No publiques notas, promedios, códigos internos, teléfonos, correos personales ni datos administrativos.'
  );

  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(false);
  form.setAllowResponseEdits(false);

  const uniEmailValidation = FormApp.createTextValidation()
    .requireTextMatchesPattern('^[^@\\s]+@uni\\.pe$')
    .setHelpText('Usa un correo institucional que termine en @uni.pe.')
    .build();

  form.addTextItem()
    .setTitle('Correo institucional UNI')
    .setHelpText('Solo se aceptan referencias de estudiantes con correo @uni.pe.')
    .setRequired(true)
    .setValidation(uniEmailValidation);

  form.addMultipleChoiceItem()
    .setTitle('Ciclo del curso')
    .setChoiceValues([
      'Ciclo 1',
      'Ciclo 2',
      'Ciclo 3',
      'Ciclo 4',
      'Ciclo 5',
      'Ciclo 6',
      'Ciclo 7',
      'Ciclo 8',
      'Ciclo 9',
      'Ciclo 10'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Curso')
    .setHelpText('Escribe el código y nombre del curso. Ejemplo: BMA01 — Cálculo Diferencial.')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Profesor/a')
    .setHelpText('Usa solo el nombre público del docente. No coloques correos, DNI, teléfonos, códigos internos ni datos administrativos.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('¿Llevaste este curso con ese profesor/a?')
    .setChoiceValues(['Sí', 'No', 'Prefiero no responder'])
    .setRequired(true);

  const ratingQuestions = [
    ['Claridad al explicar', '1 = Muy bajo, 5 = Muy alto'],
    ['Dificultad del curso', '1 = Muy bajo, 5 = Muy alto. Aquí 5 significa que el curso fue muy difícil.'],
    ['Justicia al evaluar', '1 = Muy bajo, 5 = Muy alto'],
    ['Trato al alumno', '1 = Muy bajo, 5 = Muy alto'],
    ['Carga académica', '1 = Muy bajo, 5 = Muy alto. Aquí 5 significa que dejó bastante carga académica.']
  ];

  ratingQuestions.forEach(([title, helpText]) => {
    form.addScaleItem()
      .setTitle(title)
      .setHelpText(helpText)
      .setBounds(1, 5)
      .setLabels('Muy bajo', 'Muy alto')
      .setRequired(true);
  });

  form.addMultipleChoiceItem()
    .setTitle('Recomendación general')
    .setChoiceValues(['Lo recomiendo', 'No lo recomiendo'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Etiquetas positivas')
    .setChoiceValues([
      'Explica claro',
      'Resuelve dudas',
      'Es puntual',
      'Evalúa de forma justa',
      'Da buenos ejemplos',
      'Motiva a estudiar',
      'Es ordenado con el curso'
    ])
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle('Etiquetas negativas')
    .setChoiceValues([
      'Avanza muy rápido',
      'Sus exámenes son difíciles',
      'Deja bastante carga académica',
      'No se le entiende mucho',
      'Falta mucho',
      'No sube notas a tiempo',
      'No resuelve muchas dudas'
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Comentario corto')
    .setHelpText('Describe tu experiencia de manera respetuosa, sin insultos ni acusaciones personales. Enfócate en la experiencia académica.')
    .setRequired(true);

  Logger.log('Formulario creado: ' + form.getEditUrl());
  Logger.log('Enlace para responder: ' + form.getPublishedUrl());
}
