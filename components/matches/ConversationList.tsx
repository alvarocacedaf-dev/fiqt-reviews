import { initials } from '@/app/mis-matches/formatters';
import type { ChatPreview, ChatThread, Profile } from '@/app/mis-matches/types';

type ConversationListProps = {
  currentUserId: string;
  isAdmin: boolean;
  lastMessageByThread: Map<string, ChatPreview>;
  profiles: Record<string, Profile>;
  selectedThreadId: string | null;
  threadPersonId: (thread: ChatThread) => string | null;
  threadTitle: (thread: ChatThread) => string;
  threads: ChatThread[];
  totalThreads?: number;
  currentPage?: number;
  className?: string;
};

function previewDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const dateKey = date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const todayKey = today.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  if (dateKey === todayKey) {
    return new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima' }).format(date);
  }
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Lima' }).format(date);
}

export function ConversationList({
  currentUserId,
  isAdmin,
  lastMessageByThread,
  profiles,
  selectedThreadId,
  threadPersonId,
  threadTitle,
  threads,
  totalThreads = threads.length,
  currentPage = 1,
  className = '',
}: ConversationListProps) {
  return (
    <aside className={`border-b border-slate-200 bg-white lg:border-b-0 lg:border-r ${className}`}>
      <div className="border-b border-slate-200 px-5 py-4 text-center lg:text-left">
        <h2 className="text-2xl font-black text-ink lg:text-xl">Chats</h2>
        <p className="mt-1 text-xs text-slate-500">
          {totalThreads} conversación{totalThreads === 1 ? '' : 'es'}
        </p>
      </div>

      <nav className="divide-y divide-slate-200 overflow-y-auto lg:max-h-[610px]" aria-label="Conversaciones">
        {threads.map(thread => {
          const title = threadTitle(thread);
          const personId = threadPersonId(thread);
          const lastMessage = lastMessageByThread.get(thread.id);
          const isSelected = selectedThreadId === thread.id;
          const preview = lastMessage?.body
            || (lastMessage?.attachment_name
              ? `Archivo: ${lastMessage.attachment_name}`
              : thread.kind === 'match' && thread.status === 'available'
                ? 'Entrega de archivos pendiente'
                : 'Conversación disponible');

          return (
            <a href={`/mis-matches?chat=${encodeURIComponent(thread.id)}&page=${currentPage}`} key={thread.id}>
              <span className={`block px-4 py-3 transition ${
                isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}>
                <span className="flex items-center gap-3">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-black ${
                    thread.kind === 'support' ? 'bg-gold text-ink' : 'bg-royal text-white'
                  }`}>
                    {thread.kind === 'support' && !isAdmin
                      ? 'A'
                      : initials((personId && profiles[personId]?.full_name) || 'Usuario')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-base font-black text-ink">{title}</span>
                      <span className={`shrink-0 text-[11px] font-semibold ${thread.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {previewDate(lastMessage?.created_at ?? thread.last_message_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-sm text-slate-500">
                        {lastMessage?.sender_id === currentUserId ? 'Tú: ' : ''}{preview}
                      </span>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        thread.status === 'active' ? 'bg-emerald-500' : thread.status === 'ended' ? 'bg-slate-300' : 'bg-amber-400'
                      }`} aria-label={thread.status === 'active' ? 'Activo' : thread.status === 'ended' ? 'Finalizado' : 'Disponible'} />
                    </span>
                    {thread.kind === 'support' && !isAdmin && <span className="mt-1 block text-[10px] font-black uppercase text-royal">Chat anclado</span>}
                  </span>
                </span>
              </span>
            </a>
          );
        })}

        {!threads.length && (
          <p className="p-4 text-center text-sm text-slate-500">Todavía no hay conversaciones.</p>
        )}
      </nav>
    </aside>
  );
}
