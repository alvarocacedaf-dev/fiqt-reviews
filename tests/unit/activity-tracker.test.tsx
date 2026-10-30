import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const navigation = vi.hoisted(()=>({path:'/ciclos'}));
vi.mock('next/navigation',()=>({usePathname:()=>navigation.path}));
import { SiteActivityTracker } from '@/components/SiteActivityTracker';
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.useFakeTimers(); localStorage.clear(); navigation.path='/ciclos';
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  Object.defineProperty(navigator,'doNotTrack',{configurable:true,value:'0'});
  fetchMock=vi.fn().mockResolvedValue({ok:true});
  vi.stubGlobal('fetch',fetchMock);
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('señales de navegación',()=>{
  it('envía la primera visita y distingue inactividad',async()=>{
    render(<SiteActivityTracker />);
    await act(async()=>vi.advanceTimersByTimeAsync(1000));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).events).toEqual([expect.objectContaining({event:'page_view',path:'/ciclos'})]);
    await act(async()=>vi.advanceTimersByTimeAsync(120000));
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).active).toBe(false);
    fireEvent.pointerDown(document);
    await act(async()=>vi.advanceTimersByTimeAsync(30000));
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).active).toBe(true);
  });
  it('no registra navegación si el visitante la desactiva',async()=>{
    localStorage.setItem('fiqt-activity-optout','1'); render(<SiteActivityTracker />);
    await act(async()=>vi.advanceTimersByTimeAsync(61000));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('no envía latidos recurrentes desde una pestaña oculta',async()=>{
    render(<SiteActivityTracker />);
    await act(async()=>vi.advanceTimersByTimeAsync(1000));
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
    await act(async()=>vi.advanceTimersByTimeAsync(90000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('cuenta navegaciones internas sin volver a enviar las visitas aceptadas',async()=>{
    const view=render(<SiteActivityTracker />);
    await act(async()=>vi.advanceTimersByTimeAsync(1000));
    navigation.path='/planchas'; view.rerender(<SiteActivityTracker />);
    await act(async()=>vi.advanceTimersByTimeAsync(30000));
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).events).toEqual([expect.objectContaining({event:'page_view',path:'/planchas'})]);
  });
});
