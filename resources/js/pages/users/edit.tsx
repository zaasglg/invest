import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormEventHandler, useState, useMemo } from 'react';
import * as users from '@/routes/users';

interface Region {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
}

interface Role {
    id: number;
    name: string;
    display_name: string;
}

interface User {
    id: number;
    full_name: string;
    email: string;
    role_id: number | null;
    region_id: number | null;
    baskarma_type: string | null;
    position: string | null;
}

interface Props {
    user: User;
    regions: Region[];
    roles: Role[];
}

export default function Edit({ user, regions, roles }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        full_name: user.full_name || '',
        email: user.email || '',
        password: '',
        password_confirmation: '',
        role_id: user.role_id?.toString() || 'none',
        region_id: user.region_id?.toString() || '',
        baskarma_type: user.baskarma_type || '',
        position: user.position || '',
    });

    const initialRegion = regions.find(r => r.id === user.region_id);
    const initialOblastId = initialRegion
        ? (initialRegion.type === 'oblast' ? initialRegion.id.toString() : initialRegion.parent_id?.toString() || '')
        : '';

    const [selectedOblastId, setSelectedOblastId] = useState<string>(initialOblastId);

    const oblasts = useMemo(() => regions.filter(r => r.type === 'oblast'), [regions]);

    const districts = useMemo(() => {
        if (!selectedOblastId) return [];
        return regions.filter(r => r.parent_id === parseInt(selectedOblastId));
    }, [regions, selectedOblastId]);

    const selectedRole = useMemo(() => {
        const rid = parseInt(data.role_id);
        return roles.find(r => r.id === rid);
    }, [data.role_id, roles]);

    const isBaskarma = selectedRole?.name === 'baskarma';
    const isIspolnitel = selectedRole?.name === 'ispolnitel';
    const showRegionSelects = isIspolnitel || (isBaskarma && data.baskarma_type === 'district');

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(users.update.url(user.id));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Пользователи', href: users.index.url() },
            { title: 'Редактирование', href: '#' }
        ]}>
            <Head title="Редактирование пользователя" />

            <div className="flex h-full flex-col p-4 max-w-2xl">
                <h1 className="text-2xl font-bold font-serif mb-6 text-neutral-900 dark:text-neutral-100">Редактирование пользователя</h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="full_name" className="text-neutral-500 font-normal">ФИО</Label>
                        <Input
                            id="full_name"
                            value={data.full_name}
                            onChange={(e) => setData('full_name', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="Иванов Иван Иванович"
                            autoFocus
                        />
                        {errors.full_name && <span className="text-sm text-red-500">{errors.full_name}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email" className="text-neutral-500 font-normal">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                            placeholder="user@example.com"
                        />
                        {errors.email && <span className="text-sm text-red-500">{errors.email}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password" className="text-neutral-500 font-normal">
                                Новый пароль
                                <span className="text-xs ml-2 text-neutral-400">(оставьте пустым, чтобы не менять)</span>
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                                placeholder="••••••••"
                            />
                            {errors.password && <span className="text-sm text-red-500">{errors.password}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password_confirmation" className="text-neutral-500 font-normal">Подтверждение пароля</Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                                placeholder="••••••••"
                            />
                            {errors.password_confirmation && <span className="text-sm text-red-500">{errors.password_confirmation}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="role_id" className="text-neutral-500 font-normal">Роль</Label>
                        <Select
                            value={data.role_id}
                            onValueChange={(value) => {
                                setData(prev => ({
                                    ...prev,
                                    role_id: value,
                                    baskarma_type: '',
                                    position: '',
                                    region_id: '',
                                }));
                                setSelectedOblastId('');
                            }}
                        >
                            <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                <SelectValue placeholder="Выберите роль" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Без роли</SelectItem>
                                {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id.toString()}>
                                        {role.display_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.role_id && <span className="text-sm text-red-500">{errors.role_id}</span>}
                    </div>

                    {/* Басқарма type selection */}
                    {isBaskarma && (
                        <div className="flex flex-col gap-2">
                            <Label className="text-neutral-500 font-normal">Басқарма түрі</Label>
                            <Select
                                value={data.baskarma_type}
                                onValueChange={(value) => {
                                    setData(prev => ({
                                        ...prev,
                                        baskarma_type: value,
                                        region_id: '',
                                        position: '',
                                    }));
                                    setSelectedOblastId('');
                                }}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Басқарма түрін таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="oblast">Облыстық басқарма</SelectItem>
                                    <SelectItem value="district">Аудандық басқарма</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.baskarma_type && <span className="text-sm text-red-500">{errors.baskarma_type}</span>}
                        </div>
                    )}

                    {/* Position field for baskarma */}
                    {isBaskarma && data.baskarma_type && (
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="position" className="text-neutral-500 font-normal">Лауазымы</Label>
                            <Input
                                id="position"
                                value={data.position}
                                onChange={(e) => setData('position', e.target.value)}
                                className="shadow-none border-neutral-200 focus-visible:ring-0 focus:border-neutral-900 h-10 bg-transparent"
                                placeholder="Мысалы: Басқарма басшысы"
                            />
                            {errors.position && <span className="text-sm text-red-500">{errors.position}</span>}
                        </div>
                    )}

                    {/* Oblast + District selects */}
                    {showRegionSelects && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="oblast" className="text-neutral-500 font-normal">Облыс</Label>
                            <Select
                                value={selectedOblastId}
                                onValueChange={(value) => {
                                    setSelectedOblastId(value);
                                    setData('region_id', '');
                                }}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Облысты таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    {oblasts.map((oblast) => (
                                        <SelectItem key={oblast.id} value={oblast.id.toString()}>
                                            {oblast.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="region_id" className="text-neutral-500 font-normal">Аудан / Қала</Label>
                            <Select
                                value={data.region_id}
                                onValueChange={(value) => setData('region_id', value)}
                                disabled={!selectedOblastId}
                            >
                                <SelectTrigger className="shadow-none border-neutral-200 focus:ring-0 focus:border-neutral-900 h-10 w-full">
                                    <SelectValue placeholder="Ауданды таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map((district) => (
                                        <SelectItem key={district.id} value={district.id.toString()}>
                                            {district.name}
                                        </SelectItem>
                                    ))}
                                    {selectedOblastId && districts.length === 0 && (
                                        <SelectItem value="none" disabled>
                                            Аудандар жоқ
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.region_id && <span className="text-sm text-red-500">{errors.region_id}</span>}
                        </div>
                    </div>
                    )}

                    <div className="flex items-center gap-4">
                        <Button disabled={processing} className="shadow-none">
                            Сохранить
                        </Button>
                        <Link href={users.index.url()} className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
