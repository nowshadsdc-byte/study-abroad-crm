export type ChatPerson = {
    id: number;
    name: string;
    avatar: string | null;
};

export type ChatAttachment = {
    id: number;
    name: string;
    mime_type: string;
    size: number;
    download_url: string;
};

export type ChatReader = {
    id: number;
    name: string;
    read_at: string;
};

export type ChatMessage = {
    id: number;
    conversation_id: number;
    sender: ChatPerson;
    title: string | null;
    body: string | null;
    created_at: string;
    read_count: number;
    readers: ChatReader[];
    attachments: ChatAttachment[];
};

export type ChatConversation = {
    id: number;
    type: 'direct' | 'announcement';
    title: string;
    other_user: ChatPerson | null;
    latest_message: ChatMessage | null;
    unread_count: number;
};
