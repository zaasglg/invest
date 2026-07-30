import { Head } from '@inertiajs/react';
import CompanyForm from '@/components/companies/company-form';
import type { CompanyFormValue } from '@/components/companies/company-form';
import AppLayout from '@/layouts/app-layout';

interface RegionOption {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
}

interface Props {
    company: CompanyFormValue;
    regions: RegionOption[];
    legalForms: Record<string, string>;
    statuses: Record<string, string>;
}

export default function Edit({
    company,
    regions,
    legalForms,
    statuses,
}: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Компаниялар', href: '/companies' },
                {
                    title: company.name || 'Компания',
                    href: `/companies/${company.id}`,
                },
                { title: 'Өңдеу', href: '' },
            ]}
        >
            <Head title="Компанияны өңдеу" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#0f1b3d]">
                        Компанияны өңдеу
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Өзгертілген атау оған тіркелген жобаларда автоматты
                        жаңартылады.
                    </p>
                </div>
                <CompanyForm
                    company={company}
                    regions={regions}
                    legalForms={legalForms}
                    statuses={statuses}
                    submitUrl={`/companies/${company.id}`}
                    method="put"
                    submitLabel="Өзгерістерді сақтау"
                />
            </div>
        </AppLayout>
    );
}
