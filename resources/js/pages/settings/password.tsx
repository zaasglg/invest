import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import Heading from '@/components/heading';
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
        title: 'Құпия сөз баптаулары',
        href: edit().url,
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Құпия сөз баптаулары" />

            <h1 className="sr-only">Құпия сөз баптаулары</h1>

            <SettingsLayout>
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <Heading
                        variant="small"
                        title="Құпия сөзді өзгерту"
                        description="Аккаунт қауіпсіздігі үшін ұзын күрделі құпия сөз қолданыңыз"
                    />

                    <Form
                        {...PasswordController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
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
                        className="mt-4 space-y-5"
                    >
                        {({ errors, processing, recentlySuccessful }) => (
                            <>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="current_password">
                                        Ағымдағы құпия сөз
                                    </Label>
                                    <Input
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        type="password"
                                        className="block w-full"
                                        autoComplete="current-password"
                                        placeholder="Ағымдағы құпия сөзді енгізіңіз"
                                    />
                                    <InputError
                                        message={errors.current_password}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="password">
                                        Жаңа құпия сөз
                                    </Label>
                                    <Input
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        type="password"
                                        className="block w-full"
                                        autoComplete="new-password"
                                        placeholder="Жаңа құпия сөзді енгізіңіз"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="password_confirmation">
                                        Құпия сөзді растаңыз
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        className="block w-full"
                                        autoComplete="new-password"
                                        placeholder="Жаңа құпия сөзді қайталаңыз"
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-password-button"
                                        className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]"
                                    >
                                        Құпия сөзді сақтау
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-green-600">
                                            Сақталды
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
