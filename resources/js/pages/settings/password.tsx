import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { CheckCircle2, KeyRound, LockKeyhole, Save } from 'lucide-react';
import { useRef } from 'react';

import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/user-password';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Құпия сөз параметрлері',
        href: edit().url,
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Құпия сөз параметрлері" />

            <SettingsLayout>
                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_-28px_rgba(15,27,61,0.7)]">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-navy/5 text-navy">
                                <KeyRound className="size-5" />
                            </span>
                            <div>
                                <h2 className="font-bold text-navy">
                                    Құпия сөзді өзгерту
                                </h2>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Аккаунтыңыз үшін жаңа қауіпсіз құпия сөз
                                    орнатыңыз.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Form
                        {...PasswordController.update.form()}
                        options={{ preserveScroll: true }}
                        resetOnError={[
                            'password',
                            'password_confirmation',
                            'current_password',
                        ]}
                        resetOnSuccess
                        onError={(errors) => {
                            if (errors.password) {
                                passwordInput.current?.focus();
                            }

                            if (errors.current_password) {
                                currentPasswordInput.current?.focus();
                            }
                        }}
                        className="space-y-6 p-6"
                    >
                        {({ errors, processing, recentlySuccessful }) => (
                            <>
                                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                    <div className="flex gap-3">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                            <LockKeyhole className="size-4" />
                                        </span>
                                        <p className="text-sm leading-6 text-blue-800">
                                            Кемінде 8 таңба қолданыңыз. Басқа
                                            сервистерде қолданылмайтын құпия сөз
                                            таңдаған дұрыс.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">
                                        Ағымдағы құпия сөз
                                    </Label>
                                    <Input
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        placeholder="Ағымдағы құпия сөзді енгізіңіз"
                                    />
                                    <InputError
                                        message={errors.current_password}
                                    />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            Жаңа құпия сөз
                                        </Label>
                                        <Input
                                            id="password"
                                            ref={passwordInput}
                                            name="password"
                                            type="password"
                                            required
                                            autoComplete="new-password"
                                            placeholder="Жаңа құпия сөз"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation">
                                            Құпия сөзді растау
                                        </Label>
                                        <Input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type="password"
                                            required
                                            autoComplete="new-password"
                                            placeholder="Қайта енгізіңіз"
                                        />
                                        <InputError
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        data-test="update-password-button"
                                    >
                                        <Save className="size-4" />
                                        {processing
                                            ? 'Сақталуда...'
                                            : 'Құпия сөзді сақтау'}
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="translate-y-1 opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="translate-y-1 opacity-0"
                                    >
                                        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                                            <CheckCircle2 className="size-4" />
                                            Құпия сөз сақталды
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </section>
            </SettingsLayout>
        </AppLayout>
    );
}
