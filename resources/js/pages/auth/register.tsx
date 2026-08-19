import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Phone,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';

import TurkistanDistrictMap from '@/components/auth/turkistan-district-map';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

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

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    return (
        <>
            <Head title="Тіркелу" />

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

                <main className="relative z-10 flex min-h-svh items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
                    <div className="w-full max-w-[520px]">
                        <div className="relative border border-white/[0.09] bg-[#0A121D] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-9">
                            <CornerTick className="-top-px -left-px border-t border-l" />
                            <CornerTick className="-top-px -right-px border-t border-r" />
                            <CornerTick className="-bottom-px -left-px border-b border-l" />
                            <CornerTick className="-right-px -bottom-px border-r border-b" />

                            <div className="mb-8">
                                <p className="mb-3 text-xs font-bold tracking-[0.18em] text-cyan-300 uppercase">
                                    Өтінім беруші порталы
                                </p>
                                <h1 className="text-2xl font-bold tracking-[-0.02em] text-white">
                                    Аккаунт құру
                                </h1>
                                <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                                    Бос гектарды қарап, инвестициялық өтінім
                                    беру үшін байланыс деректеріңізді енгізіңіз.
                                </p>
                            </div>

                            <Form
                                action={store()}
                                method="post"
                                resetOnSuccess={[
                                    'password',
                                    'password_confirmation',
                                ]}
                                disableWhileProcessing
                                className="space-y-5"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div className="grid gap-2 sm:col-span-2">
                                                <Label
                                                    htmlFor="full_name"
                                                    className="text-sm font-medium text-slate-200"
                                                >
                                                    Аты-жөні
                                                </Label>
                                                <div className="relative">
                                                    <UserRound
                                                        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500"
                                                        strokeWidth={1.8}
                                                    />
                                                    <Input
                                                        id="full_name"
                                                        type="text"
                                                        name="full_name"
                                                        required
                                                        autoFocus
                                                        tabIndex={1}
                                                        autoComplete="name"
                                                        aria-invalid={Boolean(
                                                            errors.full_name,
                                                        )}
                                                        placeholder="Толық аты-жөніңіз"
                                                        className={`${inputClassName} pl-11`}
                                                    />
                                                </div>
                                                <InputError
                                                    message={errors.full_name}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="phone"
                                                    className="text-sm font-medium text-slate-200"
                                                >
                                                    Телефон
                                                </Label>
                                                <div className="relative">
                                                    <Phone
                                                        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500"
                                                        strokeWidth={1.8}
                                                    />
                                                    <Input
                                                        id="phone"
                                                        type="tel"
                                                        name="phone"
                                                        required
                                                        tabIndex={2}
                                                        autoComplete="tel"
                                                        aria-invalid={Boolean(
                                                            errors.phone,
                                                        )}
                                                        placeholder="+7 700 000 00 00"
                                                        className={`${inputClassName} pl-11`}
                                                    />
                                                </div>
                                                <InputError
                                                    message={errors.phone}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="email"
                                                    className="text-sm font-medium text-slate-200"
                                                >
                                                    Email
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
                                                        tabIndex={3}
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

                                            <PasswordField
                                                id="password"
                                                label="Құпиясөз"
                                                name="password"
                                                tabIndex={4}
                                                visible={showPassword}
                                                onToggle={() =>
                                                    setShowPassword(
                                                        (value) => !value,
                                                    )
                                                }
                                                error={errors.password}
                                                placeholder="Кемінде 8 таңба"
                                            />

                                            <PasswordField
                                                id="password_confirmation"
                                                label="Құпиясөзді растау"
                                                name="password_confirmation"
                                                tabIndex={5}
                                                visible={showConfirmation}
                                                onToggle={() =>
                                                    setShowConfirmation(
                                                        (value) => !value,
                                                    )
                                                }
                                                error={
                                                    errors.password_confirmation
                                                }
                                                placeholder="Қайта енгізіңіз"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="group h-12 w-full rounded-lg bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200"
                                            tabIndex={6}
                                            disabled={processing}
                                            data-test="register-user-button"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <UserRound className="size-4" />
                                            )}
                                            Аккаунт құру
                                            {!processing && (
                                                <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                                            )}
                                        </Button>
                                    </>
                                )}
                            </Form>

                            <p className="mt-6 text-center text-sm text-slate-400">
                                Аккаунтыңыз бар ма?{' '}
                                <TextLink
                                    href={login()}
                                    tabIndex={7}
                                    className="font-semibold text-cyan-300 hover:text-cyan-200"
                                >
                                    Жүйеге кіру
                                </TextLink>
                            </p>
                        </div>

                        <Link
                            href="/"
                            className="mx-auto mt-7 flex w-fit items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-200"
                        >
                            <ArrowLeft className="size-4" />
                            Басты бетке оралу
                        </Link>
                    </div>
                </main>

                <p className="pointer-events-none absolute inset-x-0 bottom-4 z-10 hidden text-center text-xs text-slate-600 sm:block">
                    IN-MAP · Инвестициялық платформа
                </p>
            </div>
        </>
    );
}

function PasswordField({
    id,
    label,
    name,
    tabIndex,
    visible,
    onToggle,
    error,
    placeholder,
}: {
    id: string;
    label: string;
    name: string;
    tabIndex: number;
    visible: boolean;
    onToggle: () => void;
    error?: string;
    placeholder: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id} className="text-sm font-medium text-slate-200">
                {label}
            </Label>
            <div className="relative">
                <LockKeyhole
                    className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500"
                    strokeWidth={1.8}
                />
                <Input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    name={name}
                    required
                    tabIndex={tabIndex}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    placeholder={placeholder}
                    className={`${inputClassName} pr-12 pl-11`}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={onToggle}
                    aria-label={
                        visible ? 'Құпиясөзді жасыру' : 'Құпиясөзді көрсету'
                    }
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-300"
                >
                    {visible ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                </button>
            </div>
            <InputError message={error} />
        </div>
    );
}
