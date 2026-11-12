# Banco de preguntas de Física I / PC1

## Cobertura de la versión 2
- 74 preguntas de 17 exámenes entre 2018-2 y 2026-1.
- Los 20 archivos del catálogo están inventariados: 18 archivos de enunciados (un examen dividido en dos imágenes) y dos solucionarios de exámenes ya incorporados.
- Todos los enunciados están incorporados; los solucionarios no añaden duplicados.
- Se comprobó que los 20 IDs coinciden con el catálogo actual de Supabase.
- Algunas fotografías contienen anotaciones manuscritas, incluso sobre figuras. Se conservan donde separarlas alteraría el ejercicio; la pantalla y el PDF lo indican. No es una transcripción corregida ni un solucionario validado.

## Preparación y revisión
Las copias locales se recuperaron de los ZIP Fisica_I_Recuperado_Parte_1.zip, Fisica_I_Recuperado_Parte_2.zip y Fisica_I_Completado_Parte_3.zip de Descargas. Se asociaron por título/ciclo/sección al catálogo. No se verificó identidad binaria con R2: sus credenciales locales devolvieron 401.

Los originales y renders están en tmp/physics-pc1. Ejecutar scripts/question-bank/prepare-physics-pc1.py con Pillow después de preparar esos archivos y sources.json. Los PDF se renderizan a 1600 píxeles de altura; las imágenes de 2018 y 2019 se rotan antes de normalizarlas. El script conserva coordenadas y máscaras de recorte. No modifica originales.

Los 54 recortes añadidos se inspeccionaron visualmente, además de los 20 revisados en el piloto. Los incisos permanecen juntos, incluida la continuación de la pregunta 3 de 2026-1 A en su segunda página. La pregunta 3 de 2026-1 C reúne las dos fotografías incluidas en su única página PDF. Se conservan figuras, fórmulas, fuente y hash SHA-256.

Para ampliar el banco, revisar los recortes antes de marcarlos reviewed; asignar la misma duplicateKey a versiones del mismo ejercicio. Estas claves representan revisión editorial, no detección automática de similitud.

## Almacenamiento y acceso
Los JPEG v2 usan el bucket privado admin-worksheets, prefijo question-bank/bfi01-pc1/v2/. Se mantienen los activos v1 para que el despliegue anterior siga funcionando. El script node scripts/question-bank/upload-physics-pc1.mjs verifica SHA-256 antes de subir y después de descargar cada activo. Requiere .env.local y los recortes locales. No subir credenciales a Git.

Los endpoints comprueban sesión y el mismo acceso al curso de la biblioteca. No hay imágenes públicas ni claves de servicio en el cliente. No se modifican documentos originales ni permisos del bucket.

## Generación e historial
Se seleccionan 1–6 preguntas. Los IDs del resultado se conservan al descargar el PDF; descargar no vuelve a sortear. Hay una pregunta por página y referencias al final. No hay calificación automática ni equilibrio por dificultad.

El sorteo recorre todas las combinaciones de la cantidad elegida, sin considerar un cambio de orden como examen distinto. El historial se conserva por usuario, conjunto de preguntas y cantidad en practice_exam_sequences mediante la migración 065, ya utilizada por el piloto. Un bloqueo transaccional protege solicitudes concurrentes. Solo el servidor puede reservar la siguiente combinación. Si falla el registro, no se genera un sorteo alternativo que pudiera repetirse.

Ampliar de 20 a 74 preguntas inicia una secuencia para el nuevo banco. No se incorporan a esta secuencia los exámenes del banco anterior. Dentro del nuevo banco no se repiten combinaciones hasta agotar la ronda. Si se pierde una respuesta ya reservada, esa combinación se considera utilizada. El máximo con seis preguntas sigue por debajo del límite admitido de 2^31.

Esta ampliación no requiere otra migración SQL. Requiere subir los activos privados y desplegar el código con commit/push. Ejemplo visual: output/pdf/Fisica-I-PC1-banco-ampliado-ejemplo.pdf.
