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
            { title: 'Рөлдер', href: roles.index.url() },
            { title: 'Құру', href: '#' }
        ]}>
            <Head title="Рөл құру" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="text-2xl font-bold mb-6 text-[#0f1b3d]">Жаңа рөл</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="text-gray-500 font-normal">
                            Жүйелік аты
                            <span className="text-xs ml-2 text-gray-400">(латын әріптері, бос орынсыз)</span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent font-mono"
                            placeholder="admin"
                            autoFocus
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="display_name" className="text-gray-500 font-normal">Көрсетілетін аты</Label>
                        <Input
                            id="display_name"
                            value={data.display_name}
                            onChange={(e) => setData('display_name', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] h-10 bg-transparent"
                            placeholder="Администратор"
                        />
                        {errors.display_name && <span className="text-sm text-red-500">{errors.display_name}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description" className="text-gray-500 font-normal">Сипаттама</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                            className="shadow-none border-gray-200 focus-visible:ring-0 focus:border-[#0f1b3d] bg-transparent min-h-[120px]"
                            placeholder="Рөл мен оның өкілеттіктерінің сипаттамасы..."
                        />
                        {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]">
                            Сақтау
                        </Button>
                        <Link href={roles.index.url()} className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]">
                            Болдырмау
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
