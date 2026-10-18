import { useHttp, usePage } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    CheckCheck,
    ChevronLeft,
    MessageCircle,
    Paperclip,
    Send,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { usePermission } from '@/hooks/use-permission';
import chatApi from '@/routes/api/chat';
import type { ChatConversation, ChatMessage, ChatPerson } from '@/types';
import type { Auth } from '@/types';

type ConversationListResponse = {
    data: ChatConversation[];
    unread_total: number;
};

type PeopleResponse = { data: ChatPerson[] };
type MessagesResponse = { data: ChatMessage[] };
type SocketTokenResponse = { data: { token: string; expires_in: number } };
type MessageForm = {
    recipient_id: number;
    title: string;
    body: string;
    attachment: File | null;
};

function timestamp(value: string): string {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function FloatingChat() {
    const { can } = usePermission();
    const currentUserId = usePage<{ auth: Auth }>().props.auth.user?.id ?? null;
    const canView = can('chat.view');
    const canAnnounce = can('chat.announce');
    const [open, setOpen] = useState(false);
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [selectedConversation, setSelectedConversation] =
        useState<ChatConversation | null>(null);
    const [newRecipient, setNewRecipient] = useState<ChatPerson | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [search, setSearch] = useState('');
    const [people, setPeople] = useState<ChatPerson[]>([]);
    const [body, setBody] = useState('');
    const [title, setTitle] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [announcing, setAnnouncing] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const selectedRef = useRef(selectedConversation);
    const openRef = useRef(open);
    const conversationRequest = useHttp<
        Record<string, never>,
        ConversationListResponse
    >({});
    const peopleRequest = useHttp<Record<string, never>, PeopleResponse>({});
    const messagesRequest = useHttp<Record<string, never>, MessagesResponse>(
        {},
    );
    const readRequest = useHttp<Record<string, never>>({});
    const tokenRequest = useHttp<Record<string, never>, SocketTokenResponse>(
        {},
    );
    const sendRequest = useHttp<MessageForm, { data: ChatMessage }>({
        recipient_id: 0,
        title: '',
        body: '',
        attachment: null,
    });

    async function loadConversations(): Promise<ConversationListResponse | null> {
        try {
            const result = await conversationRequest.get(
                chatApi.conversations.index.url(),
            );
            setConversations(result.data);
            setUnreadTotal(result.unread_total);

            return result;
        } catch {
            setError('Unable to load conversations.');

            return null;
        }
    }

    async function loadMessages(
        conversation: ChatConversation,
        markRead: boolean,
    ): Promise<void> {
        setLoadingMessages(true);

        try {
            const result = await messagesRequest.get(
                chatApi.messages.index.url(conversation.id),
            );
            setMessages([...result.data].reverse());

            if (markRead) {
                await readRequest.post(
                    chatApi.messages.read.url(conversation.id),
                );
                await loadConversations();
            }
        } catch {
            setError('Unable to load this conversation.');
        } finally {
            setLoadingMessages(false);
        }
    }

    useEffect(() => {
        let disposed = false;

        async function load(): Promise<void> {
            if (!canView) {
                return;
            }

            try {
                const result = await conversationRequest.get(
                    chatApi.conversations.index.url(),
                );

                if (!disposed) {
                    setConversations(result.data);
                    setUnreadTotal(result.unread_total);
                }
            } catch {
                if (!disposed) {
                    setError('Unable to load conversations.');
                }
            }
        }

        void load();

        return () => {
            disposed = true;
        };
        // Requests are stable for the lifetime of this layout.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView]);

    useEffect(() => {
        selectedRef.current = selectedConversation;
        openRef.current = open;
    }, [open, selectedConversation]);

    useEffect(() => {
        if (!canView || search.trim().length < 2) {
            return;
        }

        const timer = window.setTimeout(async () => {
            try {
                const result = await peopleRequest.get(
                    chatApi.users.index.url({
                        query: { search: search.trim() },
                    }),
                );
                setPeople(result.data);
            } catch {
                setError('Unable to search staff.');
            }
        }, 250);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView, search]);

    useEffect(() => {
        if (!canView) {
            return;
        }

        let disposed = false;
        let socket: Socket | null = null;
        let refreshTimer = 0;

        async function connect(): Promise<void> {
            if (disposed) {
                return;
            }

            try {
                const result = await tokenRequest.post(
                    chatApi.socketToken.url(),
                );

                if (disposed) {
                    return;
                }

                if (!socket) {
                    const socketUrl = import.meta.env.VITE_CHAT_SOCKET_URL || (import.meta.env.DEV
                        ? `${window.location.protocol}//${window.location.hostname}:3000`
                        : window.location.origin);
                    socket = io(socketUrl, {
                        path: '/socket.io',
                        transports: ['websocket'],
                        auth: { token: result.data.token },
                    });
                    socket.on(
                        'chat.message.created',
                        (event: {
                            conversation_id: number;
                            message: ChatMessage;
                        }) => {
                            void loadConversations();

                            if (
                                selectedRef.current?.id ===
                                    event.conversation_id &&
                                openRef.current
                            ) {
                                setMessages((current) =>
                                    current.some(
                                        (message) =>
                                            message.id === event.message.id,
                                    )
                                        ? current
                                        : [...current, event.message],
                                );

                                if (event.message.sender.id !== currentUserId) {
                                    void readRequest
                                        .post(
                                            chatApi.messages.read.url(
                                                event.conversation_id,
                                            ),
                                        )
                                        .then(() => loadConversations())
                                        .catch(() =>
                                            setError(
                                                'Unable to update the read receipt.',
                                            ),
                                        );
                                }
                            }
                        },
                    );
                    socket.on(
                        'chat.message.read',
                        (event: {
                            conversation_id: number;
                            message_ids: number[];
                            reader_id: number;
                            reader_name: string;
                            read_at: string;
                        }) => {
                            void loadConversations();

                            if (
                                selectedRef.current?.id ===
                                    event.conversation_id &&
                                openRef.current
                            ) {
                                setMessages((current) =>
                                    current.map((message) =>
                                        event.message_ids.includes(
                                            message.id,
                                        ) &&
                                        !message.readers.some(
                                            (reader) =>
                                                reader.id === event.reader_id,
                                        )
                                            ? {
                                                  ...message,
                                                  read_count:
                                                      message.read_count + 1,
                                                  readers: [
                                                      ...message.readers,
                                                      {
                                                          id: event.reader_id,
                                                          name: event.reader_name,
                                                          read_at:
                                                              event.read_at,
                                                      },
                                                  ],
                                              }
                                            : message,
                                    ),
                                );
                            }
                        },
                    );
                    socket.on('connect', () => {
                        void loadConversations();

                        if (selectedRef.current && openRef.current) {
                            void loadMessages(selectedRef.current, true);
                        }
                    });
                } else {
                    socket.auth = { token: result.data.token };
                    socket.disconnect();
                    socket.connect();
                }

                window.clearInterval(refreshTimer);
                refreshTimer = window.setInterval(
                    () => void connect(),
                    240_000,
                );
            } catch {
                if (!disposed) {
                    window.setTimeout(() => void connect(), 5000);
                }
            }
        }

        void connect();

        return () => {
            disposed = true;
            window.clearInterval(refreshTimer);
            socket?.disconnect();
        };
        // Socket callbacks read the latest view when the effect is installed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView]);

    function choosePerson(person: ChatPerson): void {
        const existing =
            conversations.find(
                (conversation) =>
                    conversation.type === 'direct' &&
                    conversation.other_user?.id === person.id,
            ) ?? null;
        setSelectedConversation(existing);
        setNewRecipient(existing ? null : person);
        setMessages([]);
        setAnnouncing(false);
        setPeople([]);
        setSearch('');
        setError(null);

        if (existing && open) {
            void loadMessages(existing, true);
        }
    }

    function chooseConversation(conversation: ChatConversation): void {
        setSelectedConversation(conversation);
        setNewRecipient(null);
        setAnnouncing(conversation.type === 'announcement' && canAnnounce);
        setMessages([]);
        setError(null);

        if (open) {
            void loadMessages(conversation, true);
        }
    }

    function startAnnouncement(): void {
        const announcement =
            conversations.find(
                (conversation) => conversation.type === 'announcement',
            ) ?? null;
        setSelectedConversation(announcement);
        setNewRecipient(null);
        setAnnouncing(true);
        setMessages([]);
        setError(null);

        if (announcement && open) {
            void loadMessages(announcement, true);
        }
    }

    async function sendMessage(
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setError(null);

        try {
            sendRequest.setData({
                recipient_id:
                    newRecipient?.id ??
                    selectedConversation?.other_user?.id ??
                    0,
                title: announcing ? title : '',
                body,
                attachment,
            });
            const route = announcing
                ? chatApi.announcements.store.url()
                : chatApi.messages.store.url();
            const sent = await sendRequest.post(route);
            setBody('');
            setTitle('');
            setAttachment(null);

            if (fileInput.current) {
                fileInput.current.value = '';
            }

            const latest = await loadConversations();

            if (!announcing) {
                const recipientId =
                    newRecipient?.id ?? selectedConversation?.other_user?.id;
                const conversation =
                    latest?.data.find(
                        (item) => item.id === sent.data.conversation_id,
                    ) ??
                    conversations.find(
                        (item) =>
                            item.type === 'direct' &&
                            item.other_user?.id === recipientId,
                    );

                if (conversation) {
                    setSelectedConversation(conversation);
                    setNewRecipient(null);
                    await loadMessages(conversation, false);
                }
            } else {
                const announcement =
                    latest?.data.find((item) => item.type === 'announcement') ??
                    conversations.find((item) => item.type === 'announcement');

                if (announcement) {
                    setSelectedConversation(announcement);
                    await loadMessages(announcement, false);
                }
            }
        } catch {
            setError(
                'Message could not be sent. Check the text or attachment and try again.',
            );
        }
    }

    if (!canView) {
        return null;
    }

    const activeTitle =
        selectedConversation?.title ??
        (announcing
            ? 'New announcement'
            : (newRecipient?.name ?? 'Select a conversation'));
    const canCompose =
        selectedConversation?.type === 'direct' ||
        newRecipient !== null ||
        (announcing && canAnnounce);
    const validationError =
        sendRequest.errors.attachment ??
        sendRequest.errors.body ??
        sendRequest.errors.title;

    return (
        <div className="fixed right-4 bottom-4 z-50">
            {open && (
                <section
                    className="mb-3 flex h-[min(620px,calc(100dvh-7rem))] w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl max-sm:fixed max-sm:inset-2 max-sm:mb-0 max-sm:h-auto max-sm:w-auto"
                    aria-label="Staff chat"
                >
                    <aside
                        className={`${selectedConversation || newRecipient || announcing ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r md:w-64`}
                    >
                        <div className="flex items-center justify-between border-b p-3">
                            <h2 className="text-sm font-semibold">Messages</h2>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-md p-2 text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none"
                                aria-label="Close chat"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="border-b p-3">
                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);

                                    if (event.target.value.trim().length < 2) {
                                        setPeople([]);
                                    }
                                }}
                                placeholder="Search staff"
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
                                aria-label="Search staff"
                            />
                            {canAnnounce && (
                                <button
                                    type="button"
                                    onClick={startAnnouncement}
                                    className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-left text-xs font-medium text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none"
                                >
                                    New announcement
                                </button>
                            )}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {people.map((person) => (
                                <button
                                    key={person.id}
                                    type="button"
                                    onClick={() => choosePerson(person)}
                                    className="flex w-full items-center gap-3 border-b px-3 py-3 text-left text-sm hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none"
                                >
                                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                        {person.name.slice(0, 1)}
                                    </span>
                                    <span className="truncate">
                                        {person.name}
                                    </span>
                                </button>
                            ))}
                            {conversations.map((conversation) => (
                                <button
                                    key={conversation.id}
                                    type="button"
                                    onClick={() =>
                                        chooseConversation(conversation)
                                    }
                                    className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none ${selectedConversation?.id === conversation.id ? 'bg-accent' : ''}`}
                                >
                                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                                        {conversation.type ===
                                        'announcement' ? (
                                            <MessageCircle className="size-4" />
                                        ) : (
                                            conversation.title.slice(0, 1)
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium">
                                            {conversation.title}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {conversation.latest_message
                                                ?.body ||
                                                conversation.latest_message
                                                    ?.attachments[0]?.name ||
                                                'No messages yet'}
                                        </span>
                                    </span>
                                    {conversation.unread_count > 0 && (
                                        <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                            {conversation.unread_count}
                                        </span>
                                    )}
                                </button>
                            ))}
                            {conversations.length === 0 &&
                                people.length === 0 && (
                                    <p className="p-4 text-center text-xs text-muted-foreground">
                                        Search for a colleague to start a
                                        conversation.
                                    </p>
                                )}
                        </div>
                    </aside>
                    <div
                        className={`${selectedConversation || newRecipient || announcing ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}
                    >
                        <div className="flex h-14 items-center gap-2 border-b px-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedConversation(null);
                                    setNewRecipient(null);
                                    setAnnouncing(false);
                                }}
                                className="rounded-md p-2 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none md:hidden"
                                aria-label="Back to conversations"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {activeTitle}
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-md p-2 text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none"
                                aria-label="Minimize chat"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col-reverse gap-3 overflow-y-auto p-3">
                            {loadingMessages && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Loading messages…
                                </p>
                            )}
                            {!loadingMessages && messages.length === 0 && (
                                <p className="m-auto text-center text-sm text-muted-foreground">
                                    {selectedConversation
                                        ? 'No messages yet. Start the conversation.'
                                        : 'Send the first message to begin.'}
                                </p>
                            )}
                            {[...messages].reverse().map((message) => {
                                const own = message.sender.id === currentUserId;

                                return (
                                    <article
                                        key={message.id}
                                        className={`max-w-[88%] rounded-xl border px-3 py-2 text-sm ${own ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto bg-muted'}`}
                                    >
                                        {message.title && (
                                            <h3 className="mb-1 font-semibold">
                                                {message.title}
                                            </h3>
                                        )}
                                        {message.body && (
                                            <p className="break-words whitespace-pre-wrap">
                                                {message.body}
                                            </p>
                                        )}
                                        {message.attachments.map((file) => (
                                            <a
                                                key={file.id}
                                                href={file.download_url}
                                                download
                                                className="mt-2 flex items-center gap-2 underline underline-offset-2"
                                            >
                                                <Paperclip className="size-3.5" />
                                                {file.name}
                                            </a>
                                        ))}
                                        {own &&
                                            announcing &&
                                            message.readers.length > 0 && (
                                                <p className="mt-1 text-[10px] opacity-75">
                                                    Seen by{' '}
                                                    {message.readers
                                                        .slice(0, 3)
                                                        .map(
                                                            (reader) =>
                                                                reader.name,
                                                        )
                                                        .join(', ')}
                                                    {message.readers.length > 3
                                                        ? ` +${message.readers.length - 3}`
                                                        : ''}
                                                </p>
                                            )}
                                        <div
                                            className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75"
                                            title={message.readers
                                                .map((reader) => reader.name)
                                                .join(', ')}
                                        >
                                            <span>
                                                {timestamp(message.created_at)}
                                            </span>
                                            {own &&
                                                (announcing ? (
                                                    <span>
                                                        {message.read_count}{' '}
                                                        seen
                                                    </span>
                                                ) : message.read_count > 0 ? (
                                                    <>
                                                        <CheckCheck className="size-3" />
                                                        <span>Seen</span>
                                                    </>
                                                ) : null)}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                        {(validationError || error) && (
                            <p
                                role="alert"
                                className="px-3 text-xs text-destructive"
                            >
                                {String(validationError ?? error)}
                            </p>
                        )}
                        {canCompose && (
                            <form
                                onSubmit={sendMessage}
                                className="border-t p-3"
                            >
                                {announcing && (
                                    <input
                                        value={title}
                                        onChange={(event) =>
                                            setTitle(event.target.value)
                                        }
                                        placeholder="Announcement title"
                                        maxLength={255}
                                        required
                                        className="mb-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
                                    />
                                )}
                                <textarea
                                    value={body}
                                    onChange={(event) =>
                                        setBody(event.target.value)
                                    }
                                    placeholder="Write a message…"
                                    rows={2}
                                    maxLength={10000}
                                    className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
                                />
                                {sendRequest.progress && (
                                    <progress
                                        className="mt-2 h-1 w-full accent-primary"
                                        max={100}
                                        value={sendRequest.progress.percentage}
                                        aria-label={`Uploading ${sendRequest.progress.percentage}%`}
                                    />
                                )}
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <input
                                            ref={fileInput}
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                                            onChange={(event) =>
                                                setAttachment(
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                            className="sr-only"
                                            aria-label="Attach a file"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                fileInput.current?.click()
                                            }
                                            className="rounded-md p-2 text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none"
                                            aria-label="Attach file"
                                        >
                                            <Paperclip className="size-4" />
                                        </button>
                                        {attachment && (
                                            <span className="max-w-44 truncate text-xs text-muted-foreground">
                                                {attachment.name}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={
                                            sendRequest.processing ||
                                            (!body.trim() && !attachment) ||
                                            (announcing && !title.trim())
                                        }
                                        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none disabled:opacity-50"
                                    >
                                        <Send className="size-4" />
                                        Send
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </section>
            )}
            <button
                type="button"
                onClick={() => {
                    setOpen((value) => !value);
                    setError(null);
                }}
                className="ml-auto grid size-14 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(0.55_0.13_162)_0%,oklch(0.5_0.12_180)_100%)] text-white shadow-lg transition hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-none"
                aria-label={open ? 'Close chat' : 'Open chat'}
            >
                {open ? (
                    <X className="size-6" />
                ) : (
                    <MessageCircle className="size-6" />
                )}
                {!open && unreadTotal > 0 && (
                    <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {unreadTotal}
                    </span>
                )}
            </button>
        </div>
    );
}
