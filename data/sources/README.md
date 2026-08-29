# Fuente del horario 2026-2

`Horarios_Cursos_2026-2_COMPLETO.xlsx` es el archivo oficial entregado por la universidad y constituye la fuente de `data/schedule-2026-2.json`.

Al importar la hoja se conservan los departamentos, cursos, secciones, docentes, días, horas y tipos de clase. Para integrarla con el catálogo existente se normalizan únicamente estas variantes de código:

- `BICO1` → `BIC01`
- `EP518` → `EP818`
- `PA515(*)` → `PA515`

Los bloques de práctica y laboratorio que comparten exactamente sección, día y horario se muestran como un solo bloque `Práctica / Laboratorio`, evitando que el generador los interprete como un cruce interno.

Durante la validación también se descartaron una fila exactamente duplicada y un bloque repetido de PI136-A que contenía otro horario del mismo docente, día y tipo. Esto evita duplicados y cruces internos inexistentes sin alterar los horarios oficiales restantes.
