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

export function ChatWidget() {
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

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
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
            const response = await fetch('/chat/send', {
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
                    onClick={() => setIsOpen(true)}
                    type="button"
                    aria-label="AI-көмекшіні ашу"
                    className="group fixed right-4 bottom-4 z-[1000] h-14 rounded-full border border-[#c8a44e]/50 bg-[#0f1b3d] px-4 text-white shadow-[0_14px_35px_rgba(15,27,61,0.32)] transition-all hover:-translate-y-0.5 hover:border-[#c8a44e] hover:bg-[#17284f] sm:right-6 sm:bottom-6"
                >
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#c8a44e]/15 text-[#e3c97a]">
                        <BotMessageSquare className="h-5 w-5" />
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0f1b3d] bg-emerald-400" />
                    </span>
                    <span className="ml-2.5 hidden text-left sm:block">
                        <span className="block text-sm leading-none font-semibold">
                            AI-көмекші
                        </span>
                        <span className="mt-1 block text-[10px] font-normal text-white/60">
                            Орын таңдау
                        </span>
                    </span>
                </Button>
            )}

            {/* Чат терезесі */}
            {isOpen && (
                <Card className="fixed right-3 bottom-3 z-[1000] flex h-[min(600px,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] flex-col overflow-hidden shadow-2xl sm:right-6 sm:bottom-6 sm:w-[400px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <BotMessageSquare className="h-5 w-5" />
                            <CardTitle className="text-lg">
                                AI Көмекші
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
                                            Сәлем! Мен сіздің AI көмекшіңізмін
                                        </p>
                                        <p className="mt-1 text-sm">
                                            Жобалар, аймақтар, мәселелер туралы
                                            сұраңыз
                                        </p>
                                    </div>
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
                                onClick={sendMessage}
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
