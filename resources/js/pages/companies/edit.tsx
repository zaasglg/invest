import { Head } from '@inertiajs/react';
import CompanyForm from '@/components/companies/company-form';
import type { CompanyFormValue } from '@/components/companies/company-form';
import { PageContainer, PageHeader } from '@/components/ui/page';
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
            <PageContainer width="form">
                <PageHeader
                    eyebrow="Компаниялар"
                    title="Компанияны өңдеу"
                    subtitle="Өзгертілген атау оған тіркелген жобаларда автоматты жаңартылады."
                />
                <CompanyForm
                    company={company}
                    regions={regions}
                    legalForms={legalForms}
                    statuses={statuses}
                    submitUrl={`/companies/${company.id}`}
                    method="put"
                    submitLabel="Өзгерістерді сақтау"
                />
            </PageContainer>
        </AppLayout>
    );
}
