import { Link, useForm } from '@inertiajs/react';
import { Building2, KeyRound, Save, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RegionOption {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
}

export interface CompanyFormValue {
    id?: number;
    legal_form?: string;
    name?: string;
    bin?: string | null;
    registration_date?: string | null;
    region_id?: number | null;
    activity_type?: string | null;
    director_full_name?: string | null;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    legal_address?: string | null;
    actual_address?: string | null;
    status?: string;
    notes?: string | null;
    investor?: {
        id: number;
        full_name: string;
        email: string;
        phone?: string | null;
    } | null;
}

interface Props {
    company?: CompanyFormValue;
    regions: RegionOption[];
    legalForms: Record<string, string>;
    statuses: Record<string, string>;
    submitUrl: string;
    method: 'post' | 'put';
    submitLabel: string;
}

export default function CompanyForm({
    company,
    regions,
    legalForms,
    statuses,
    submitUrl,
    method,
    submitLabel,
}: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        legal_form: company?.legal_form || 'too',
        name: company?.name || '',
        bin: company?.bin || '',
        registration_date: company?.registration_date
            ? company.registration_date.slice(0, 10)
            : '',
        region_id: company?.region_id?.toString() || '',
        activity_type: company?.activity_type || '',
        director_full_name: company?.director_full_name || '',
        contact_person: company?.contact_person || '',
        phone: company?.phone || '',
        email: company?.email || '',
        website: company?.website || '',
        legal_address: company?.legal_address || '',
        actual_address: company?.actual_address || '',
        status: company?.status || 'active',
        notes: company?.notes || '',
        investor_full_name: company?.investor?.full_name || '',
        investor_email: company?.investor?.email || '',
        investor_password: '',
        investor_password_confirmation: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (method === 'put') {
            put(submitUrl);
            return;
        }

        post(submitUrl);
    };

    const fieldError = (field: keyof typeof errors) =>
        errors[field] ? (
            <p className="text-sm text-red-600">{errors[field]}</p>
        ) : null;

    return (
        <form onSubmit={submit} className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f1b3d]/5">
                        <Building2 className="h-5 w-5 text-[#0f1b3d]" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-[#0f1b3d]">
                            Заңды реквизиттер
                        </h2>
                        <p className="text-sm text-gray-500">
                            Жұлдызшамен белгіленген мәліметтер міндетті.
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="legal_form">
                            Ұйымдық-құқықтық нысаны *
                        </Label>
                        <select
                            id="legal_form"
                            value={data.legal_form}
                            onChange={(event) =>
                                setData('legal_form', event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                            {Object.entries(legalForms).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>
                        {fieldError('legal_form')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Ресми атауы *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            placeholder="Мысалы: Turkistan Green Energy"
                            autoFocus
                        />
                        <p className="text-xs text-gray-400">
                            ЖШС/ТОО сөзін атауға қайталап жазбаңыз.
                        </p>
                        {fieldError('name')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bin">БСН / БИН *</Label>
                        <Input
                            id="bin"
                            value={data.bin}
                            onChange={(event) =>
                                setData(
                                    'bin',
                                    event.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 12),
                                )
                            }
                            inputMode="numeric"
                            maxLength={12}
                            placeholder="123456789012"
                        />
                        <p className="text-xs text-gray-400">
                            Дәл 12 сан және жүйеде қайталанбауы керек.
                        </p>
                        {fieldError('bin')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="registration_date">
                            Мемлекеттік тіркелген күні *
                        </Label>
                        <Input
                            id="registration_date"
                            type="date"
                            value={data.registration_date}
                            onChange={(event) =>
                                setData('registration_date', event.target.value)
                            }
                        />
                        {fieldError('registration_date')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="region_id">Тіркелген аймағы *</Label>
                        <select
                            id="region_id"
                            value={data.region_id}
                            onChange={(event) =>
                                setData('region_id', event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                            <option value="">Аймақты таңдаңыз</option>
                            {regions.map((region) => (
                                <option key={region.id} value={region.id}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                        {fieldError('region_id')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Компания статусы *</Label>
                        <select
                            id="status"
                            value={data.status}
                            onChange={(event) =>
                                setData('status', event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                            {Object.entries(statuses).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        {fieldError('status')}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="activity_type">
                            Негізгі қызмет саласы *
                        </Label>
                        <Input
                            id="activity_type"
                            value={data.activity_type}
                            onChange={(event) =>
                                setData('activity_type', event.target.value)
                            }
                            placeholder="Мысалы: Электр энергиясын өндіру"
                        />
                        {fieldError('activity_type')}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-6">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                        <UserRound className="h-5 w-5 text-amber-800" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-[#0f1b3d]">
                            Инвестор аккаунты
                        </h2>
                        <p className="text-sm text-gray-500">
                            Әр компанияға бір міндетті аккаунт ашылады. Осы
                            аккаунт компанияның барлық жобасын автоматты көреді.
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="investor_full_name">
                            Инвестор өкілінің аты-жөні *
                        </Label>
                        <Input
                            id="investor_full_name"
                            value={data.investor_full_name}
                            onChange={(event) =>
                                setData(
                                    'investor_full_name',
                                    event.target.value,
                                )
                            }
                            autoComplete="name"
                        />
                        {fieldError('investor_full_name')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="investor_email">
                            Жүйеге кіру email-ы *
                        </Label>
                        <Input
                            id="investor_email"
                            type="email"
                            value={data.investor_email}
                            onChange={(event) =>
                                setData('investor_email', event.target.value)
                            }
                            autoComplete="username"
                            placeholder="investor@company.kz"
                        />
                        {fieldError('investor_email')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="investor_password">
                            <KeyRound className="mr-1 inline h-4 w-4" />
                            Құпия сөз {company?.investor ? '' : '*'}
                        </Label>
                        <Input
                            id="investor_password"
                            type="password"
                            value={data.investor_password}
                            onChange={(event) =>
                                setData('investor_password', event.target.value)
                            }
                            autoComplete="new-password"
                        />
                        {company?.investor && (
                            <p className="text-xs text-gray-500">
                                Өзгертпесеңіз бос қалдырыңыз.
                            </p>
                        )}
                        {fieldError('investor_password')}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="investor_password_confirmation">
                            Құпия сөзді растау {company?.investor ? '' : '*'}
                        </Label>
                        <Input
                            id="investor_password_confirmation"
                            type="password"
                            value={data.investor_password_confirmation}
                            onChange={(event) =>
                                setData(
                                    'investor_password_confirmation',
                                    event.target.value,
                                )
                            }
                            autoComplete="new-password"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-5">
                    <h2 className="font-semibold text-[#0f1b3d]">
                        Басшылық және байланыс
                    </h2>
                    <p className="text-sm text-gray-500">
                        Компаниямен жұмыс істеуге арналған жауапты байланыстар.
                    </p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="director_full_name">
                            Бірінші басшының аты-жөні *
                        </Label>
                        <Input
                            id="director_full_name"
                            value={data.director_full_name}
                            onChange={(event) =>
                                setData(
                                    'director_full_name',
                                    event.target.value,
                                )
                            }
                        />
                        {fieldError('director_full_name')}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact_person">Байланыс тұлғасы</Label>
                        <Input
                            id="contact_person"
                            value={data.contact_person}
                            onChange={(event) =>
                                setData('contact_person', event.target.value)
                            }
                        />
                        {fieldError('contact_person')}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Телефон *</Label>
                        <Input
                            id="phone"
                            value={data.phone}
                            onChange={(event) =>
                                setData('phone', event.target.value)
                            }
                            placeholder="+7 700 000 00 00"
                        />
                        {fieldError('phone')}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(event) =>
                                setData('email', event.target.value)
                            }
                            placeholder="info@company.kz"
                        />
                        {fieldError('email')}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="website">Веб-сайт</Label>
                        <Input
                            id="website"
                            type="url"
                            value={data.website}
                            onChange={(event) =>
                                setData('website', event.target.value)
                            }
                            placeholder="https://company.kz"
                        />
                        {fieldError('website')}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-5">
                    <h2 className="font-semibold text-[#0f1b3d]">
                        Мекенжай және қосымша ақпарат
                    </h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="legal_address">Заңды мекенжайы *</Label>
                        <Textarea
                            id="legal_address"
                            value={data.legal_address}
                            onChange={(event) =>
                                setData('legal_address', event.target.value)
                            }
                            rows={3}
                        />
                        {fieldError('legal_address')}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="actual_address">Нақты мекенжайы</Label>
                        <Textarea
                            id="actual_address"
                            value={data.actual_address}
                            onChange={(event) =>
                                setData('actual_address', event.target.value)
                            }
                            placeholder="Заңды мекенжайдан өзгеше болса"
                            rows={3}
                        />
                        {fieldError('actual_address')}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="notes">Ескертпе</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(event) =>
                                setData('notes', event.target.value)
                            }
                            rows={4}
                        />
                        {fieldError('notes')}
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-[#c8a44e] text-white hover:bg-[#b8943e]"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {processing ? 'Сақталуда...' : submitLabel}
                </Button>
                <Button asChild type="button" variant="outline">
                    <Link href="/companies">Болдырмау</Link>
                </Button>
            </div>
        </form>
    );
}
