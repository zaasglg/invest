import { Head, useForm, Link } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormCard, PageContainer, PageHeader } from '@/components/ui/page';
import AppLayout from '@/layouts/app-layout';
import * as projectTypes from '@/routes/project-types';

interface ProjectType {
    id: number;
    name: string;
}

interface Props {
    projectType: ProjectType;
}

export default function Edit({ projectType }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: projectType.name,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(projectTypes.update.url(projectType.id));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Жоба түрлері', href: projectTypes.index.url() },
                { title: 'Өңдеу', href: '#' },
            ]}
        >
            <Head title="Жоба түрін өңдеу" />

            <PageContainer width="form">
                <PageHeader
                    eyebrow="Анықтамалық"
                    title="Жоба түрін өңдеу"
                    subtitle="Жоба түрінің атауын жаңартыңыз."
                />
                <FormCard>
                    <form onSubmit={submit} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Label
                                htmlFor="name"
                                className="font-normal text-gray-500"
                            >
                                Атауы
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                placeholder="Мысалы: Жел электр станциясы"
                                autoFocus
                            />
                            {errors.name && (
                                <span className="text-sm text-red-500">
                                    {errors.name}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                disabled={processing}
                                className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]"
                            >
                                Жаңарту
                            </Button>
                            <Link
                                href={projectTypes.index.url()}
                                className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]"
                            >
                                Болдырмау
                            </Link>
                        </div>
                    </form>
                </FormCard>
            </PageContainer>
        </AppLayout>
    );
}
