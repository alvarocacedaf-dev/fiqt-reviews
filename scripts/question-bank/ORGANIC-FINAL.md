# Finales de Química Orgánica I (QU328)

Banco `qu328-final`: 46 preguntas de nueve ciclos (2018-3, 2019-1,
2022-2, 2023-1, 2023-2, 2024-1, 2025-1, 2025-2 y 2026-1).
Se revisaron los doce archivos de la carpeta de finales. Los solucionarios
no cuentan como exámenes adicionales. El inventario y las exclusiones por
documento están en `data/question-banks/qu328-final.json`.

Se conservan las estructuras químicas y los espectros originales, sin
redibujarlos ni transcribirlos por OCR. Las continuaciones de una pregunta
se unen en un solo recorte. Se excluyen respuestas sin enunciado recuperable,
el crucigrama ya resuelto y duplicados editoriales entre ciclos. Las preguntas
2018-3 P2, 2018-3 P5, 2026-1 P4 y 2026-1 P6 representan también sus copias
en otros exámenes. No se ha validado la corrección científica de los originales.

## Reproducir el banco

1. Guardar el catálogo de `admin_worksheets` para QU328/final en
   `tmp/organic-final/sources.json`, ordenado por título.
2. Guardar cada PDF como `{índice}.pdf`. Para los Word se usan las versiones
   PDF del visor. Los originales se recuperaron del ZIP privado de la página
   y de copias locales; sus tamaños se cotejaron con el catálogo.
3. Renderizar con Poppler a 2000 píxeles (`pdftoppm -scale-to 2000 -jpeg`) y
   guardar las páginas como `{índice}_{página}.jpg`, comenzando por página 1.
4. Ejecutar `python scripts/question-bank/prepare-organic-final.py` con Pillow.
   Las coordenadas se expresan sobre una vista de 340 píxeles de ancho con
   20 píxeles superiores de margen. Revisar visualmente los recortes antes
   de publicar cambios; el script reproduce la selección editorial ya revisada.
5. Ejecutar `node scripts/question-bank/upload-organic-final.mjs`. Lee
   `.env.local`, comprueba que el bucket sea privado y verifica SHA-256 antes
   de subir y después de descargar cada imagen. No versionar credenciales.

## Integración

El enlace es `/planchas-administracion/generar-examen?bank=qu328-final`.
La configuración compartida identifica curso, tipo de examen, textos y PDF.
Los endpoints existentes aceptan `bank=qu328-final`; mantienen los enlaces
anteriores `practice=1` y `practice=2`. Cada salida comprueba el acceso al curso
correspondiente y rechaza preguntas de otro banco.

El historial usa `qu328-final:<fingerprint>`, separado de Física I, por usuario
y cantidad (1–6). Descargar un PDF conserva las preguntas sorteadas. Cambiar
su orden no crea una combinación nueva. Se reutiliza la migración 065, sin SQL
adicional. Los JPEG se almacenan en el bucket privado `admin-worksheets`,
prefijo `question-bank/qu328-final/v1/`; no se incluyen en el paquete público.

Se verificaron los 46 activos remotos y un PDF de muestra con seis preguntas,
incluidas varias que reúnen dos páginas originales. El código requiere commit,
push y un despliegue correcto para que aparezca el botón en producción.
