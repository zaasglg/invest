import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
} from 'lucide-react';
import { useState } from 'react';

import TurkistanDistrictMap from '@/components/auth/turkistan-district-map';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

const inputClassName =
    'h-12 rounded-lg border-white/[0.08] bg-white/[0.03] text-white shadow-none placeholder:text-slate-600 hover:border-white/[0.16] focus-visible:border-cyan-300/50 focus-visible:ring-cyan-300/10';

function CornerTick({ className }: { className: string }) {
    return (
        <span
            aria-hidden="true"
            className={`pointer-events-none absolute size-3.5 border-cyan-300/40 ${className}`}
        />
    );
}

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Жүйеге кіру" />

            <div className="relative min-h-svh overflow-hidden bg-[#04090F] font-sans text-white">
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden="true"
                    style={{
                        background:
                            'radial-gradient(50% 45% at 50% 32%, rgba(34, 211, 238, 0.05), transparent 70%)',
                    }}
                />

                <div
                    className="pointer-events-none absolute inset-y-[-10%] left-[58%] w-[min(56rem,90vw)] -translate-x-1/2"
                    aria-hidden="true"
                >
                    <TurkistanDistrictMap className="h-full w-full" />
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#04090F] to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#04090F] to-transparent" />
                </div>

                <main className="relative z-10 flex min-h-svh items-center justify-center px-5 py-16 sm:px-8">
                    <div className="w-full max-w-[440px]">
                        <div className="relative border border-white/[0.09] bg-[#0A121D] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-9">
                            <CornerTick className="-top-px -left-px border-t border-l" />
                            <CornerTick className="-top-px -right-px border-t border-r" />
                            <CornerTick className="-bottom-px -left-px border-b border-l" />
                            <CornerTick className="-right-px -bottom-px border-r border-b" />

                            <div className="mb-8">
                                <h1 className="text-2xl font-bold tracking-[-0.02em] text-white">
                                    Қош келдіңіз
                                </h1>
                                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
                                    Жұмыс кеңістігіне өту үшін корпоративтік
                                    аккаунтыңызбен кіріңіз.
                                </p>
                            </div>

                            {status && (
                                <div className="mb-5 border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm font-medium text-emerald-300">
                                    {status}
                                </div>
                            )}

                            <Form
                                {...store.form()}
                                resetOnSuccess={['password']}
                                className="flex flex-col gap-5"
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
                                                    required
                                                    autoFocus
                                                    tabIndex={1}
                                                    autoComplete="email"
                                                    aria-invalid={Boolean(
                                                        errors.email,
                                                    )}
                                                    placeholder="name@company.kz"
                                                    className={`${inputClassName} pl-11`}
                                                />
                                            </div>
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between gap-4">
                                                <Label
                                                    htmlFor="password"
                                                    className="text-sm font-medium text-slate-200"
                                                >
                                                    Құпиясөз
                                                </Label>
                                                {canResetPassword && (
                                                    <TextLink
                                                        href={request()}
                                                        className="text-xs font-medium text-cyan-300/80 no-underline transition hover:text-cyan-200 hover:no-underline"
                                                        tabIndex={4}
                                                    >
                                                        Құпиясөзді ұмыттыңыз ба?
                                                    </TextLink>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <LockKeyhole
                                                    className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500"
                                                    strokeWidth={1.8}
                                                />
                                                <Input
                                                    id="password"
                                                    type={
                                                        showPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    name="password"
                                                    required
                                                    tabIndex={2}
                                                    autoComplete="current-password"
                                                    aria-invalid={Boolean(
                                                        errors.password,
                                                    )}
                                                    placeholder="Құпиясөзді енгізіңіз"
                                                    className={`${inputClassName} pr-12 pl-11`}
                                                />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() =>
                                                        setShowPassword(
                                                            (visible) =>
                                                                !visible,
                                                        )
                                                    }
                                                    aria-label={
                                                        showPassword
                                                            ? 'Құпиясөзді жасыру'
                                                            : 'Құпиясөзді көрсету'
                                                    }
                                                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-300"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="size-4" />
                                                    ) : (
                                                        <Eye className="size-4" />
                                                    )}
                                                </button>
                                            </div>
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 py-1">
                                            <Checkbox
                                                id="remember"
                                                name="remember"
                                                tabIndex={3}
                                                className="border-white/20 bg-white/[0.04] data-[state=checked]:border-cyan-300 data-[state=checked]:bg-cyan-300 data-[state=checked]:text-slate-950"
                                            />
                                            <Label
                                                htmlFor="remember"
                                                className="cursor-pointer text-sm font-normal text-slate-400"
                                            >
                                                Мені есте сақтау
                                            </Label>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="group mt-1 h-12 w-full rounded-lg bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200"
                                            tabIndex={5}
                                            disabled={processing}
                                            data-test="login-button"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <LockKeyhole className="size-4" />
                                            )}
                                            Платформаға кіру
                                            {!processing && (
                                                <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                                            )}
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </div>

                        {canRegister && (
                            <p className="mt-5 text-center text-sm text-slate-400">
                                Аккаунтыңыз жоқ па?{' '}
                                <TextLink
                                    href={register()}
                                    className="font-semibold text-cyan-300 hover:text-cyan-200"
                                >
                                    Өтінім беруші ретінде тіркелу
                                </TextLink>
                            </p>
                        )}

                        <Link
                            href="/"
                            className="mx-auto mt-7 flex w-fit items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-200"
                        >
                            <ArrowLeft className="size-4" />
                            Басты бетке оралу
                        </Link>
                    </div>
                </main>

                <p className="pointer-events-none absolute inset-x-0 bottom-6 z-10 text-center text-xs text-slate-600">
                    IN-MAP · Инвестициялық платформа
                </p>
            </div>
        </>
    );
}
