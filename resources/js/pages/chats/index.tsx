import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCheck,
    ChevronRight,
    Download,
    FileText,
    Info,
    MessageCircle,
    Paperclip,
    Search,
    Send,
    Users,
    X,
} from 'lucide-react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent,
} from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

import type { SharedData } from '@/types';

interface ChatSummary {
    id: number;
    name: string;
    region_name: string | null;
    unread_count: number;
    last_message: {
        id: number;
        message: string;
        created_at: string;
        is_own: boolean;
        user_name: string | null;
        has_attachments: boolean;
        attachment_name: string | null;
    } | null;
}

interface ChatParticipant {
    id: number;
    full_name: string;
    avatar_url: string | null;
    position: string | null;
    project_roles: string[];
}

interface ChatMessage {
    id: number;
    message: string;
    created_at: string;
    is_own: boolean;
    user: {
        id: number;
        full_name: string;
        avatar_url: string | null;
    };
    attachments: ChatAttachment[];
}

interface ChatAttachment {
    id: number;
    original_name: string;
    mime_type: string | null;
    size: number;
    is_image: boolean;
    download_url: string;
    preview_url: string | null;
}

interface SelectedChat {
    id: number;
    name: string;
    company_name: string | null;
    region_name: string | null;
    participant_count: number;
    participants: ChatParticipant[];
    messages: ChatMessage[];
}

interface Props {
    chats: ChatSummary[];
    selectedChat: SelectedChat | null;
}

const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase();

const formatTime = (dateValue: string): string =>
    new Intl.DateTimeFormat('kk-KZ', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateValue));

const formatMessageDate = (dateValue: string): string => {
    const date = new Date(dateValue);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Бүгін';
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return 'Кеше';
    }

    return new Intl.DateTimeFormat('kk-KZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
};

