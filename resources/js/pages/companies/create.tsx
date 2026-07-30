import { Head } from '@inertiajs/react';
import CompanyForm from '@/components/companies/company-form';
import AppLayout from '@/layouts/app-layout';

interface RegionOption {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
}

interface Props {
    regions: RegionOption[];
    legalForms: Record<string, string>;
    statuses: Record<string, string>;
}

export default function Create({ regions, legalForms, statuses }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Компаниялар', href: '/companies' },
                { title: 'Жаңа компания', href: '' },
            ]}
        >
            <Head title="Жаңа компания" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Жаңа компания
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Компанияның заңды реквизиттері мен байланыс деректерін
                        толық енгізіңіз.
                    </p>
                </div>
                <CompanyForm
                    regions={regions}
                    legalForms={legalForms}
                    statuses={statuses}
                    submitUrl="/companies"
                    method="post"
                    submitLabel="Компанияны сақтау"
                />
            </div>
        </AppLayout>
    );
}
