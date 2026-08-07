import { Head } from '@inertiajs/react';
import CompanyForm from '@/components/companies/company-form';
import { PageContainer, PageHeader } from '@/components/ui/page';
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
            <PageContainer width="form">
                <PageHeader
                    eyebrow="Компаниялар"
                    title="Жаңа компания"
                    subtitle="Компанияның заңды реквизиттері мен байланыс деректерін толық енгізіңіз."
                />
                <CompanyForm
                    regions={regions}
                    legalForms={legalForms}
                    statuses={statuses}
                    submitUrl="/companies"
                    method="post"
                    submitLabel="Компанияны сақтау"
                />
            </PageContainer>
        </AppLayout>
    );
}
