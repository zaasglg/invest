import { Head, useForm, Link } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
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
            { title: 'Жоба түрлері', href: projectTypes.index.url() },
            { title: 'Құру', href: '#' }
        ]}>
            <Head title="Жоба түрін құру" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-6 text-[#0f1b3d]">Жаңа жоба түрі</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-gray-500 font-normal">Атауы</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            placeholder="Мысалы: Жел электр станциясы"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            Сақтау
                        </Button>
                        <Link href={projectTypes.index.url()} className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]">
                            Болдырмау
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
