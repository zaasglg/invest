import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormEventHandler } from 'react';
import * as roles from '@/routes/roles';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        display_name: '',
        description: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(roles.store.url());
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Роли', href: roles.index.url() },
            { title: 'Создание', href: '#' }
        ]}>
            <Head title="Создание роли" />

            <div className="flex h-full flex-col p-4 max-w-2xl">
                <h1 className="text-2xl font-bold font-serif mb-6 text-neutral-900 dark:text-neutral-100">Новая роль</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-neutral-500 font-normal">
                            Системное имя
                            <span className="text-xs ml-2 text-neutral-400">(латиница, без пробелов)</span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent font-mono"
                            placeholder="admin"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="display_name" className="text-neutral-500 font-normal">Отображаемое имя</Label>
                        <Input
                            id="display_name"
                            value={data.display_name}
                            onChange={(e) => setData('display_name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Администратор"
                        />
                        {errors.display_name && <span className="text-sm text-red-500">{errors.display_name}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description" className="text-neutral-500 font-normal">Описание</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 bg-transparent min-h-[120px]"
                            placeholder="Описание роли и её полномочий..."
                        />
                        {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="shadow-none">
                            Сохранить
                        </Button>
                        <Link href={roles.index.url()} className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
