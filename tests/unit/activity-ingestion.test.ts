import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { activitySection, activityResource } from '@/lib/activity';
const mocks = vi.hoisted(() => ({ rpc:vi.fn(), getUser:vi.fn() }));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:mocks.rpc})}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
import { POST } from '@/app/api/activity/route';
const tab='11111111-1111-4111-8111-111111111111';
const eventId='22222222-2222-4222-8222-222222222222';
function request(body:unknown,origin='https://fiqtreviews.com') {
  return new NextRequest('https://fiqtreviews.com/api/activity',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
}
beforeEach(()=> { vi.clearAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-only-secret'); mocks.getUser.mockResolvedValue({data:{user:{id:'real-user'}}}); mocks.rpc.mockResolvedValue({data:true,error:null}); });
afterEach(()=>vi.unstubAllEnvs());
describe('registro privado de actividad',()=>{
  it('obtiene la identidad del servidor y elimina parámetros privados',async()=>{
    const response=await POST(request({tab,path:'/cursos/123?token=private',active:true,userId:'forged-user',events:[{id:eventId,event:'page_view',path:'/cursos/123?token=private'}]}));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('record_site_activity',expect.objectContaining({p_user:'real-user',p_section:'Cursos y materiales',p_events:[{id:eventId,event:'page_view',section:'Cursos y materiales'}]}));
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('private');
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('forged-user');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });
  it('no acepta peticiones desde otro sitio',async()=>{
    expect((await POST(request({tab,path:'/ciclos',active:true,events:[]},'https://other.test'))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(['/admin/actividad','/auth/callback?code=secret','/desconocido','/constructor','/__proto__'])('no registra %s',async path=>{
    expect((await POST(request({tab,path,active:true,events:[]}))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('no permite falsificar envíos confirmados desde el cliente',async()=>{
    expect((await POST(request({tab,path:'/verificacion',active:true,events:[{id:eventId,event:'verification_submitted',path:'/verificacion'}]}))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('conserva el evento para reintentar cuando la base limita la frecuencia',async()=>{
    mocks.rpc.mockResolvedValue({data:false,error:null});
    expect((await POST(request({tab,path:'/ciclos',active:true,events:[]}))).status).toBe(429);
  });
  it('reduce chats a la sección sin guardar identificadores',()=>expect(activitySection('/mis-matches/private-person?message=private')).toBe('Matches y chats'));
  it('identifica cursos y archivos sin conservar tokens ni otros parámetros',()=>{
    expect(activityResource('/cursos/' + tab + '?token=private')).toEqual({type:'course',id:tab});
    expect(activityResource('/api/admin-worksheets/' + tab + '/download?token=private')).toEqual({type:'worksheet',id:tab});
    expect(activityResource('/api/admin-worksheets/folder-download?courseId=' + tab + '&token=private')).toEqual({type:'course',id:tab});
    expect(activityResource('/mis-matches/' + tab)).toBeNull();
  });
});
