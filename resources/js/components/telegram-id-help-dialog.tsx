import { ExternalLink, Info, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const telegramIdHelperUrl = 'https://t.me/userinfobot';

type TelegramIdHelpDialogProps = {
    botUrl?: string | null;
};

const steps = [
    {
        title: 'Telegram ID-ді алыңыз',
        description:
            'Telegram-да @userinfobot көмекші ботын ашып, Start түймесін басыңыз.',
    },
    {
        title: 'ID нөмірін көшіріңіз',
        description:
            'Бот жіберген жауаптағы Id жолында тұрған санды толық көшіріңіз.',
    },
    {
        title: 'ID-ді сайтта сақтаңыз',
        description:
            'Осы терезені жауып, көшірген санды Telegram ID өрісіне енгізіп сақтаңыз.',
    },
    {
        title: 'Негізгі ботты іске қосыңыз',
        description:
            'Хабарламалар келуі үшін төмендегі негізгі ботты ашып, міндетті түрде Start басыңыз.',
    },
];

export default function TelegramIdHelpDialog({
    botUrl,
}: TelegramIdHelpDialogProps) {
    const configuredBotUrl = botUrl?.trim();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 transition-colors hover:border-sky-300 hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-sky-500/30"
                    aria-label="Telegram ID алу нұсқаулығын ашу"
                    title="Telegram ID қалай алынады?"
                >
                    <Info className="size-5" />
                </button>
            </DialogTrigger>

            <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-lg">
                <div className="bg-gradient-to-br from-sky-600 to-blue-700 px-6 py-6 text-white">
                    <DialogHeader className="pr-7">
                        <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-white/15">
                            <Send className="size-5" />
                        </div>
                        <DialogTitle className="text-xl text-white">
                            Telegram хабарламаларын қосу
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-white/75">
                            Telegram ID-ді тіркеп, негізгі ботты іске қосу үшін
                            төрт қадамды орындаңыз.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="space-y-5 px-6 pt-1 pb-6">
                    <ol className="space-y-4">
                        {steps.map((step, index) => (
                            <li key={step.title} className="flex gap-3">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                                    {index + 1}
                                </span>
                                <div className="pt-0.5">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {step.title}
                                    </p>
                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        {step.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-xs leading-5 text-sky-800">
                        Telegram ID — логин немесе телефон нөмірі емес. Өріске
                        бот көрсеткен сандық ID-ді ғана енгізіңіз.
                    </div>

                    <DialogFooter className="grid gap-2 sm:grid-cols-2">
                        <Button variant="outline" asChild>
                            <a
                                href={telegramIdHelperUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                ID алу
                                <ExternalLink className="size-4" />
                            </a>
                        </Button>

                        {configuredBotUrl ? (
                            <Button
                                className="bg-sky-600 hover:bg-sky-700"
                                asChild
                            >
                                <a
                                    href={configuredBotUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Send className="size-4" />
                                    Негізгі ботты ашу
                                </a>
                            </Button>
                        ) : (
                            <Button disabled>Бот сілтемесі орнатылмаған</Button>
                        )}
                    </DialogFooter>

                    <DialogClose asChild>
                        <button
                            type="button"
                            className="mx-auto block text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
                        >
                            Терезені жабу
                        </button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
