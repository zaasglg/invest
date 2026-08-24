import { Form, Head } from '@inertiajs/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

import AuthPasswordField from '@/components/auth/auth-password-field';
import AuthPlatformShell from '@/components/auth/auth-platform-shell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Құпиясөзді растау" />

            <AuthPlatformShell
                eyebrow="Қорғалған бөлім"
                title="Құпиясөзіңізді растаңыз"
                description="Қауіпсіздік мақсатында осы әрекетті жалғастырмас бұрын аккаунтыңыздың құпиясөзін қайта енгізіңіз."
            >
                <div className="mb-5 flex items-start gap-3 border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-3 text-sm leading-6 text-slate-300">
                    <ShieldCheck className="mt-1 size-4 shrink-0 text-cyan-300" />
                    Бұл тек аккаунт иесі орындай алатын қорғалған әрекет.
                </div>

                <Form
                    {...store.form()}
                    resetOnSuccess={['password']}
                    className="space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <AuthPasswordField
                                id="password"
                                label="Құпиясөз"
                                name="password"
                                autoComplete="current-password"
                                autoFocus
                                error={errors.password}
                                placeholder="Құпиясөзді енгізіңіз"
                            />

                            <Button
                                type="submit"
                                className="group h-12 w-full rounded-lg bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200"
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && <Spinner />}
                                Жалғастыру
                                {!processing && (
                                    <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                                )}
                            </Button>
                        </>
                    )}
                </Form>
            </AuthPlatformShell>
        </>
    );
}
