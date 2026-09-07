-- Corrige el ciclo y el título de la práctica calificada 5 de BMA01.

update public.admin_worksheets worksheet
set
  title = 'Práctica calificada 5 de Cálculo Diferencial 2018-3',
  academic_term = '2018-3'
where worksheet.course_id = (
  select course.id
  from public.courses course
  where course.code = 'BMA01'
  limit 1
)
and public.normalized_worksheet_title(worksheet.title) =
  public.normalized_worksheet_title('Práctica calificada 5 de Cálculo Diferencial 2019-0');

update public.worksheet_donations donation
set
  title = 'Práctica calificada 5 de Cálculo Diferencial 2018-3',
  academic_term = '2018-3'
where donation.course_id = (
  select course.id
  from public.courses course
  where course.code = 'BMA01'
  limit 1
)
and public.normalized_worksheet_title(donation.title) =
  public.normalized_worksheet_title('Práctica calificada 5 de Cálculo Diferencial 2019-0');
