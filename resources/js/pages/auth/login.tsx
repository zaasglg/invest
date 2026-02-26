import { Form, Head } from '@inertiajs/react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({
    status,
    canResetPassword,
}: Props) {
    return (
        <AuthLayout
            title="Войдите в свой аккаунт"
            description="Введите email и пароль для входа"
        >
            <Head title="Вход" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-white/80">
                                    Email адрес
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#c8a44e]/50 focus-visible:ring-[#c8a44e]/20"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password" className="text-white/80">
                                        Пароль
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm text-[#c8a44e]/80 hover:text-[#c8a44e]"
                                            tabIndex={5}
                                        >
                                            Забыли пароль?
                                        </TextLink>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Пароль"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#c8a44e]/50 focus-visible:ring-[#c8a44e]/20"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="border-white/20 data-[state=checked]:bg-[#c8a44e] data-[state=checked]:border-[#c8a44e]"
                                />
                                <Label htmlFor="remember" className="text-white/60">
                                    Запомнить меня
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full bg-[#c8a44e] text-[#0f1b3d] font-bold hover:bg-[#e3c97a] shadow-lg shadow-[#c8a44e]/20"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Войти
                            </Button>
                        </div>

                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-emerald-400">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
