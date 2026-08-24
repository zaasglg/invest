import { Form, Head } from '@inertiajs/react';
import { LogOut, MailCheck, RefreshCw } from 'lucide-react';

import AuthPlatformShell from '@/components/auth/auth-platform-shell';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email мекенжайын растау" />

            <AuthPlatformShell
                eyebrow="Аккаунтты белсендіру"
                title="Email мекенжайыңызды растаңыз"
                description="Тіркелу кезінде көрсеткен email мекенжайыңызға растау сілтемесін жібердік. Порталға өту үшін хаттағы батырманы басыңыз."
            >
                <div className="mb-5 flex items-start gap-3 border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-3 text-sm leading-6 text-slate-300">
                    <MailCheck className="mt-1 size-4 shrink-0 text-cyan-300" />
                    Хат «Кіріс» бөлімінде болмаса, «Спам» қалтасын да
                    тексеріңіз.
                </div>

                {status === 'verification-link-sent' && (
                    <div className="mb-5 border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-6 font-medium text-emerald-300">
                        Жаңа растау сілтемесі email мекенжайыңызға жіберілді.
                    </div>
                )}

                <Form action={send()} method="post">
                    {({ processing }) => (
                        <Button
                            type="submit"
                            className="h-12 w-full rounded-lg bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200"
                            disabled={processing}
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <RefreshCw className="size-4" />
                            )}
                            Растау хатын қайта жіберу
                        </Button>
                    )}
                </Form>

                <div className="mt-6 text-center text-sm text-slate-400">
                    <TextLink
                        href={logout()}
                        method="post"
                        as="button"
                        className="inline-flex items-center gap-2 font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                        <LogOut className="size-4" />
                        Басқа аккаунтпен кіру
                    </TextLink>
                </div>
            </AuthPlatformShell>
        </>
    );
}
