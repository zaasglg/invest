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
import { BotMessageSquare, Loader2, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

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
                content: 'Кешіріңіз, қате орын алды. Кейінірек қайталап көріңіз.',
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
                    size="icon"
                    className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg"
                >
                    <BotMessageSquare className="h-6 w-6" />
                </Button>
            )}

            {/* Чат терезесі */}
            {isOpen && (
                <Card className="fixed right-6 bottom-6 z-50 flex h-[600px] w-[400px] flex-col shadow-2xl">
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

                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea
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
                                            Жобалар, аймақтар, мәселелер туралы сұраңыз
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
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="flex max-w-[80%] items-center gap-3 rounded-lg bg-muted px-4 py-2 text-muted-foreground">
                                                <div className="flex items-center gap-1 mt-1">
                                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></div>
                                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></div>
                                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"></div>
                                                </div>
                                                <p className="text-sm">Ойланып жатыр...</p>
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
                                onKeyPress={handleKeyPress}
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
