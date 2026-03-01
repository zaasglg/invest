// Components
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Подтверждение электронной почты"
            description="Пожалуйста, подтвердите свой адрес электронной почты, перейдя по ссылке, которую мы только что отправили вам."
        >
            <Head title="Подтверждение электронной почты" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    Новую ссылку для подтверждения был отправлен на адрес электронной почты 
                    который вы указали при регистрации.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Повторно отправить письмо с подтверждением
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Выйти
                        </TextLink>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
