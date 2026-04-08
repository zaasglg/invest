import { Head, useForm, Link } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import * as roles from '@/routes/roles';

interface Role {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
}

interface Props {
    role: Role;
}

export default function Edit({ role }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: role.name || '',
        display_name: role.display_name || '',
        description: role.description || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(roles.update.url(role.id));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Рөлдер', href: roles.index.url() },
                { title: 'Өңдеу', href: '#' },
            ]}
        >
            <Head title="Рөлді өңдеу" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="mb-6 text-2xl font-bold text-[#0f1b3d]">
                    Рөлді өңдеу
                </h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="name"
                            className="font-normal text-gray-500"
                        >
                            Жүйелік аты
                            <span className="ml-2 text-xs text-gray-400">
                                (латын әріптері, бос орынсыз)
                            </span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="h-10 border-gray-200 bg-transparent font-mono shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="admin"
                            autoFocus
                        />
                        {errors.name && (
                            <span className="text-sm text-red-500">
                                {errors.name}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="display_name"
                            className="font-normal text-gray-500"
                        >
                            Көрсетілетін аты
                        </Label>
                        <Input
                            id="display_name"
                            value={data.display_name}
                            onChange={(e) =>
                                setData('display_name', e.target.value)
                            }
                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="Администратор"
                        />
                        {errors.display_name && (
                            <span className="text-sm text-red-500">
                                {errors.display_name}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="description"
                            className="font-normal text-gray-500"
                        >
                            Сипаттама
                        </Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>,
                            ) => setData('description', e.target.value)}
                            className="min-h-[120px] border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="Рөл мен оның өкілеттіктерінің сипаттамасы..."
                        />
                        {errors.description && (
                            <span className="text-sm text-red-500">
                                {errors.description}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            disabled={processing}
                            className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]"
                        >
                            Сақтау
                        </Button>
                        <Link
                            href={roles.index.url()}
                            className="text-sm text-[#0f1b3d] hover:text-[#c8a44e]"
                        >
                            Болдырмау
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
