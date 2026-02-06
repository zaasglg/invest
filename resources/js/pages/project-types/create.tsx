import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FormEventHandler } from 'react';
import * as projectTypes from '@/routes/project-types';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: ''
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(projectTypes.store.url());
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Типы проектов', href: projectTypes.index.url() },
            { title: 'Создание', href: '#' }
        ]}>
            <Head title="Создание типа проекта" />

            <div className="flex h-full flex-col p-4 max-w-2xl">
                <h1 className="text-2xl font-bold font-serif mb-6 text-neutral-900 dark:text-neutral-100">Новый тип проекта</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-neutral-500 font-normal">Наименование</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Например: Ветроэлектростанция"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="shadow-none">
                            Сохранить
                        </Button>
                        <Link href={projectTypes.index.url()} className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
