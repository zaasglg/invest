import { Link, usePage } from '@inertiajs/react';
import { Building2, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { SharedData } from '@/types';

export interface CompanyOption {
    id: number;
    name: string;
    display_name: string;
    bin: string | null;
    legal_form_label: string;
    status: string;
    status_label: string;
    is_profile_complete: boolean;
}

interface Props {
    companies: CompanyOption[];
    value: string;
    onValueChange: (value: string) => void;
    error?: string;
}

export default function CompanySelect({
    companies,
    value,
    onValueChange,
    error,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const canCreateCompany = auth.user?.role_model?.name === 'superadmin';
    const [search, setSearch] = useState('');
    const selectedCompany = companies.find(
        (company) => company.id.toString() === value,
    );
    const filteredCompanies = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('kk-KZ');

        if (!query) {
            return companies;
        }

        return companies.filter((company) =>
            [company.display_name, company.name, company.bin || ''].some(
                (field) => field.toLocaleLowerCase('kk-KZ').includes(query),
            ),
        );
    }, [companies, search]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
                <Label
                    htmlFor="company_id"
                    className="text-xs font-medium tracking-wide text-gray-500 uppercase"
                >
                    Компания <span className="text-red-500">*</span>
                </Label>
                {canCreateCompany && (
                    <Link
                        href="/companies/create"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#a9842f] hover:underline"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Жаңа компания
                    </Link>
                )}
            </div>

            {companies.length > 8 && (
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Атауы немесе БСН/БИН бойынша іздеу"
                        className="h-9 pl-9"
                    />
                </div>
            )}

            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger
                    id="company_id"
                    className={error ? 'border-red-500' : ''}
                >
                    <SelectValue placeholder="Компанияны таңдаңыз" />
                </SelectTrigger>
                <SelectContent>
                    {filteredCompanies.map((company) => (
                        <SelectItem
                            key={company.id}
                            value={company.id.toString()}
                        >
                            {company.display_name}
                            {company.bin ? ` · ${company.bin}` : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {selectedCompany && (
                <div className="flex items-start gap-3 rounded-lg border border-[#e7d8ad] bg-[#fffaf0] p-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#a9842f]" />
                    <div className="min-w-0 text-xs">
                        <p className="font-semibold text-[#0f1b3d]">
                            {selectedCompany.display_name}
                        </p>
                        <p className="mt-0.5 text-gray-500">
                            БСН/БИН: {selectedCompany.bin || 'толтырылмаған'} ·{' '}
                            {selectedCompany.legal_form_label}
                        </p>
                        {!selectedCompany.is_profile_complete && (
                            <p className="mt-1 font-medium text-amber-700">
                                Бұл ескі компанияның карточкасы толық
                                толтырылмаған.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {filteredCompanies.length === 0 && (
                <p className="text-xs text-amber-700">
                    Сәйкес компания табылмады. Алдымен жаңа компания ашыңыз.
                </p>
            )}
            {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
    );
}
