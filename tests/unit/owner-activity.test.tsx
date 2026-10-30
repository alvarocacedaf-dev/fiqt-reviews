import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/adminApi', () => ({ getAdminApiContext: mocks.context }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/actividad' }));
import { GET } from '@/app/api/admin/activity/route';
import { AdminShell } from '@/components/AdminShell';
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: { online: [] }, error:null }); });
describe('estadísticas exclusivas del propietario', () => {
  it.each([['student',false],['admin',false]])('bloquea consultas de %s aunque conozca la URL', async (role,isOwner) => {
    mocks.context.mockResolvedValue({role,isOwner,db:{rpc:mocks.rpc}});
    expect((await GET(new Request('https://fiqtreviews.com/api/admin/activity'))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('exige iniciar sesión', async () => {
    mocks.context.mockResolvedValue({error:'Debes iniciar sesión.',status:401});
    expect((await GET(new Request('https://fiqtreviews.com/api/admin/activity'))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('consulta con la sesión del propietario y prohíbe el almacenamiento en caché', async () => {
    mocks.context.mockResolvedValue({role:'owner',isOwner:true,db:{rpc:mocks.rpc}});
    const response = await GET(new Request('https://fiqtreviews.com/api/admin/activity?days=30&minutes=5'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.rpc).toHaveBeenCalledWith('owner_activity_snapshot',{p_days:30,p_minutes:5});
  });
  it('no permite periodos fuera del historial disponible', async () => {
    mocks.context.mockResolvedValue({role:'owner',isOwner:true,db:{rpc:mocks.rpc}});
    expect((await GET(new Request('https://fiqtreviews.com/api/admin/activity?days=999'))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('no muestra el enlace a administradores delegados', () => {
    render(<AdminShell isOwner={false}><p>Contenido</p></AdminShell>);
    expect(screen.queryByRole('link',{name:'Estadísticas y actividad'})).not.toBeInTheDocument();
  });
  it('muestra el enlace al propietario', () => {
    render(<AdminShell isOwner><p>Contenido</p></AdminShell>);
    expect(screen.getByRole('link',{name:'Estadísticas y actividad'})).toHaveAttribute('href','/admin/actividad');
  });
});
