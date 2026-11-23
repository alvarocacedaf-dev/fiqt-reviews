import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionBankManager } from '@/components/QuestionBankManager';
const job = { id:'job',bank_key:'qu328-final',status:'review',worksheet_id:'source',admin_worksheets:{title:'Examen final 2018-1'},pages:[{page:1,path:'private.jpg',width:1000,height:1500}],page_count:1 };
const draft = { id:'draft',ordinal:1,version:2,status:'draft',extracted_text:'1. Calcule',regions:[{page:1,left:.1,top:.1,width:.8,height:.8}],question:null };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('requiere revisión explícita y bloquea doble envío durante la publicación',async()=>{
  let release: (()=>void)|undefined;
  const fetchMock=vi.fn(async(url:string,init?:RequestInit)=>{
    if(init?.method==='POST') { await new Promise<void>(resolve=>{release=resolve;}); return Response.json({ok:true}); }
    return Response.json(url.includes('?id=')?{job,questions:[draft]}:{jobs:[job]});
  });
  vi.stubGlobal('fetch',fetchMock);
  render(<QuestionBankManager />);
  fireEvent.click(await screen.findByRole('button',{name:/Examen final 2018-1/}));
  const publish=await screen.findByRole('button',{name:'Aprobar y publicar'});
  expect(publish).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/Revisé todos los recortes/));
  fireEvent.click(publish); fireEvent.click(publish);
  await waitFor(()=>expect(fetchMock.mock.calls.filter(([,i])=>i?.method==='POST')).toHaveLength(1));
  const call=fetchMock.mock.calls.find(([,i])=>i?.method==='POST');
  expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({id:'draft',version:2,action:'approve',confirmed:true});
  release?.();
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar y ver recorte'})).not.toBeDisabled());
});
it('explica cuando un Word necesita PDF y permite reintentar',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>Response.json(url.includes('?id=')?{job:{...job,status:'waiting_pdf',warning:'Asocia un PDF de este Word'},questions:[]}:{jobs:[{...job,status:'waiting_pdf'}]})));
  render(<QuestionBankManager />);
  fireEvent.click(await screen.findByRole('button',{name:/Examen final 2018-1/}));
  expect(await screen.findByText('Asocia un PDF de este Word')).toBeVisible();
  expect(screen.getByRole('button',{name:'Reintentar procesamiento'})).toBeEnabled();
  expect(screen.queryByRole('button',{name:'Aprobar y publicar'})).toBeNull();
});
