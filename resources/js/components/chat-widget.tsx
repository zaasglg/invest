import { usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    BotMessageSquare,
    Loader2,
    MapPinned,
    Send,
    X,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { send as sendChatMessage } from '@/routes/chat';
import type { SharedData } from '@/types';

const INVESTOR_MAP_URL =
    'https://alpha-turkistan-investor-2026-0722.chatgpt-edu-7368.chatgpt.site/';

function renderMarkdown(text: string) {
    return text.split('\n').map((line, lineIdx) => {
        const parts: React.ReactNode[] = [];
        const boldRegex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = boldRegex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                parts.push(line.slice(lastIndex, match.index));
            }
            parts.push(<strong key={match.index}>{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
            parts.push(line.slice(lastIndex));
        }

        return (
            <Fragment key={lineIdx}>
                {parts.length > 0 ? parts : line}
                {lineIdx < text.split('\n').length - 1 && <br />}
            </Fragment>
        );
    });
}

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
}

const ROLE_ASSISTANT_COPY: Record<
    string,
    { title: string; description: string; suggestions: string[] }
> = {
    superadmin: {
        title: 'AI Көмекші',
        description: 'Жүйедегі барлық бағыт бойынша талдау жасаймын',
        suggestions: [
            'Барлық инвестициялық жобалардың статистикасын көрсет',
            'Жүйедегі белсенді мәселелерді көрсет',
            'Қолдау шаралары мен өңір активтерін салыстыр',
        ],
    },
    invest: {
        title: 'Invest штабының AI көмекшісі',
        description:
            'Кураторлық жобалар мен инвестициялық мүмкіндіктерді талдаймын',
        suggestions: [
            'Менің бағытымдағы инвестициялық жобаларды көрсет',
            'Жобалардағы белсенді мәселелерді көрсет',
            'Жобаларға сәйкес қолдау шаралары мен алаңдарды ұсын',
        ],
    },
    akim: {
        title: 'Әкімнің AI көмекшісі',
        description: 'Өңір жобалары мен инвестициялық көрсеткіштерді талдаймын',
        suggestions: [
            'Менің өңірімдегі инвестициялық жобаларды көрсет',
            'Өңірдегі белсенді мәселелерді көрсет',
            'Өңір активтері мен қолдау шараларын ұсын',
        ],
    },
    oblast_akim: {
        title: 'Облыс әкімінің AI аналитигі',
        description:
            'Жобалар, жұмыс сапасы, рейтинг және өңір әлеуеті бойынша есеп пен кеңес беремін',
        suggestions: [
            'Облыс бойынша қысқаша басқарушылық есеп жаса',
            'Аудандар мен басқармалардың жұмыс сапасын талда',
            'Нишалық аналитика мен өңір әлеуеті бойынша кеңес бер',
        ],
    },
    zamakim: {
        title: 'Әкім орынбасарының AI көмекшісі',
        description:
            'Жобалар мен өңірлік көрсеткіштер бойынша анықтама беремін',
        suggestions: [
            'Инвестициялық жобалардың статистикасын көрсет',
            'Белсенді мәселелерді көрсет',
            'Қолдау шаралары мен өңір активтерін ұсын',
        ],
    },
    ispolnitel: {
        title: 'Орындаушының AI көмекшісі',
        description: 'Тапсырмалар мен жобалар бойынша жұмысқа көмектесемін',
        suggestions: [
            'Менің тапсырмаларымды көрсет',
            'Жобалардағы белсенді мәселелерді көрсет',
            'Қолжетімді өңір активтерін көрсет',
        ],
    },
    moderator: {
        title: 'Модератордың AI көмекшісі',
        description: 'Turkistan Invest жобалары мен тапсырмаларын талдаймын',
        suggestions: [
            'Turkistan Invest жобаларын көрсет',
            'Тексерілетін тапсырмаларды көрсет',
            'Орындаушылар рейтингін көрсет',
        ],
    },
    prokuror: {
        title: 'Прокурордың AI көмекшісі',
        description: 'Жүйедегі жобалар мен мәселелер бойынша шолу беремін',
        suggestions: [
            'Барлық инвестициялық жобаларды көрсет',
            'Белсенді мәселелер мен тапсырмаларды көрсет',
            'Өңірлердің инвестициялық статистикасын көрсет',
        ],
    },
    investor: {
        title: 'Инвестордың AI кеңесшісі',
        description:
            'Жобаңызға сай қолдау шаралары мен өңір активтерін табуға көмектесемін',
        suggestions: [
            'Менің жобама сәйкес мемлекеттік қолдау шараларын ұсын',
            'Компанияма жақын өңір активтерін көрсет',
            'Жобама қолайлы алаң мен жеңілдіктерді бірге таңда',
        ],
    },
};

const DEFAULT_ASSISTANT_COPY = {
    title: 'AI Көмекші',
    description: 'Жобалар, аймақтар және жүйе мүмкіндіктері туралы сұраңыз',
    suggestions: ['Жүйе бойынша көмек көрсет'],
};

