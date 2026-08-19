import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Mail } from 'lucide-react';

import AuthPasswordField from '@/components/auth/auth-password-field';
import AuthPlatformShell from '@/components/auth/auth-platform-shell';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
};

export default function ResetPassword({ token, email }: Props) {
    return (
        <>
            <Head title="Жаңа құпиясөз орнату" />

            <AuthPlatformShell
                eyebrow="Аккаунт қауіпсіздігі"
                title="Жаңа құпиясөз орнатыңыз"
                description="Аккаунтыңызды қорғау үшін кемінде 8 таңбадан тұратын жаңа құпиясөз енгізіңіз."
                maxWidth="520"
            >
                <Form
                    {...update.form()}
                    transform={(data) => ({ ...data, token, email })}
                    resetOnSuccess={['password', 'password_confirmation']}
                    className="space-y-5"
                >
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
                                        autoComplete="email"
                                        value={email}
                                        readOnly
                                        className="h-12 rounded-lg border-white/[0.08] bg-white/[0.03] pl-11 text-slate-300 shadow-none focus-visible:border-cyan-300/50 focus-visible:ring-cyan-300/10"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <AuthPasswordField
                                    id="password"
                                    label="Жаңа құпиясөз"
                                    name="password"
                                    autoComplete="new-password"
                                    autoFocus
                                    error={errors.password}
                                    placeholder="Кемінде 8 таңба"
                                />

                                <AuthPasswordField
                                    id="password_confirmation"
                                    label="Құпиясөзді растау"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    error={errors.password_confirmation}
                                    placeholder="Қайта енгізіңіз"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="group h-12 w-full rounded-lg bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200"
                                disabled={processing}
                                data-test="reset-password-button"
                            >
                                {processing && <Spinner />}
                                Құпиясөзді жаңарту
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
