import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Mail } from 'lucide-react';

import AuthPlatformShell from '@/components/auth/auth-platform-shell';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Құпиясөзді қалпына келтіру" />

            <AuthPlatformShell
                eyebrow="Аккаунт қауіпсіздігі"
                title="Құпиясөзді ұмыттыңыз ба?"
                description="Email мекенжайыңызды енгізіңіз. Жаңа құпиясөз орнатуға арналған қауіпсіз сілтемені жібереміз."
            >
                {status && (
                    <div className="mb-5 border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-6 font-medium text-emerald-300">
                        {status}
                    </div>
                )}

                <Form {...email.form()} className="space-y-5">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-sm font-medium text-slate-200"
                                >
                                    Email мекенжайы
                                </Label>
                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500"
                                        strokeWidth={1.8}
                                    />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="email"
                                        autoFocus
                                        aria-invalid={Boolean(errors.email)}
                                        placeholder="name@company.kz"
                                        className="h-12 rounded-lg border-white/[0.08] bg-white/[0.03] pl-11 text-white shadow-none placeholder:text-slate-600 hover:border-white/[0.16] focus-visible:border-cyan-300/50 focus-visible:ring-cyan-300/10"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                type="submit"
                                className="group h-12 w-full rounded-lg bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200"
                                disabled={processing}
                                data-test="email-password-reset-link-button"
                            >
                                {processing && <Spinner />}
                                Қалпына келтіру сілтемесін жіберу
                                {!processing && (
                                    <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                                )}
                            </Button>
                        </>
                    )}
                </Form>

                <p className="mt-6 text-center text-sm text-slate-400">
                    Құпиясөзіңіз есіңізде ме?{' '}
                    <TextLink
                        href={login()}
                        className="font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                        Жүйеге кіру
                    </TextLink>
                </p>
            </AuthPlatformShell>
        </>
    );
}
