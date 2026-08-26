import { redirect } from 'next/navigation';
import { ChatAutoRefresh } from '@/components/ChatAutoRefresh';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatExchangeDeliveryForm } from '@/components/ChatExchangeDeliveryForm';
import { ChatReportForm } from '@/components/ChatReportForm';
import { FinishChatButton, OpenChatButton } from '@/components/FinishChatButton';
import { ConversationList } from '@/components/matches/ConversationList';
import { createClient } from '@/lib/supabase/server';
import { getWorksheetSanctionState } from '@/lib/worksheetSanctions';
import { finishChat, openChat } from './actions';
import { formatBytes, formatMessageDate, formatMessageTime, initials, privateChatName } from './formatters';
import type {
  ChatMessage,
  ChatPreview,
  ChatThread,
  Course,
  ExchangeFile,
  ExchangeSubmission,
  Profile,
  WorksheetMatch,
} from './types';

type PageProps = {
  searchParams: Promise<{ chat?: string; error?: string; success?: string }>;
};

export default async function MyMatchesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login?next=/mis-matches');

  const [{ data: profile }, sanctionState] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    getWorksheetSanctionState(db),
  ]);

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin && sanctionState.isPermanentlyBlocked) redirect('/ciclos');

  const { error: ensureError } = await db.rpc('ensure_user_chat_threads');
  if (ensureError) {
    return (
      <section className="panel">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Mis matches</p>
        <h1 className="mt-2 text-3xl font-black text-ink">El chat necesita la migración 008</h1>
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-semibold leading-6 text-amber-900">
          Aplica el archivo <strong>008_match_chats.sql</strong> en Supabase para habilitar conversaciones,
          mensajes, archivos adjuntos y el cierre de chats.
        </p>
      </section>
    );
  }

  const [
    { data: rawThreads, error: threadsError },
    { data: rawProfiles, error: profilesError },
    { data: rawPreviews, error: previewsError },
  ] = await Promise.all([
    db
      .from('chat_threads')
      .select('id,kind,support_user_id,user_a_id,user_b_id,status,opened_by,opened_at,ended_by,created_at,last_message_at,ended_at')
      .order('last_message_at', { ascending: false }),
    db.rpc('get_chat_participant_profiles'),
    db.rpc('get_chat_thread_previews'),
  ]);

  const profiles = Object.fromEntries(
    ((rawProfiles ?? []) as Profile[]).map(item => [item.id, item]),
  );
  const threads = ((rawThreads ?? []) as ChatThread[]).sort((a, b) => {
    if (!isAdmin && a.kind !== b.kind) return a.kind === 'support' ? -1 : 1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
  const lastMessageByThread = new Map(
    ((rawPreviews ?? []) as ChatPreview[]).map(preview => [preview.thread_id, preview]),
  );

  const activeThread = isAdmin ? null : threads.find(thread => thread.status === 'active') ?? null;
  const requestedThread = threads.find(thread => thread.id === query.chat);
  const selectedThread = requestedThread ?? activeThread ?? threads[0] ?? null;
  const { data: rawSelectedMessages, error: selectedMessagesError } = selectedThread
    ? await db
      .from('chat_messages')
      .select('id,thread_id,sender_id,body,attachment_path,attachment_name,attachment_type,attachment_size,created_at')
      .eq('thread_id', selectedThread.id)
      .order('created_at', { ascending: true })
    : { data: [], error: null };
  const selectedMessages = (rawSelectedMessages ?? []) as ChatMessage[];

  const messagesWithUrls = await Promise.all(
    selectedMessages.map(async message => {
      if (!message.attachment_path) return message;
      const { data } = await db.storage
        .from('chat-attachments')
        .createSignedUrl(message.attachment_path, 3600);
      return { ...message, attachment_url: data?.signedUrl ?? null };
    }),
  );

  let exchangeSubmissions: ExchangeSubmission[] = [];
  let exchangeFiles: ExchangeFile[] = [];
  let exchangeError: { message: string } | null = null;
  if (selectedThread?.kind === 'match') {
    const [
      { data: rawExchangeSubmissions, error: submissionsError },
      { data: rawExchangeFiles, error: filesError },
    ] = await Promise.all([
      db
        .from('chat_exchange_submissions')
        .select('thread_id,user_id,submitted_at')
        .eq('thread_id', selectedThread.id),
      db
        .from('chat_exchange_files')
        .select('id,thread_id,uploader_id,file_path,file_name,mime_type,file_size,created_at')
        .eq('thread_id', selectedThread.id)
        .order('created_at', { ascending: true }),
    ]);

    exchangeSubmissions = (rawExchangeSubmissions ?? []) as ExchangeSubmission[];
    exchangeFiles = (rawExchangeFiles ?? []) as ExchangeFile[];
    exchangeError = submissionsError || filesError;
  }

  const exchangeParticipantIds = selectedThread?.kind === 'match'
    ? [selectedThread.user_a_id, selectedThread.user_b_id].filter((id): id is string => Boolean(id))
    : [];
  const submittedUserIds = new Set(exchangeSubmissions.map(submission => submission.user_id));
  const exchangeReady = exchangeParticipantIds.length === 2
    && exchangeParticipantIds.every(participantId => submittedUserIds.has(participantId));
  const currentUserSubmitted = submittedUserIds.has(user.id);
  const otherParticipantId = exchangeParticipantIds.find(participantId => participantId !== user.id) ?? null;
  const otherUserSubmitted = otherParticipantId ? submittedUserIds.has(otherParticipantId) : false;

  const exchangeFilesWithUrls = await Promise.all(
    exchangeFiles.map(async file => {
      const canDownload = isAdmin || exchangeReady || file.uploader_id === user.id;
      if (!canDownload) return file;
      const { data } = await db.storage
        .from('chat-attachments')
        .createSignedUrl(file.file_path, 3600);
      return { ...file, signed_url: data?.signedUrl ?? null };
    }),
  );

  let selectedMatches: WorksheetMatch[] = [];
  let courses: Record<string, Course> = {};
  if (
    selectedThread?.kind === 'match'
    && selectedThread.user_a_id
    && selectedThread.user_b_id
  ) {
    const { data: rawMatches } = await db
      .from('worksheet_matches')
      .select('id,user_a_id,user_b_id,user_a_gives_course_id,user_b_gives_course_id,status')
      .eq('user_a_id', selectedThread.user_a_id)
      .eq('user_b_id', selectedThread.user_b_id)
      .order('detected_at', { ascending: false });

    selectedMatches = (rawMatches ?? []) as WorksheetMatch[];
    const courseIds = [
      ...new Set(selectedMatches.flatMap(match => [
        match.user_a_gives_course_id,
        match.user_b_gives_course_id,
      ])),
    ];
    if (courseIds.length) {
      const { data: rawCourses } = await db
        .from('courses')
        .select('id,code,name')
        .in('id', courseIds);
      courses = Object.fromEntries(
        ((rawCourses ?? []) as Course[]).map(course => [course.id, course]),
      );
    }
  }

  function threadPersonId(thread: ChatThread) {
    if (thread.kind === 'support') return thread.support_user_id;
    return thread.user_a_id === user!.id ? thread.user_b_id : thread.user_a_id;
  }

  function threadTitle(thread: ChatThread) {
    if (thread.kind === 'support') {
      if (isAdmin) {
        const supportProfile = thread.support_user_id ? profiles[thread.support_user_id] : null;
        return `Soporte · ${privateChatName(supportProfile?.full_name || 'Estudiante')}`;
      }
      return 'Administración FIQT Reviews';
    }
    const personId = threadPersonId(thread);
    const fullName = personId ? profiles[personId]?.full_name : null;
    return fullName
      ? privateChatName(fullName)
      : 'Compañero de intercambio';
  }

  const selectedTitle = selectedThread ? threadTitle(selectedThread) : '';
  const selectedPersonId = selectedThread ? threadPersonId(selectedThread) : null;
  const selectedProfile = selectedPersonId ? profiles[selectedPersonId] : null;
  let alreadyReportedSelectedChat = false;
  if (
    selectedThread?.kind === 'match'
    && selectedThread.status === 'ended'
  ) {
    const { data: existingReport } = await db
      .from('chat_reports')
      .select('id')
      .eq('thread_id', selectedThread.id)
      .eq('reporter_id', user.id)
      .maybeSingle();
    alreadyReportedSelectedChat = Boolean(existingReport);
  }
  const dataError = threadsError || profilesError || previewsError || selectedMessagesError || exchangeError;

  return (
    <div className="space-y-4">
      <header className="panel py-5">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Planchas</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Mis matches</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Conversa con administración o coordina el intercambio con las personas que hicieron match contigo.
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
          A excepción del chat anclado con la administración, todos los demás chats que generes se eliminarán
          después de 14 días. Guarda los archivos de tus chats antes de ese plazo para no perderlos.
        </p>
      </header>

      {query.success && (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{query.success}</p>
      )}
      {query.error && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">{query.error}</p>
      )}
      {dataError && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">
          No se pudieron cargar todas las conversaciones: {dataError.message}
        </p>
      )}

      <section className="grid min-h-[680px] overflow-hidden rounded-3xl bg-white shadow-card lg:grid-cols-[280px_minmax(0,1fr)_270px]">
        <ConversationList
          currentUserId={user.id}
          isAdmin={isAdmin}
          lastMessageByThread={lastMessageByThread}
          profiles={profiles}
          selectedThreadId={selectedThread?.id ?? null}
          threadPersonId={threadPersonId}
          threadTitle={threadTitle}
          threads={threads}
        />

        <div className="flex min-h-[620px] min-w-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          {selectedThread ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-black ${
                    selectedThread.kind === 'support'
                      ? 'bg-gold text-ink'
                      : 'bg-royal text-white'
                  }`}>
                    {selectedThread.kind === 'support' && !isAdmin
                      ? 'A'
                      : initials(selectedProfile?.full_name || selectedTitle.replace(/^Soporte · /, ''))}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-black text-ink">{selectedTitle}</h2>
                    <p className="text-xs font-semibold text-slate-500">
                      {selectedThread.status === 'active'
                        ? 'Chat activo'
                        : selectedThread.status === 'ended'
                          ? 'Chat finalizado'
                          : selectedThread.kind === 'match'
                            ? 'Esperando la entrega de archivos'
                            : 'Disponible para abrir'}
                    </p>
                  </div>
                </div>

                {selectedThread.status === 'active' && (
                  <form action={finishChat}>
                    <input name="thread_id" type="hidden" value={selectedThread.id} />
                    <FinishChatButton />
                  </form>
                )}
              </header>

              <div
                className="flex min-h-[430px] flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4 sm:p-6"
                id="chat-message-panel"
              >
                {selectedThread.kind === 'match' && selectedThread.status === 'available' && (
                  <div className="mx-auto w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-sm font-black text-amber-950">Entrega previa obligatoria</p>
                    <p className="mt-2 text-sm leading-6 text-amber-900">
                      Antes de iniciar el chat debes enviar tus archivos que intercambiarás. La otra persona no podrá
                      descargar estos archivos a menos que también envíe sus archivos que intercambiará.
                    </p>
                    <div className="mt-3 flex justify-center gap-2 text-xs font-black">
                      <span className={`rounded-full px-3 py-1 ${
                        currentUserSubmitted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white text-amber-900'
                      }`}>
                        Tu entrega: {currentUserSubmitted ? 'completa' : 'pendiente'}
                      </span>
                      <span className={`rounded-full px-3 py-1 ${
                        otherUserSubmitted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white text-amber-900'
                      }`}>
                        Otra persona: {otherUserSubmitted ? 'completa' : 'pendiente'}
                      </span>
                    </div>
                  </div>
                )}

                {messagesWithUrls.map(message => {
                  const isOwn = message.sender_id === user.id;
                  return (
                    <article
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                        isOwn
                          ? 'ml-auto rounded-br-md bg-royal text-white'
                          : 'mr-auto rounded-bl-md bg-white text-ink'
                      }`}
                      key={message.id}
                    >
                      {!isOwn && selectedThread.kind === 'support' && (
                        <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-gold">
                          {isAdmin
                            ? privateChatName(profiles[message.sender_id]?.full_name || 'Estudiante')
                            : 'Administración'}
                        </p>
                      )}
                      {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>}
                      {message.attachment_name && (
                        message.attachment_url ? (
                          <a
                            className={`mt-2 block rounded-xl p-2 text-sm font-bold underline-offset-2 hover:underline ${
                              isOwn ? 'bg-white/15' : 'bg-blue-50 text-royal'
                            }`}
                            href={message.attachment_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {message.attachment_type?.startsWith('image/') && (
                              <img
                                alt={message.attachment_name}
                                className="mb-2 max-h-72 w-full rounded-lg object-contain"
                                src={message.attachment_url}
                              />
                            )}
                            <span className="flex min-w-0 items-center gap-2 px-1">
                              <span className="text-xl" aria-hidden="true">📎</span>
                              <span className="min-w-0">
                                <span className="block truncate">{message.attachment_name}</span>
                                <span className={`block text-[10px] ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {formatBytes(message.attachment_size)}
                                </span>
                              </span>
                            </span>
                          </a>
                        ) : (
                          <p className="mt-2 text-xs font-bold">📎 {message.attachment_name}</p>
                        )
                      )}
                      <p className={`mt-1 text-right text-[10px] ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    </article>
                  );
                })}

                {!messagesWithUrls.length && (
                  <div className="m-auto max-w-sm rounded-2xl bg-white p-5 text-center shadow-sm">
                    <p className="font-black text-ink">
                      {selectedThread.kind === 'support'
                        ? 'Chat con administración'
                        : 'Coordinen su intercambio'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {selectedThread.kind === 'support'
                        ? 'Escribe aquí si necesitas ayuda con FIQT Reviews.'
                        : 'Pueden conversar y compartir las planchas mediante archivos adjuntos.'}
                    </p>
                  </div>
                )}

                <ChatAutoRefresh messageCount={messagesWithUrls.length} />
              </div>

              {selectedThread.status === 'active' ? (
                <ChatComposer threadId={selectedThread.id} userId={user.id} />
              ) : selectedThread.status === 'ended' ? (
                <div className="border-t border-slate-200 bg-slate-100 p-4 text-center">
                  <p className="text-sm font-black text-slate-600">Este chat fue finalizado.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Los mensajes y archivos permanecen guardados, pero ya no se pueden realizar nuevos envíos.
                  </p>
                </div>
              ) : selectedThread.kind === 'match' ? (
                isAdmin ? (
                  <div className="border-t border-slate-200 bg-amber-50 p-4 text-center">
                    <p className="text-sm font-black text-amber-900">Intercambio pendiente</p>
                    <p className="mt-1 text-xs text-amber-800">
                      El chat se activará automáticamente cuando ambos estudiantes entreguen sus archivos.
                    </p>
                  </div>
                ) : (
                  <ChatExchangeDeliveryForm
                    alreadySubmitted={currentUserSubmitted}
                    otherSubmitted={otherUserSubmitted}
                    threadId={selectedThread.id}
                    userId={user.id}
                  />
                )
              ) : isAdmin && selectedThread.kind === 'support' ? (
                <div className="border-t border-slate-200 bg-amber-50 p-4 text-center">
                  <p className="text-sm font-black text-amber-900">Esperando al estudiante</p>
                  <p className="mt-1 text-xs text-amber-800">
                    El estudiante debe abrir este chat antes de que administración pueda enviar mensajes.
                  </p>
                </div>
              ) : (
                <div className="border-t border-slate-200 bg-blue-50 p-4 text-center">
                  <p className="text-sm font-black text-ink">Este chat todavía no está activo</p>
                  {activeThread && activeThread.id !== selectedThread.id ? (
                    <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-600">
                      Puedes consultar esta conversación, pero no activarla ni escribir aquí mientras mantengas
                      otro chat activo.
                    </p>
                  ) : (
                    <>
                      <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-600">
                        Solo puedes tener un chat activo. Después de finalizarlo tendrás que esperar 24 horas para
                        abrir otro. En un chat de match, la otra persona también debe estar disponible.
                      </p>
                      <form action={openChat} className="mt-3">
                        <input name="thread_id" type="hidden" value={selectedThread.id} />
                        <OpenChatButton />
                      </form>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="m-auto p-8 text-center">
              <p className="text-xl font-black text-ink">Selecciona una conversación</p>
              <p className="mt-2 text-sm text-slate-500">Aquí aparecerán tus mensajes.</p>
            </div>
          )}
        </div>

        <aside className="bg-white p-5">
          {selectedThread ? (
            <>
              <div className="text-center">
                <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full text-2xl font-black ${
                  selectedThread.kind === 'support'
                    ? 'bg-gold text-ink'
                    : 'bg-blue-100 text-royal'
                }`}>
                  {selectedThread.kind === 'support' && !isAdmin
                    ? 'A'
                    : initials(selectedProfile?.full_name || selectedTitle.replace(/^Soporte · /, ''))}
                </span>
                <h2 className="mt-3 font-black text-ink">{selectedTitle}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Conversación creada el {formatMessageDate(selectedThread.created_at)}
                </p>
              </div>

              {selectedThread.kind === 'match' && (
                <>
                  <section className="mt-6">
                    <p className="text-xs font-black uppercase tracking-wider text-royal">Archivos del intercambio</p>
                    <div className="mt-3 space-y-3">
                      {exchangeParticipantIds.map(participantId => {
                        const isCurrentUser = participantId === user.id;
                        const participantSubmitted = submittedUserIds.has(participantId);
                        const participantFiles = exchangeFilesWithUrls.filter(file => file.uploader_id === participantId);

                        return (
                          <div className="rounded-2xl border border-slate-200 p-3 text-xs" key={participantId}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-black text-ink">
                                {isCurrentUser ? 'Tu entrega' : 'Entrega de la otra persona'}
                              </p>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                participantSubmitted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {participantSubmitted ? 'Entregada' : 'Pendiente'}
                              </span>
                            </div>
                            {participantFiles.length > 0 && (
                              <ul className="mt-2 space-y-2">
                                {participantFiles.map(file => (
                                  <li key={file.id}>
                                    {file.signed_url ? (
                                      <a
                                        className="block truncate font-bold text-royal hover:underline"
                                        href={file.signed_url}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        📎 {file.file_name}
                                      </a>
                                    ) : (
                                      <span className="block truncate font-semibold text-slate-500">
                                        🔒 Archivo protegido hasta completar ambas entregas
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="mt-6">
                    <p className="text-xs font-black uppercase tracking-wider text-royal">Intercambio acordado</p>
                    <div className="mt-3 space-y-3">
                    {selectedMatches.filter(match => match.status === 'active').map(match => {
                      const currentGivesId = match.user_a_id === user.id
                        ? match.user_a_gives_course_id
                        : match.user_b_gives_course_id;
                      const currentReceivesId = match.user_a_id === user.id
                        ? match.user_b_gives_course_id
                        : match.user_a_gives_course_id;
                      const gives = courses[currentGivesId];
                      const receives = courses[currentReceivesId];

                      return (
                        <div className="rounded-2xl border border-slate-200 p-3 text-xs" key={match.id}>
                          <p className="font-black text-emerald-800">Tú compartes</p>
                          <p className="mt-1 font-semibold text-slate-700">
                            {gives?.code || 'Sin código'} — {gives?.name || 'Curso no encontrado'}
                          </p>
                          <p className="mt-3 font-black text-royal">Tú recibes</p>
                          <p className="mt-1 font-semibold text-slate-700">
                            {receives?.code || 'Sin código'} — {receives?.name || 'Curso no encontrado'}
                          </p>
                        </div>
                      );
                    })}

                    {!selectedMatches.some(match => match.status === 'active') && (
                      <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">
                        Las selecciones ya no coinciden, pero el historial del chat se conserva.
                      </p>
                    )}
                    </div>
                  </section>
                </>
              )}

              {selectedThread.status === 'ended' && selectedThread.ended_at && (
                <>
                  <p className="mt-5 rounded-2xl bg-slate-100 p-3 text-xs font-semibold text-slate-500">
                    Finalizado el {formatMessageDate(selectedThread.ended_at)}.
                  </p>
                  {selectedThread.kind === 'match' && (
                    <ChatReportForm
                      alreadyReported={alreadyReportedSelectedChat}
                      threadId={selectedThread.id}
                      userId={user.id}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-slate-500">Información de la conversación</p>
          )}
        </aside>
      </section>
    </div>
  );
}
