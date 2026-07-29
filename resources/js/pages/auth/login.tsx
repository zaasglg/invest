import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Map,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Жүйеге кіру">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>

            <div className="relative min-h-svh overflow-hidden bg-[#020817] font-sans text-white">
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden="true"
                >
                    <div className="absolute -top-48 left-[16%] h-[34rem] w-[34rem] rounded-full bg-cyan-400/[0.08] blur-[110px]" />
                    <div className="absolute -right-32 bottom-[-12rem] h-[34rem] w-[34rem] rounded-full bg-teal-400/[0.08] blur-[120px]" />
                    <div
                        className="absolute inset-0 opacity-[0.07]"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(103, 232, 249, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(103, 232, 249, 0.18) 1px, transparent 1px)',
                            backgroundSize: '72px 72px',
                            maskImage:
                                'linear-gradient(to bottom, black, transparent 88%)',
                        }}
                    />
                </div>

                <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1500px] lg:grid-cols-[1.12fr_0.88fr]">
                    <section className="relative hidden min-h-svh flex-col overflow-hidden border-r border-cyan-200/10 px-12 py-10 lg:flex xl:px-16 xl:py-12">
                        <Link
                            href="/"
                            className="group flex w-fit items-center gap-4"
                        >
                            <span className="flex size-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur-xl">
                                <Map
                                    className="size-5 text-cyan-300"
                                    strokeWidth={1.8}
                                />
                            </span>
                            <span className="flex flex-col">
                                <span className="text-lg font-extrabold tracking-[0.2em] text-white">
                                    IN
                                    <span className="text-cyan-300">MAP</span>
                                </span>
                                <span className="mt-0.5 text-[0.65rem] font-semibold tracking-[0.22em] text-slate-400 uppercase">
                                    Түркістан облысы
                                </span>
                            </span>
                        </Link>

                        <div className="my-auto max-w-2xl pb-6">
                            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/[0.06] px-4 py-2 text-xs font-semibold tracking-[0.16em] text-cyan-200 uppercase backdrop-blur-xl">
                                <span className="relative flex size-2">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-60 motion-reduce:animate-none" />
                                    <span className="relative inline-flex size-2 rounded-full bg-cyan-300" />
                                </span>
                                Бірыңғай цифрлық экожүйе
                            </div>

                            <h1 className="max-w-xl text-4xl leading-[1.08] font-extrabold tracking-[-0.04em] text-balance text-white xl:text-6xl">
                                Инвестициялық шешімдерге арналған{' '}
                                <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                                    ақылды кеңістік
                                </span>
                            </h1>

                            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300/80 xl:text-lg">
                                Аймақтар, жобалар және негізгі көрсеткіштер бір
                                картада. Деректерді бақылаңыз, өзгерістерді
                                талдаңыз және шешімді сенімді қабылдаңыз.
                            </p>

                            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
                                <article className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200/20 hover:bg-cyan-300/[0.06]">
                                    <span className="mb-4 flex size-9 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
                                        <Map
                                            className="size-4"
                                            strokeWidth={1.8}
                                        />
                                    </span>
                                    <p className="text-sm font-semibold text-white">
                                        Интерактивті карта
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Аймақтар көрінісі
                                    </p>
                                </article>

                                <article className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200/20 hover:bg-cyan-300/[0.06]">
                                    <span className="mb-4 flex size-9 items-center justify-center rounded-xl bg-teal-300/10 text-teal-300">
                                        <BarChart3
                                            className="size-4"
                                            strokeWidth={1.8}
                                        />
                                    </span>
                                    <p className="text-sm font-semibold text-white">
                                        Нақты аналитика
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Динамика мен KPI
                                    </p>
                                </article>

                                <article className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200/20 hover:bg-cyan-300/[0.06]">
                                    <span className="mb-4 flex size-9 items-center justify-center rounded-xl bg-sky-300/10 text-sky-300">
                                        <Sparkles
                                            className="size-4"
                                            strokeWidth={1.8}
                                        />
                                    </span>
                                    <p className="text-sm font-semibold text-white">
                                        Жоба мониторингі
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Бірыңғай бақылау
                                    </p>
                                </article>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-6 text-xs text-slate-500">
                            <span>IN-MAP · Инвестициялық платформа</span>
                            <span className="flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                                Жүйе жұмыс істеп тұр
                            </span>
                        </div>

                        <div
                            className="pointer-events-none absolute -right-48 -bottom-56 size-[38rem] rounded-full border border-cyan-200/[0.08]"
                            aria-hidden="true"
                        >
                            <div className="absolute inset-16 rounded-full border border-cyan-200/[0.06]" />
                            <div className="absolute inset-32 rounded-full border border-cyan-200/[0.05]" />
                            <div className="absolute top-[18%] left-[15%] size-2 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
                            <div className="absolute top-[36%] left-[4%] size-1.5 rounded-full bg-teal-300 shadow-[0_0_20px_rgba(94,234,212,0.8)]" />
                        </div>
                    </section>

                    <main className="flex min-h-svh items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
                        <div className="w-full max-w-[450px]">
                            <div className="mb-8 flex items-center justify-between lg:hidden">
                                <Link
                                    href="/"
                                    className="flex items-center gap-3"
                                >
                                    <span className="flex size-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/[0.08]">
                                        <Map className="size-4 text-cyan-300" />
                                    </span>
                                    <span className="text-base font-extrabold tracking-[0.18em]">
                                        IN
                                        <span className="text-cyan-300">
                                            MAP
                                        </span>
                                    </span>
                                </Link>
                                <Link
                                    href="/"
                                    aria-label="Басты бетке оралу"
                                    className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-cyan-200/20 hover:text-cyan-200"
                                >
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </div>

                            <div className="rounded-[2rem] border border-white/[0.1] bg-slate-950/55 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-9">
                                <div className="mb-8">
                                    <div className="mb-5 flex items-center justify-between">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[0.68rem] font-bold tracking-[0.14em] text-emerald-300 uppercase">
                                            <ShieldCheck className="size-3.5" />
                                            Қауіпсіз кіру
                                        </span>
                                        <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-slate-600 uppercase">
                                            IN-MAP
                                        </span>
                                    </div>

                                    <h2 className="text-3xl font-bold tracking-[-0.035em] text-white">
                                        Қош келдіңіз
                                    </h2>
                                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
                                        Жұмыс кеңістігіне өту үшін корпоративтік
                                        аккаунтыңызбен кіріңіз.
                                    </p>
                                </div>

                                {status && (
                                    <div className="mb-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm font-medium text-emerald-300">
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
                                                        className="h-12 rounded-xl border-white/[0.09] bg-white/[0.045] pl-11 text-white shadow-none placeholder:text-slate-600 hover:border-white/15 focus-visible:border-cyan-300/45 focus-visible:ring-cyan-300/10"
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
                                                            Құпиясөзді ұмыттыңыз
                                                            ба?
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
                                                        className="h-12 rounded-xl border-white/[0.09] bg-white/[0.045] pr-12 pl-11 text-white shadow-none placeholder:text-slate-600 hover:border-white/15 focus-visible:border-cyan-300/45 focus-visible:ring-cyan-300/10"
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
                                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-300"
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
                                                className="group mt-1 h-12 w-full rounded-xl bg-cyan-300 font-bold text-slate-950 shadow-[0_14px_40px_rgba(34,211,238,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-200 hover:shadow-[0_18px_44px_rgba(34,211,238,0.24)]"
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

                                <div className="mt-7 flex items-center justify-center gap-2 border-t border-white/[0.07] pt-6 text-xs text-slate-600">
                                    <ShieldCheck className="size-3.5" />
                                    Қорғалған корпоративтік орта
                                </div>
                            </div>

                            <Link
                                href="/"
                                className="mx-auto mt-7 hidden w-fit items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-200 lg:flex"
                            >
                                <ArrowLeft className="size-4" />
                                Басты бетке оралу
                            </Link>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
