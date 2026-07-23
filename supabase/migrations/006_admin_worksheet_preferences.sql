-- Permite que las cuentas administradoras consulten las preferencias de Planchas.
drop policy if exists "worksheet preferences admin read"
on public.worksheet_preferences;

create policy "worksheet preferences admin read"
on public.worksheet_preferences
for select
to authenticated
using (public.is_admin());

