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
import { router } from '@inertiajs/react';
import { BotMessageSquare, Loader2, Send, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            loadHistory();
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadHistory = async () => {
        try {
            const response = await fetch('/chat/history');
            const data = await response.json();
            setMessages(data.messages || []);
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);

        // Добавляем сообщение пользователя сразу
        const tempUserMsg: Message = {
            id: Date.now(),
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString(),
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

            const data = await response.json();

            // Добавляем ответ бота
            const botMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.message,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content:
                    'Извините, произошла ошибка при отправке сообщения. Попробуйте позже.',
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm('Вы уверены, что хотите очистить историю чата?')) return;

        try {
            await fetch('/chat/clear', {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
            });
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
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
            {/* Кнопка открытия чата */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    size="icon"
                    className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg"
                >
                    <BotMessageSquare className="h-6 w-6" />
                </Button>
            )}

            {/* Окно чата */}
            {isOpen && (
                <Card className="fixed right-6 bottom-6 z-50 flex h-[600px] w-[400px] flex-col shadow-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <BotMessageSquare className="h-5 w-5" />
                            <CardTitle className="text-lg">
                                AI Помощник
                            </CardTitle>
                        </div>
                        <div className="flex gap-1">
                            {messages.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={clearHistory}
                                    className="h-8 w-8"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea
                            className="h-full px-4 py-4"
                            ref={scrollRef}
                        >
                            {messages.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                                    <BotMessageSquare className="h-12 w-12 opacity-20" />
                                    <div>
                                        <p className="font-medium">
                                            Привет! Я ваш AI помощник
                                        </p>
                                        <p className="mt-1 text-sm">
                                            Задайте вопрос о проектах, регионах,
                                            проблемах
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
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="border-t p-4">
                        <div className="flex w-full gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Задайте вопрос..."
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