export function ChatWidget() {
    const { auth } = usePage<SharedData>().props;
    const roleName = auth.user?.role_model?.name ?? '';
    const assistantRoleKey =
        roleName === 'akim' && auth.user?.region?.type === 'oblast'
            ? 'oblast_akim'
            : roleName;
    const assistantCopy =
        ROLE_ASSISTANT_COPY[assistantRoleKey] ?? DEFAULT_ASSISTANT_COPY;
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        const viewport = scrollAreaRef.current?.querySelector(
            '[data-radix-scroll-area-viewport]',
        ) as HTMLDivElement | null;

        if (viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior });
        }

        bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    };

    useEffect(() => {
        scrollToBottom('smooth');
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => scrollToBottom('auto'));
        }
    }, [isOpen]);

    useEffect(() => {
        const closeForAssistant = () => setIsOpen(false);

        window.addEventListener('assistant-widget-opened', closeForAssistant);

        return () =>
            window.removeEventListener(
                'assistant-widget-opened',
                closeForAssistant,
            );
    }, []);

    const sendMessage = async (suggestedMessage?: string) => {
        const message = suggestedMessage ?? input;

        if (!message.trim() || isLoading) return;

        const userMessage = message.trim();
        setInput('');
        setIsLoading(true);

        // Қолданушы хабарламасын қосу
        const tempUserMsg: Message = {
            id: Date.now(),
            role: 'user',
            content: userMessage,
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        try {
            const response = await fetch(sendChatMessage.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // AI жауабын қосу
            const botMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.message,
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content:
                    'Кешіріңіз, қате орын алды. Кейінірек қайталап көріңіз.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Чатты ашу батырмасы */}
            {!isOpen && (
                <Button
                    onClick={() => {
                        window.dispatchEvent(
                            new CustomEvent('chat-widget-opened'),
                        );
                        setIsOpen(true);
                    }}
                    type="button"
                    size="icon"
                    aria-label="AI-көмекшіні ашу"
                    className="chat-widget-fab group fixed bottom-4 left-4 z-[1000] h-14 w-14 rounded-full border border-[#c8a44e]/50 bg-[#0f1b3d] p-0 text-white shadow-[0_14px_35px_rgba(15,27,61,0.32)] transition-all hover:-translate-y-0.5 hover:border-[#c8a44e] hover:bg-[#17284f] sm:bottom-6 sm:left-6 print:hidden"
                >
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#c8a44e]/15 text-[#e3c97a]">
                        <BotMessageSquare className="h-5 w-5" />
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0f1b3d] bg-emerald-400" />
                    </span>
                </Button>
            )}

            {/* Чат терезесі */}
            {isOpen && (
                <Card className="chat-widget-panel fixed bottom-3 left-3 z-[1000] flex h-[min(600px,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] flex-col overflow-hidden shadow-2xl sm:bottom-6 sm:left-6 sm:w-[400px] print:hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <BotMessageSquare className="h-5 w-5" />
                            <CardTitle className="text-lg">
                                {assistantCopy.title}
                            </CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <div className="border-b bg-white p-3">
                        <a
                            href={INVESTOR_MAP_URL}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Инвесторға арналған AI орын таңдау картасын ашу"
                            className="group flex items-center gap-3 rounded-xl border border-[#c8a44e]/35 bg-[#f8f6ef] p-3 text-[#0f1b3d] transition-all hover:border-[#c8a44e]/70 hover:bg-[#f2ecd9]"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c8a44e] text-[#0f1b3d] shadow-sm">
                                <MapPinned className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1 text-left">
                                <span className="block text-sm font-semibold">
                                    AI арқылы орын таңдау
                                </span>
                                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                                    Жер, электр желісі, су және ең қолайлы
                                    аймақтар
                                </span>
                            </span>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9a7624] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                    </div>

                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea
                            ref={scrollAreaRef}
                            className="h-full px-4 py-4"
                        >
                            {messages.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                                    <BotMessageSquare className="h-12 w-12 opacity-20" />
                                    <div>
                                        <p className="font-medium">
                                            Сәлем! Мен сіздің AI көмекшіңізбін
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {assistantCopy.description}
                                        </p>
                                    </div>
                                    {assistantCopy.suggestions.length > 0 && (
                                        <div className="flex w-full flex-col gap-2 pt-2">
                                            {assistantCopy.suggestions.map(
                                                (suggestion) => (
                                                    <button
                                                        key={suggestion}
                                                        type="button"
                                                        onClick={() =>
                                                            void sendMessage(
                                                                suggestion,
                                                            )
                                                        }
                                                        className="rounded-lg border bg-background px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-[#c8a44e] hover:bg-[#f8f6ef]"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                'flex',
                                                message.role === 'user'
                                                    ? 'justify-end'
                                                    : 'justify-start',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'max-w-[80%] rounded-lg px-4 py-2',
                                                    message.role === 'user'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted',
                                                )}
                                            >
                                                <p className="text-sm leading-relaxed">
                                                    {message.role ===
                                                    'assistant'
                                                        ? renderMarkdown(
                                                              message.content,
                                                          )
                                                        : message.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {/* AI ойланып жатыр индикаторы */}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
                                                <div className="flex gap-1">
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                                                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    AI ойланып жатыр...
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="border-t p-4">
                        <div className="flex w-full gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Сұрақ қойыңыз..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button
                                onClick={() => void sendMessage()}
                                disabled={isLoading || !input.trim()}
                                size="icon"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}
        </>
    );
}
