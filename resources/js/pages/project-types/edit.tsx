import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FormEventHandler } from 'react';
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
        name: projectType.name
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(projectTypes.update.url(projectType.id));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Типы проектов', href: projectTypes.index.url() },
            { title: 'Редактирование', href: '#' }
        ]}>
            <Head title="Редактирование типа проекта" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-6 text-[#0f1b3d]">Редактирование типа проекта</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-gray-500 font-normal">Наименование</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            placeholder="Например: Ветроэлектростанция"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            Обновить
                        </Button>
                        <Link href={projectTypes.index.url()} className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
