import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync('lib/professorCatalog.ts', 'utf8');
const entries = [];
const entryRegex = /\{\s*courseCode:\s*'([^']+)',\s*professors:\s*\[([^\]]*)\]\s*\}/g;
let match;
while ((match = entryRegex.exec(source))) {
  const courseCode = match[1];
  const professors = Array.from(match[2].matchAll(/'([^']+)'/g)).map(item => item[1]);
  for (const professor of professors) entries.push([courseCode, professor]);
}

const sqlString = value => `'${value.replaceAll("'", "''")}'`;

const values = entries
  .map(([courseCode, professor]) => `  (${sqlString(courseCode)}, ${sqlString(professor)})`)
  .join(',\n');

const sql = `-- FIQT Reviews: docentes y asociaciones curso-docente de la malla cargada.
-- Fuente de carga inicial: capturas públicas proporcionadas por el usuario.
-- No incluye DNI, códigos internos, horarios, vacantes ni datos administrativos.

create unique index if not exists professors_full_name_unique
on public.professors(full_name);

with links(course_code, professor_name) as (
values
${values}
)
insert into public.professors(full_name, source_name, is_active)
select distinct professor_name, 'DIRCE UNI', true
from links
on conflict (full_name) do update set
  source_name = excluded.source_name,
  is_active = true;

with links(course_code, professor_name) as (
values
${values}
)
insert into public.course_professors(course_id, professor_id)
select c.id, p.id
from links l
join public.courses c on c.code = l.course_code
join public.professors p on p.full_name = l.professor_name
where not exists (
  select 1
  from public.course_professors cp
  where cp.course_id = c.id
    and cp.professor_id = p.id
);

select
  c.code,
  c.name as curso,
  count(cp.professor_id) as profesores_asociados
from public.courses c
left join public.course_professors cp on cp.course_id = c.id
where c.code in (select distinct course_code from (values
${values}
) as links(course_code, professor_name))
group by c.code, c.name
order by c.code;
`;

writeFileSync('supabase/seed_professors_malla.sql', sql, 'utf8');
