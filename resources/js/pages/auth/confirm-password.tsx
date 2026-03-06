import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <AuthLayout
            title="Құпия сөзіңізді растаңыз"
            description="Бұл қолданбаның қорғалған аймағы. Жалғастыру үшін құпия сөзіңізді растаңыз."
        >
            <Head title="Құпия сөзіңізді растаңыз" />

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="password">Құпия сөз</Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Құпия сөз"
                                autoComplete="current-password"
                                autoFocus
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center">
                            <Button
                                className="w-full"
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && <Spinner />}
                                Құпия сөзді растаңыз
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </AuthLayout>
    );
}
