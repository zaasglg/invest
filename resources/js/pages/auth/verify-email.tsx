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
            title="Электрондық поштаны растау"
            description="Біз жіберген сілтеме арқылы электрондық пошта мекенжайыңызды растаңыз."
        >
            <Head title="Электрондық поштаны растау" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    Растау сілтемесі тіркелу кезінде көрсетілген электрондық
                    пошта мекенжайына жіберілді.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Растау хатын қайта жіберу
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Шығу
                        </TextLink>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
