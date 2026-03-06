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
        title: 'Екі факторлы аутентификация',
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
            <Head title="Екі факторлы аутентификация" />

            <h1 className="sr-only">Екі факторлы аутентификация</h1>

            <SettingsLayout>
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <Heading
                        variant="small"
                        title="Екі факторлы аутентификация"
                        description="Екі факторлы аутентификация баптауларын басқару"
                    />
                    {twoFactorEnabled ? (
                        <div className="mt-4 flex flex-col items-start space-y-4">
                            <Badge
                                variant="default"
                                className="bg-emerald-100 text-emerald-800"
                            >
                                Қосылған
                            </Badge>
                            <p className="text-sm text-gray-500">
                                Екі факторлы аутентификация қосылған. Жүйеге кіргенде
                                телефоныңыздағы аутентификация қолданбасынан
                                бір жолғы код енгізу қажет болады.
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
                                            <ShieldBan /> 2FA өшіру
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
                                Өшірілген
                            </Badge>
                            <p className="text-sm text-gray-500">
                                Екі факторлы аутентификацияны қосқанда,
                                жүйеге кіргенде телефоныңыздағы қолданбадан
                                бір жолғы код енгізу қажет болады.
                            </p>

                            <div>
                                {hasSetupData ? (
                                    <Button
                                        onClick={() => setShowSetupModal(true)}
                                        className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]"
                                    >
                                        <ShieldCheck />
                                        Баптауды жалғастыру
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
                                                2FA қосу
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
