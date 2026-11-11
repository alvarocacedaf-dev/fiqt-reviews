# Piloto: banco de preguntas de Física I / PC1

## Alcance publicado con este cambio
- 20 preguntas revisadas de cinco exámenes/ciclos: 2020-1, 2021-1, 2024-1, 2025-2 y 2026-1.
- Inventario de los 20 archivos originales en `data/question-banks/bfi01-pc1.json`.
- Dos archivos identificados como solucionarios: no participan en el sorteo.
- Los demás originales quedan pendientes de extracción/revisión. El examen 2026-1 B está incorporado parcialmente (preguntas 3 y 4).
- No se afirma haber extraído todas las preguntas de los 20 documentos.

## Preparación y revisión
Las copias locales se recuperaron de los ZIP `Fisica_I_Recuperado_Parte_1.zip`, `Fisica_I_Recuperado_Parte_2.zip` y `Fisica_I_Completado_Parte_3.zip` de Descargas. Se asociaron por título/ciclo/sección al catálogo de Supabase. No se verificó identidad binaria con R2: sus credenciales locales devolvieron 401.
Los originales y renders de trabajo están en `tmp/physics-pc1`. Las coordenadas revisadas se conservan en el script y en el banco. Se mantienen juntos enunciados, incisos y gráficos; algunos se componen con varios recortes para evitar incluir otra pregunta. Se inspeccionaron los 20 recortes. Las claves de duplicado representan la revisión editorial de este conjunto, no un detector automático de similitud.

Ejecutar `scripts/question-bank/prepare-physics-pc1.py` con Pillow después de preparar los originales/renders. Para agregar nuevas preguntas se deben revisar sus recortes antes de marcarlas `reviewed`, asignar la misma `duplicateKey` a versiones del mismo ejercicio y conservar procedencia y hash.

## Almacenamiento y acceso
Los JPEG se subieron al bucket **privado** existente `admin-worksheets`, prefijo `question-bank/bfi01-pc1/v1/`. Se verificaron descargándolos de nuevo y comparando SHA-256. No se modificaron originales ni permisos del bucket.
El script `node scripts/question-bank/upload-physics-pc1.mjs` requiere `.env.local` y los recortes locales. No subir credenciales a Git.
Todos los endpoints comprueban sesión y el mismo acceso al curso de la biblioteca (owner, promoción conservada, seis contribuciones o curso desbloqueado). No se colocan imágenes en `public`. El cliente nunca recibe una clave de servicio.

## Generación
Selecciona 1–6 preguntas revisadas; alterna ciclos en orden aleatorio y elimina duplicados editoriales. Conserva los IDs al descargar PDF: el PDF contiene exactamente el examen visto, no un nuevo sorteo. Una pregunta por página conserva las figuras completas. La última sección lista las fuentes. No incluye soluciones, calificación automática ni equilibrio por dificultad.

No requiere migración SQL. Requiere commit/push y despliegue para habilitar la pantalla. Los activos privados ya están cargados. Ejemplo revisado: `output/pdf/Fisica-I-PC1-ejemplo.pdf`.

## Historial sin repetir (migración 065)
El sorteo actual usa todas las combinaciones posibles de la cantidad elegida, sin considerar el orden como un examen distinto. No obliga a incluir todos los ciclos en cada examen; hacerlo excluiría combinaciones válidas. El historial se conserva por usuario, banco y cantidad de preguntas en `practice_exam_sequences`. Un contador y una permutación con paso coprimo recorren todas las combinaciones sin guardar miles de listas. Un bloqueo transaccional de fila protege solicitudes concurrentes. Solo el servidor con service_role puede reservar la siguiente combinación. Al agotar las combinaciones comienza una ronda nueva y se informa al alumno.
Los exámenes generados antes de activar este historial no pueden reconstruirse. Cambiar el conjunto de preguntas/duplicateKeys inicia un historial para ese nuevo banco; reordenar el JSON no lo reinicia. Si se pierde la respuesta de una solicitud ya reservada, esa combinación se considera utilizada (se prioriza no repetir).
Aplicar `supabase/migrations/065_unique_practice_exam_combinations.sql` antes de desplegar el nuevo endpoint. Si no se puede registrar el historial, el generador muestra un error y no vuelve a un sorteo que pueda repetir.