const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

    return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export default function ChatsIndex({ chats, selectedChat }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [search, setSearch] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, reset, errors, clearErrors } =
        useForm<{
            message: string;
            files: File[];
        }>({
            message: '',
            files: [],
        });

    const filteredChats = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase('kk-KZ');

        if (!normalizedSearch) return chats;

        return chats.filter((chat) =>
            `${chat.name} ${chat.region_name ?? ''}`
                .toLocaleLowerCase('kk-KZ')
                .includes(normalizedSearch),
        );
    }, [chats, search]);

    useEffect(() => {
        setShowInfo(false);
    }, [selectedChat?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ block: 'end' });
    }, [selectedChat?.id, selectedChat?.messages.length]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            router.reload({
                only: ['chats', 'selectedChat', 'unreadChatMessagesCount'],
            });
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, []);

    const submitMessage = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (
            !selectedChat ||
            (!data.message.trim() && data.files.length === 0) ||
            processing
        ) {
            return;
        }

        post(`/chats/${selectedChat.id}/messages`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset('message', 'files');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const selectFiles = (files: FileList | null) => {
        if (!files) return;

        clearErrors();
        setData('files', [...data.files, ...Array.from(files)].slice(0, 8));
    };

    const removeFile = (index: number) => {
        setData(
            'files',
            data.files.filter((_, fileIndex) => fileIndex !== index),
        );
    };

    const fileError = Object.entries(errors).find(([key]) =>
        key.startsWith('files'),
    )?.[1];

    const handleMessageKeyDown = (
        event: KeyboardEvent<HTMLTextAreaElement>,
    ) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            formRef.current?.requestSubmit();
        }
    };

    return (
        <AppLayout>
            <Head title="Жоба чаттары" />

            <div className="mx-auto flex h-[calc(100vh-4rem)] min-h-[620px] w-full max-w-[1500px] flex-1 p-0 lg:p-5">
                <div className="relative flex min-h-0 w-full overflow-hidden border-gray-200 bg-white shadow-sm lg:rounded-2xl lg:border">
                    <aside
                        className={cn(
                            'min-h-0 w-full flex-col border-r border-gray-200 bg-white md:flex md:w-[360px] md:shrink-0',
                            selectedChat ? 'hidden' : 'flex',
                        )}
                    >
                        <div className="border-b border-gray-100 px-5 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-xl font-bold text-[#0f1b3d]">
                                        Чаттар
                                    </h1>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        Жоба топтары
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f1b3d]/5">
                                    <MessageCircle className="h-5 w-5 text-[#0f1b3d]" />
                                </div>
                            </div>

                            <div className="relative mt-4">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Чатты іздеу"
                                    className="h-10 border-0 bg-gray-100 pr-3 pl-9 shadow-none focus-visible:ring-1"
                                />
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {filteredChats.length > 0 ? (
                                filteredChats.map((chat) => (
                                    <Link
                                        key={chat.id}
                                        href={`/chats/${chat.id}`}
                                        className={cn(
                                            'flex gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50',
                                            selectedChat?.id === chat.id &&
                                                'bg-[#f1f5fb]',
                                        )}
                                    >
                                        <Avatar className="h-12 w-12 shrink-0">
                                            <AvatarFallback className="bg-[#0f1b3d] text-sm font-semibold text-white">
                                                {getInitials(chat.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="truncate text-sm font-semibold text-[#0f1b3d]">
                                                    {chat.name}
                                                </p>
                                                {chat.last_message && (
                                                    <span
                                                        className={cn(
                                                            'shrink-0 text-[11px] text-gray-400',
                                                            chat.unread_count >
                                                                0 &&
                                                                'font-medium text-[#c8a44e]',
                                                        )}
                                                    >
                                                        {formatTime(
                                                            chat.last_message
                                                                .created_at,
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <p
                                                    className={cn(
                                                        'min-w-0 flex-1 truncate text-xs text-gray-500',
                                                        chat.unread_count > 0 &&
                                                            'font-medium text-gray-700',
                                                    )}
                                                >
                                                    {chat.last_message
                                                        ?.is_own && (
                                                        <CheckCheck className="mr-1 inline h-3.5 w-3.5 text-blue-500" />
                                                    )}
                                                    {!chat.last_message
                                                        ?.is_own &&
                                                        chat.last_message
                                                            ?.user_name && (
                                                            <>
                                                                {
                                                                    chat
                                                                        .last_message
                                                                        .user_name
                                                                }
                                                                :{' '}
                                                            </>
                                                        )}
                                                    {chat.last_message
                                                        ?.message ||
                                                        (chat.last_message
                                                            ?.has_attachments
                                                            ? `📎 ${chat.last_message.attachment_name ?? 'Тіркеме'}`
                                                            : chat.region_name)}
                                                </p>
                                                {chat.unread_count > 0 && (
                                                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#c8a44e] px-1.5 text-[10px] font-bold text-white">
                                                        {chat.unread_count > 99
                                                            ? '99+'
                                                            : chat.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 text-center">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                        <MessageCircle className="h-7 w-7 text-gray-400" />
                                    </div>
                                    <p className="font-medium text-[#0f1b3d]">
                                        {search
                                            ? 'Чат табылмады'
                                            : 'Белсенді чаттар жоқ'}
                                    </p>
                                    {!search && (
                                        <p className="mt-2 max-w-56 text-sm leading-5 text-gray-400">
                                            Жоба бетіндегі «Чатқа өту» арқылы
                                            бірінші хабарламаны жіберіңіз.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>

                    <section
                        className={cn(
                            'min-h-0 min-w-0 flex-1 flex-col bg-[#f4f6fa] md:flex',
                            selectedChat ? 'flex' : 'hidden',
                        )}
                    >
                        {selectedChat ? (
                            <>
                                <header className="flex h-[73px] shrink-0 items-center border-b border-gray-200 bg-white px-3 md:px-5">
                                    <Link
                                        href="/chats"
                                        className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 md:hidden"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowInfo((current) => !current)
                                        }
                                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-[#c8a44e] focus-visible:outline-none"
                                    >
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarFallback className="bg-[#0f1b3d] text-xs font-semibold text-white">
                                                {getInitials(selectedChat.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-[#0f1b3d] md:text-base">
                                                {selectedChat.name}
                                            </p>
                                            <p className="truncate text-xs text-gray-400">
                                                {selectedChat.participant_count}{' '}
                                                қатысушы
                                            </p>
                                        </div>
                                    </button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            setShowInfo((current) => !current)
                                        }
                                        className="ml-2 shrink-0 text-gray-500"
                                        aria-label="Чат ақпараты"
                                    >
                                        <Info className="h-5 w-5" />
                                    </Button>
                                </header>

                                <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6fa] bg-[radial-gradient(circle_at_center,rgba(15,27,61,0.055)_1px,transparent_1px)] bg-[length:24px_24px] px-3 py-5 md:px-8">
                                    {selectedChat.messages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center">
                                            <div className="max-w-sm rounded-xl border border-[#c8a44e]/20 bg-white px-5 py-3 text-center text-xs leading-5 text-gray-600 shadow-sm">
                                                Бұл жоба чатында әзірге
                                                хабарлама жоқ. Бірінші
                                                хабарламаны жіберсеңіз, чат
                                                барлық қатысушының тізімінде
                                                пайда болады.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mx-auto flex max-w-4xl flex-col gap-1.5">
                                            {selectedChat.messages.map(
                                                (message, index) => {
                                                    const messageDate =
                                                        formatMessageDate(
                                                            message.created_at,
                                                        );
                                                    const showDate =
                                                        index === 0 ||
                                                        messageDate !==
                                                            formatMessageDate(
                                                                selectedChat
                                                                    .messages[
                                                                    index - 1
                                                                ].created_at,
                                                            );

                                                    return (
                                                        <div
                                                            key={message.id}
                                                            className="contents"
                                                        >
                                                            {showDate && (
                                                                <div className="my-3 flex justify-center">
                                                                    <span className="rounded-lg border border-[#0f1b3d]/5 bg-white px-3 py-1 text-[11px] font-medium text-[#0f1b3d]/60 shadow-sm">
                                                                        {
                                                                            messageDate
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div
                                                                className={cn(
                                                                    'flex',
                                                                    message.is_own
                                                                        ? 'justify-end'
                                                                        : 'justify-start',
                                                                )}
                                                            >
                                                                <div
                                                                    className={cn(
                                                                        'max-w-[85%] rounded-lg px-3 pt-2 pb-1 text-sm shadow-sm md:max-w-[68%]',
                                                                        message.is_own
                                                                            ? 'rounded-tr-sm bg-[#0f1b3d] text-white'
                                                                            : 'rounded-tl-sm border border-[#0f1b3d]/5 bg-white',
                                                                    )}
                                                                >
                                                                    {!message.is_own && (
                                                                        <p className="mb-1 text-xs font-semibold text-[#9a7d35]">
                                                                            {
                                                                                message
                                                                                    .user
                                                                                    .full_name
                                                                            }
                                                                        </p>
                                                                    )}
                                                                    {message
                                                                        .attachments
                                                                        .length >
                                                                        0 && (
                                                                        <div className="mb-2 grid gap-2">
                                                                            {message.attachments.map(
                                                                                (
                                                                                    attachment,
                                                                                ) =>
                                                                                    attachment.is_image &&
                                                                                    attachment.preview_url ? (
                                                                                        <div
                                                                                            key={
                                                                                                attachment.id
                                                                                            }
                                                                                            className="group relative overflow-hidden rounded-lg"
                                                                                        >
                                                                                            <a
                                                                                                href={
                                                                                                    attachment.preview_url
                                                                                                }
                                                                                                target="_blank"
                                                                                                rel="noreferrer"
                                                                                                className="block"
                                                                                            >
                                                                                                <img
                                                                                                    src={
                                                                                                        attachment.preview_url
                                                                                                    }
                                                                                                    alt={
                                                                                                        attachment.original_name
                                                                                                    }
                                                                                                    className="max-h-72 w-full min-w-48 rounded-lg object-cover"
                                                                                                />
                                                                                            </a>
                                                                                            <a
                                                                                                href={
                                                                                                    attachment.download_url
                                                                                                }
                                                                                                className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#0f1b3d]/85 text-white opacity-100 shadow-md transition-opacity md:opacity-0 md:group-hover:opacity-100"
                                                                                                title="Суретті жүктеу"
                                                                                            >
                                                                                                <Download className="h-4 w-4" />
                                                                                            </a>
                                                                                            <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-5 pb-1.5 text-[10px] text-white">
                                                                                                <p className="truncate">
                                                                                                    {
                                                                                                        attachment.original_name
                                                                                                    }
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <a
                                                                                            key={
                                                                                                attachment.id
                                                                                            }
                                                                                            href={
                                                                                                attachment.download_url
                                                                                            }
                                                                                            className={cn(
                                                                                                'flex min-w-56 items-center gap-3 rounded-lg border p-3 transition-colors',
                                                                                                message.is_own
                                                                                                    ? 'border-white/15 bg-white/10 hover:bg-white/15'
                                                                                                    : 'border-[#0f1b3d]/10 bg-[#f8fafc] hover:bg-[#f1f5f9]',
                                                                                            )}
                                                                                        >
                                                                                            <div
                                                                                                className={cn(
                                                                                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                                                                                    message.is_own
                                                                                                        ? 'bg-white/10 text-[#e3c97a]'
                                                                                                        : 'bg-[#0f1b3d]/8 text-[#0f1b3d]',
                                                                                                )}
                                                                                            >
                                                                                                <FileText className="h-5 w-5" />
                                                                                            </div>
                                                                                            <div className="min-w-0 flex-1">
                                                                                                <p className="truncate text-xs font-medium">
                                                                                                    {
                                                                                                        attachment.original_name
                                                                                                    }
                                                                                                </p>
                                                                                                <p
                                                                                                    className={cn(
                                                                                                        'mt-0.5 text-[10px]',
                                                                                                        message.is_own
                                                                                                            ? 'text-white/50'
                                                                                                            : 'text-gray-400',
                                                                                                    )}
                                                                                                >
                                                                                                    {formatFileSize(
                                                                                                        attachment.size,
                                                                                                    )}
                                                                                                </p>
                                                                                            </div>
                                                                                            <Download
                                                                                                className={cn(
                                                                                                    'h-4 w-4 shrink-0',
                                                                                                    message.is_own
                                                                                                        ? 'text-[#e3c97a]'
                                                                                                        : 'text-[#9a7d35]',
                                                                                                )}
                                                                                            />
                                                                                        </a>
                                                                                    ),
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {message.message && (
                                                                        <p
                                                                            className={cn(
                                                                                'leading-5 whitespace-pre-wrap',
                                                                                message.is_own
                                                                                    ? 'text-white'
                                                                                    : 'text-gray-800',
                                                                            )}
                                                                        >
                                                                            {
                                                                                message.message
                                                                            }
                                                                        </p>
                                                                    )}
                                                                    <div
                                                                        className={cn(
                                                                            'mt-0.5 flex items-center justify-end gap-1 pl-8 text-[10px]',
                                                                            message.is_own
                                                                                ? 'text-white/45'
                                                                                : 'text-gray-400',
                                                                        )}
                                                                    >
                                                                        {formatTime(
                                                                            message.created_at,
                                                                        )}
                                                                        {message.is_own && (
                                                                            <CheckCheck className="h-3.5 w-3.5 text-[#e3c97a]" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>

                                <form
                                    ref={formRef}
                                    onSubmit={submitMessage}
                                    className="shrink-0 border-t border-[#0f1b3d]/10 bg-white px-3 py-3 md:px-5"
                                >
                                    {data.files.length > 0 && (
                                        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                                            {data.files.map((file, index) => (
                                                <div
                                                    key={`${file.name}-${file.lastModified}-${index}`}
                                                    className="flex max-w-56 shrink-0 items-center gap-2 rounded-lg border border-[#c8a44e]/30 bg-[#faf7f0] py-2 pr-1.5 pl-2.5"
                                                >
                                                    <FileText className="h-4 w-4 shrink-0 text-[#9a7d35]" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-medium text-[#0f1b3d]">
                                                            {file.name}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {formatFileSize(
                                                                file.size,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeFile(index)
                                                        }
                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                        aria-label={`${file.name} файлын алып тастау`}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                                            onChange={(event) => {
                                                selectFiles(event.target.files);
                                                event.target.value = '';
                                            }}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={
                                                processing ||
                                                data.files.length >= 8
                                            }
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="h-11 w-11 shrink-0 rounded-full text-[#0f1b3d]/65 hover:bg-[#0f1b3d]/5 hover:text-[#0f1b3d]"
                                            title="Сурет немесе құжат тіркеу"
                                        >
                                            <Paperclip className="h-5 w-5" />
                                        </Button>
                                        <textarea
                                            value={data.message}
                                            onChange={(event) =>
                                                setData(
                                                    'message',
                                                    event.target.value,
                                                )
                                            }
                                            onKeyDown={handleMessageKeyDown}
                                            placeholder="Хабарлама жазыңыз"
                                            rows={1}
                                            maxLength={5000}
                                            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#c8a44e]/50"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={
                                                processing ||
                                                (!data.message.trim() &&
                                                    data.files.length === 0)
                                            }
                                            className="h-11 w-11 shrink-0 rounded-full bg-[#c8a44e] text-white hover:bg-[#b8943e]"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {errors.message && (
                                        <p className="mt-1.5 px-2 text-xs text-red-600">
                                            {errors.message}
                                        </p>
                                    )}
                                    {fileError && (
                                        <p className="mt-1.5 px-2 text-xs text-red-600">
                                            {fileError}
                                        </p>
                                    )}
                                    <p className="mt-1 hidden px-2 text-[10px] text-gray-400 md:block">
                                        Enter — жіберу, Shift + Enter — жаңа жол
                                        · 8 файлға дейін, әрқайсысы 20 MB
                                    </p>
                                </form>
                            </>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
                                    <MessageCircle className="h-9 w-9 text-[#0f1b3d]/50" />
                                </div>
                                <h2 className="text-xl font-semibold text-[#0f1b3d]">
                                    Жоба чаттары
                                </h2>
                                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                                    Сөйлесуді бастау үшін сол жақтан жобаны
                                    таңдаңыз.
                                </p>
                            </div>
                        )}
                    </section>

                    {selectedChat && showInfo && (
                        <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm shrink-0 flex-col border-l border-gray-200 bg-white shadow-xl lg:relative lg:z-0 lg:shadow-none">
                            <div className="flex h-[73px] shrink-0 items-center gap-3 border-b border-gray-100 px-5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowInfo(false)}
                                    className="text-gray-500"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                                <h2 className="font-semibold text-[#0f1b3d]">
                                    Чат ақпараты
                                </h2>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto">
                                <div className="border-b border-gray-100 px-6 py-7 text-center">
                                    <Avatar className="mx-auto h-20 w-20">
                                        <AvatarFallback className="bg-[#0f1b3d] text-xl font-semibold text-white">
                                            {getInitials(selectedChat.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="mt-4 text-lg font-semibold text-[#0f1b3d]">
                                        {selectedChat.name}
                                    </h3>
                                    {selectedChat.company_name && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            {selectedChat.company_name}
                                        </p>
                                    )}
                                    {selectedChat.region_name && (
                                        <p className="mt-1 text-xs text-gray-400">
                                            {selectedChat.region_name}
                                        </p>
                                    )}
                                    <Link
                                        href={`/investment-projects/${selectedChat.id}`}
                                        className="mt-4 inline-flex items-center text-xs font-medium text-[#9a7d35] hover:text-[#c8a44e]"
                                    >
                                        Жоба карточкасын ашу
                                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                    </Link>
                                </div>

                                <div className="px-5 py-5">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-gray-400" />
                                        <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                            {selectedChat.participant_count}{' '}
                                            қатысушы
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedChat.participants.map(
                                            (participant) => (
                                                <div
                                                    key={participant.id}
                                                    className="flex items-center gap-3"
                                                >
                                                    <Avatar className="h-10 w-10 shrink-0">
                                                        <AvatarImage
                                                            src={
                                                                participant.avatar_url ??
                                                                undefined
                                                            }
                                                            alt={
                                                                participant.full_name
                                                            }
                                                        />
                                                        <AvatarFallback className="bg-[#0f1b3d]/10 text-xs font-semibold text-[#0f1b3d]">
                                                            {getInitials(
                                                                participant.full_name,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={cn(
                                                                'truncate text-sm font-medium text-[#0f1b3d]',
                                                                participant.id ===
                                                                    auth.user
                                                                        .id &&
                                                                    'text-[#9a7d35]',
                                                            )}
                                                        >
                                                            {
                                                                participant.full_name
                                                            }
                                                            {participant.id ===
                                                                auth.user.id &&
                                                                ' (Сіз)'}
                                                        </p>
                                                        <p className="truncate text-xs text-gray-400">
                                                            {participant.position
                                                                ? `${participant.position} · `
                                                                : ''}
                                                            {participant.project_roles.join(
                                                                ', ',
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
