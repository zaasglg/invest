import { Form, Head } from '@inertiajs/react';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { disable, enable, show } from '@/routes/two-factor';
import type { BreadcrumbItem } from '@/types';

type Props = {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Двухфакторная аутентификация',
        href: show.url(),
    },
];

export default function TwoFactor({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: Props) {
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Двухфакторная аутентификация" />

            <h1 className="sr-only">Двухфакторная аутентификация</h1>

            <SettingsLayout>
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <Heading
                        variant="small"
                        title="Двухфакторная аутентификация"
                        description="Управление настройками двухфакторной аутентификации"
                    />
                    {twoFactorEnabled ? (
                        <div className="mt-4 flex flex-col items-start space-y-4">
                            <Badge
                                variant="default"
                                className="bg-emerald-100 text-emerald-800"
                            >
                                Включено
                            </Badge>
                            <p className="text-sm text-gray-500">
                                Двухфакторная аутентификация включена. При входе
                                в систему вам потребуется ввести одноразовый код
                                из приложения-аутентификатора на вашем телефоне.
                            </p>

                            <TwoFactorRecoveryCodes
                                recoveryCodesList={recoveryCodesList}
                                fetchRecoveryCodes={fetchRecoveryCodes}
                                errors={errors}
                            />

                            <div className="relative inline">
                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <Button
                                            variant="destructive"
                                            type="submit"
                                            disabled={processing}
                                        >
                                            <ShieldBan /> Отключить 2FA
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 flex flex-col items-start space-y-4">
                            <Badge
                                variant="destructive"
                                className="bg-red-100 text-red-800"
                            >
                                Отключено
                            </Badge>
                            <p className="text-sm text-gray-500">
                                Когда вы включите двухфакторную аутентификацию,
                                при входе в систему вам потребуется ввести
                                одноразовый код из приложения на телефоне.
                            </p>

                            <div>
                                {hasSetupData ? (
                                    <Button
                                        onClick={() => setShowSetupModal(true)}
                                        className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]"
                                    >
                                        <ShieldCheck />
                                        Продолжить настройку
                                    </Button>
                                ) : (
                                    <Form
                                        {...enable.form()}
                                        onSuccess={() =>
                                            setShowSetupModal(true)
                                        }
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]"
                                            >
                                                <ShieldCheck />
                                                Включить 2FA
                                            </Button>
                                        )}
                                    </Form>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <TwoFactorSetupModal
                    isOpen={showSetupModal}
                    onClose={() => setShowSetupModal(false)}
                    requiresConfirmation={requiresConfirmation}
                    twoFactorEnabled={twoFactorEnabled}
                    qrCodeSvg={qrCodeSvg}
                    manualSetupKey={manualSetupKey}
                    clearSetupData={clearSetupData}
                    fetchSetupData={fetchSetupData}
                    errors={errors}
                />
            </SettingsLayout>
        </AppLayout>
    );
}
