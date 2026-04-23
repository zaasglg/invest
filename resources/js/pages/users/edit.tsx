import { Head, useForm, Link } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
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
    phone: string | null;
    role_id: number | null;
    invest_sub_role: string | null;
    region_id: number | null;
    baskarma_type: string | null;
    position: string | null;
    telegram_chat_id: string | null;
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
        phone: user.phone || '',
        password: '',
        password_confirmation: '',
        role_id: user.role_id?.toString() || 'none',
        invest_sub_role: user.invest_sub_role || '',
        region_id: user.region_id?.toString() || '',
        baskarma_type: user.baskarma_type || '',
        position: user.position || '',
        telegram_chat_id: user.telegram_chat_id || '',
    });

    const initialRegion = regions.find((r) => r.id === user.region_id);
    const initialOblastId = initialRegion
        ? initialRegion.type === 'oblast'
            ? initialRegion.id.toString()
            : initialRegion.parent_id?.toString() || ''
        : '';

    const [selectedOblastId, setSelectedOblastId] =
        useState<string>(initialOblastId);

    const oblasts = useMemo(
        () => regions.filter((r) => r.type === 'oblast'),
        [regions],
    );

    const districts = useMemo(() => {
        if (!selectedOblastId) return [];
        return regions.filter(
            (r) => r.parent_id === parseInt(selectedOblastId),
        );
    }, [regions, selectedOblastId]);

    const selectedRole = useMemo(() => {
        const rid = parseInt(data.role_id);
        return roles.find((r) => r.id === rid);
    }, [data.role_id, roles]);

    const isIspolnitel = selectedRole?.name === 'ispolnitel';
    const isInvest = selectedRole?.name === 'invest';
    const isAkim = selectedRole?.name === 'akim';
    const showRegionSelects =
        (isIspolnitel && data.baskarma_type === 'district') || isAkim;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(users.update.url(user.id));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Пайдаланушылар', href: users.index.url() },
                { title: 'Өңдеу', href: '#' },
            ]}
        >
            <Head title="Пайдаланушыны өңдеу" />

            <div className="flex h-full flex-col space-y-5 p-6">
                <h1 className="mb-6 text-2xl font-bold text-[#0f1b3d]">
                    Пайдаланушыны өңдеу
                </h1>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="full_name"
                            className="font-normal text-gray-500"
                        >
                            АТЖ
                        </Label>
                        <Input
                            id="full_name"
                            value={data.full_name}
                            onChange={(e) =>
                                setData('full_name', e.target.value)
                            }
                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="Есенов Есен Есенұлы"
                            autoFocus
                        />
                        {errors.full_name && (
                            <span className="text-sm text-red-500">
                                {errors.full_name}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="email"
                            className="font-normal text-gray-500"
                        >
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="user@example.com"
                        />
                        {errors.email && (
                            <span className="text-sm text-red-500">
                                {errors.email}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="phone"
                            className="font-normal text-gray-500"
                        >
                            Телефон нөмірі
                        </Label>
                        <Input
                            id="phone"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="+7 (777) 123-45-67"
                        />
                        {errors.phone && (
                            <span className="text-sm text-red-500">
                                {errors.phone}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label
                                htmlFor="password"
                                className="font-normal text-gray-500"
                            >
                                Жаңа құпия сөз
                                <span className="ml-2 text-xs text-gray-400">
                                    (өзгертпесеңіз, бос қалдырыңыз)
                                </span>
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                placeholder="••••••••"
                            />
                            {errors.password && (
                                <span className="text-sm text-red-500">
                                    {errors.password}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label
                                htmlFor="password_confirmation"
                                className="font-normal text-gray-500"
                            >
                                Құпия сөзді растау
                            </Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                placeholder="••••••••"
                            />
                            {errors.password_confirmation && (
                                <span className="text-sm text-red-500">
                                    {errors.password_confirmation}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="role_id"
                            className="font-normal text-gray-500"
                        >
                            Рөл
                        </Label>
                        <Select
                            value={data.role_id}
                            onValueChange={(value) => {
                                setData((prev) => ({
                                    ...prev,
                                    role_id: value,
                                    invest_sub_role: '',
                                    baskarma_type: '',
                                    position: '',
                                    region_id: '',
                                }));
                                setSelectedOblastId('');
                            }}
                        >
                            <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                <SelectValue placeholder="Рөлді таңдаңыз" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Рөлсіз</SelectItem>
                                {roles.map((role) => (
                                    <SelectItem
                                        key={role.id}
                                        value={role.id.toString()}
                                    >
                                        {role.display_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.role_id && (
                            <span className="text-sm text-red-500">
                                {errors.role_id}
                            </span>
                        )}
                    </div>

                    {/* Invest суб-рөлі */}
                    {isInvest && (
                        <div className="flex flex-col gap-2">
                            <Label className="font-normal text-gray-500">
                                Инвест бағыты
                            </Label>
                            <Select
                                value={data.invest_sub_role}
                                onValueChange={(value) =>
                                    setData('invest_sub_role', value)
                                }
                            >
                                <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                    <SelectValue placeholder="Бағытты таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="turkistan_invest">
                                        Түркістан инвест
                                    </SelectItem>
                                    <SelectItem value="aea">АЭА</SelectItem>
                                    <SelectItem value="ia">ИА</SelectItem>
                                    <SelectItem value="prom_zone">
                                        Пром зона
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.invest_sub_role && (
                                <span className="text-sm text-red-500">
                                    {errors.invest_sub_role}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Басқару түрін таңдау */}
                    {isIspolnitel && (
                        <div className="flex flex-col gap-2">
                            <Label className="font-normal text-gray-500">
                                Басқару түрі
                            </Label>
                            <Select
                                value={data.baskarma_type}
                                onValueChange={(value) => {
                                    setData((prev) => ({
                                        ...prev,
                                        baskarma_type: value,
                                        region_id: '',
                                        position: '',
                                    }));
                                    setSelectedOblastId('');
                                }}
                            >
                                <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                    <SelectValue placeholder="Басқару түрін таңдаңыз" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="oblast">
                                        Басқармалар
                                    </SelectItem>
                                    <SelectItem value="district">
                                        Аудандық әкімдіктер
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.baskarma_type && (
                                <span className="text-sm text-red-500">
                                    {errors.baskarma_type}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Position field for oblast ispolnitel only */}
                    {isIspolnitel && data.baskarma_type === 'oblast' && (
                        <div className="flex flex-col gap-2">
                            <Label
                                htmlFor="position"
                                className="font-normal text-gray-500"
                            >
                                Лауазымы
                            </Label>
                            <Input
                                id="position"
                                value={data.position}
                                onChange={(e) =>
                                    setData('position', e.target.value)
                                }
                                className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                                placeholder="Мысалы: Басқарма басшысы"
                            />
                            {errors.position && (
                                <span className="text-sm text-red-500">
                                    {errors.position}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Oblast + District selects */}
                    {showRegionSelects && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label
                                    htmlFor="oblast"
                                    className="font-normal text-gray-500"
                                >
                                    Облыс
                                </Label>
                                <Select
                                    value={selectedOblastId}
                                    onValueChange={(value) => {
                                        setSelectedOblastId(value);
                                        // For akim, oblast alone is a valid scope;
                                        // set region_id to oblast id until a district is picked.
                                        setData(
                                            'region_id',
                                            isAkim ? value : '',
                                        );
                                    }}
                                >
                                    <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                        <SelectValue placeholder="Облысты таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {oblasts.map((oblast) => (
                                            <SelectItem
                                                key={oblast.id}
                                                value={oblast.id.toString()}
                                            >
                                                {oblast.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label
                                    htmlFor="region_id"
                                    className="font-normal text-gray-500"
                                >
                                    Аудан / Қала
                                    {isAkim && (
                                        <span className="ml-2 text-xs text-gray-400">
                                            (міндетті емес)
                                        </span>
                                    )}
                                </Label>
                                <Select
                                    value={
                                        isAkim &&
                                        data.region_id === selectedOblastId
                                            ? ''
                                            : data.region_id
                                    }
                                    onValueChange={(value) =>
                                        setData('region_id', value)
                                    }
                                    disabled={!selectedOblastId}
                                >
                                    <SelectTrigger className="h-10 w-full border-gray-200 shadow-none focus:border-[#0f1b3d] focus:ring-0">
                                        <SelectValue placeholder="Ауданды таңдаңыз" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {districts.map((district) => (
                                            <SelectItem
                                                key={district.id}
                                                value={district.id.toString()}
                                            >
                                                {district.name}
                                            </SelectItem>
                                        ))}
                                        {selectedOblastId &&
                                            districts.length === 0 && (
                                                <SelectItem
                                                    value="none"
                                                    disabled
                                                >
                                                    Аудандар жоқ
                                                </SelectItem>
                                            )}
                                    </SelectContent>
                                </Select>
                                {errors.region_id && (
                                    <span className="text-sm text-red-500">
                                        {errors.region_id}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <Label
                            htmlFor="telegram_chat_id"
                            className="font-normal text-gray-500"
                        >
                            Telegram Chat ID
                            <span className="ml-2 text-xs text-gray-400">
                                (міндетті емес)
                            </span>
                        </Label>
                        <Input
                            id="telegram_chat_id"
                            value={data.telegram_chat_id}
                            onChange={(e) =>
                                setData('telegram_chat_id', e.target.value)
                            }
                            className="h-10 border-gray-200 bg-transparent shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                            placeholder="Мысалы: 123456789"
                        />
                        {errors.telegram_chat_id && (
                            <span className="text-sm text-red-500">
                                {errors.telegram_chat_id}
                            </span>
                        )}
                        <p className="text-xs text-gray-400">
                            Пайдаланушы ботқа /start жіберіп, Chat ID алуы қажет
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            disabled={processing}
                            className="bg-[#c8a44e] text-white shadow-none hover:bg-[#b8943e]"
                        >
                            Сақтау
                        </Button>
                        <Link
                            href={users.index.url()}
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
