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
};

export function ConversationList({
  currentUserId,
  isAdmin,
  lastMessageByThread,
  profiles,
  selectedThreadId,
  threadPersonId,
  threadTitle,
  threads,
}: ConversationListProps) {
  return (
    <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-xl font-black text-ink">Chats</h2>
        <p className="mt-1 text-xs text-slate-500">
          {threads.length} conversación{threads.length === 1 ? '' : 'es'}
        </p>
      </div>

      <nav className="max-h-[610px] space-y-2 overflow-y-auto p-3" aria-label="Conversaciones">
        {threads.map(thread => {
          const title = threadTitle(thread);
          const personId = threadPersonId(thread);
          const lastMessage = lastMessageByThread.get(thread.id);
          const isSelected = selectedThreadId === thread.id;
          const preview = lastMessage?.body
            || (lastMessage?.attachment_name
              ? `📎 ${lastMessage.attachment_name}`
              : thread.kind === 'match' && thread.status === 'available'
                ? 'Entrega de archivos pendiente'
                : 'Conversación disponible');

          return (
            <a href={`/mis-matches?chat=${encodeURIComponent(thread.id)}`} key={thread.id}>
              <span className={`block rounded-2xl p-3 transition ${
                isSelected ? 'bg-blue-100 ring-1 ring-blue-200' : 'hover:bg-white'
              }`}>
                <span className="flex gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-black ${
                    thread.kind === 'support' ? 'bg-gold text-ink' : 'bg-royal text-white'
                  }`}>
                    {thread.kind === 'support' && !isAdmin
                      ? 'A'
                      : initials((personId && profiles[personId]?.full_name) || 'Usuario')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-black text-ink">{title}</span>
                      {thread.kind === 'support' && !isAdmin && (
                        <span className="text-[10px] font-black uppercase text-royal">Anclado</span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {lastMessage?.sender_id === currentUserId ? 'Tú: ' : ''}{preview}
                    </span>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${
                      thread.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : thread.status === 'ended'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {thread.status === 'active'
                        ? 'Activo'
                        : thread.status === 'ended'
                          ? 'Finalizado'
                          : thread.kind === 'match'
                            ? 'Esperando archivos'
                            : 'Disponible'}
                    </span>
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
