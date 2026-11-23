# Incorporación de nuevos exámenes

Alcance: Física I PC1/PC2 y Química Orgánica I finales. El banco inicial de
archivos JSON sigue disponible y es inmutable. Las nuevas preguntas aprobadas
se guardan en Supabase y se combinan con él en cada consulta, sin despliegues.

## Activación (una vez)

Estado del proyecto `ylverxylmvtbqrqtcjds`, 23/11/2026: las migraciones 066–068
ya se aplicaron en producción mediante SQL Editor. No volver a ejecutarlas en
ese proyecto. Se verificaron tres tablas con RLS, seis funciones, el trigger de
subidas, la política de imágenes y cuatro versiones históricas. Se conservaron
los cinco registros de historial existentes, todos con su banco asociado.
Queda publicar el código y comprobar la configuración del cron en Vercel.

1. Aplicar en Supabase, en orden, las migraciones **066, 067 y 068**.
   Son aditivas; no eliminan bancos ni historiales. Aplicarlas antes de desplegar.
2. Desplegar estos cambios en Vercel. Los paquetes nativos y el modelo OCR
   español se incluyen en las funciones; no requieren Python en la laptop ni
   una API de IA. No ejecutar `npm install --omit=optional`: Canvas y Sharp
   necesitan sus dependencias nativas para Linux.
3. Comprobar `CRON_SECRET` en Vercel (también lo usa la limpieza de chats).
   El cron de rescate de bancos se ejecuta diariamente a las 09:00 UTC.
   El procesamiento normal arranca al terminar la subida mediante `after()`.
   Sin el secreto, subir/revisar sigue funcionando, pero el rescate diario no.
4. Abrir **Administración → Banco de preguntas** con el rol `owner`.
   Los administradores colaboradores pueden seguir subiendo archivos, pero
   no publicar preguntas ni leer borradores en este panel.

## Uso

- Subir el examen normalmente en **Administrar planchas**, con su curso y
  evaluación. Para Física, el título normalizado debe identificar PC1 o PC2.
- Un trigger crea la tarea en la misma transacción de la subida. La función
  procesa PDF/imágenes, renderiza páginas y usa OCR español cuando no hay texto.
- Word necesita un PDF asociado mediante el flujo existente de vistas previas.
  Añadir ese PDF reactiva automáticamente la tarea pendiente.
- Revisar los recortes sugeridos. Las preguntas de varias páginas conservan
  varios recortes. Se pueden añadir, quitar y ajustar por arrastre o porcentaje.
- Guardar muestra la imagen final. Confirmar que incluye enunciado, figuras e
  incisos, que no revela soluciones y no repite otra pregunta; después aprobar.
- Solo lo aprobado aparece en el generador y en las rutas de descarga.
- Los archivos idénticos se señalan por hash; imágenes publicadas idénticas se
  bloquean con un índice único. Esto no identifica todos los duplicados visuales
  de escaneos diferentes: esa comprobación sigue formando parte de la revisión.
- Descartar un borrador no rechaza la plancha original ni notifica al alumno.

## Operación y límites

Máximo 100 MB/40 páginas por original, 8 recortes por pregunta, 1–6 preguntas por
examen generado. La extracción propone límites de preguntas, no interpreta con
fiabilidad todas las columnas/incisos/soluciones. Nunca publica automáticamente.
El original permanece intacto y los recortes se guardan en el bucket privado
`admin-worksheets`, prefijos `question-bank/review/` y `question-bank/live/`.

Las tareas tienen reserva de seis minutos y progreso por página. Un proceso
interrumpido se retoma al abrir el panel o mediante el cron diario; los fallos
visibles se reintentan desde el panel. El procesamiento de una invocación cede
tras unos tres minutos entre páginas y las funciones tienen `maxDuration=300`.
Los borradores y páginas se conservan para revisión; vigilar almacenamiento al
incorporar lotes grandes. No se importan automáticamente todos los archivos
antiguos otra vez: ya están representados en los bancos iniciales.

## Historial

La migración 068 registra las versiones de los bancos recuperadas del historial
Git. Las reservas existentes de 065 se conservan. La nueva función reconoce si
una combinación perteneció a cualquiera de esas versiones y si su posición en
la permutación ya fue consumida. Añadir preguntas no reinicia ese historial.
Las reservas se serializan por cuenta/banco/cantidad; solo una vuelta completa
permite reiniciar. Un lote muy grande de combinaciones ya vistas devuelve 202
y el cliente continúa. No hay selección aleatoria de respaldo sin historial.

Si se cambia un JSON inicial en el futuro, conservar los pools previos y crear
una **nueva** migración de seeds; no editar/reaplicar una migración ya desplegada.
`seed-history-pools.mjs` sirve para preparar los seeds iniciales de esta entrega.

## Validación

```powershell
npm.cmd run typecheck
npm.cmd run test:unit -- tests/unit/question-bank-review.test.ts tests/unit/question-bank-extractor.test.ts tests/unit/question-bank-manager.test.tsx tests/unit/live-question-bank.test.ts tests/unit/practice-exam-routes.test.ts tests/unit/exam-combinations.test.ts tests/unit/organic-final-bank.test.ts
node --test tests/integration/question-bank.test.mjs
npm.cmd run build
```

La prueba SQL usa PostgreSQL embebido (PGlite) sin tocar producción. Incluye
crecimiento del banco, historial legado, reservas simultáneas, RLS y cola.
Después de desplegar, hacer una prueba con un examen real nuevo, revisar sus
preguntas antes de aprobar y verificar una descarga. No subir un examen ficticio
a la biblioteca pública para probar.
