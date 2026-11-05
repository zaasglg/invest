import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type InvestmentAmountType = 'exact' | 'estimated' | 'unknown';

export default function InvestmentAmountInput({
    planned,
    amountType,
    value,
    onTypeChange,
    onValueChange,
    typeError,
    error,
}: {
    planned: boolean;
    amountType: string;
    value: string;
    onTypeChange: (value: InvestmentAmountType) => void;
    onValueChange: (value: string) => void;
    typeError?: string;
    error?: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <Label
                htmlFor="investment_amount_type"
                className="text-xs font-medium tracking-wide text-gray-500 uppercase"
            >
                Жалпы инвестиция{' '}
                {amountType !== 'unknown' && (
                    <span className="text-red-500">*</span>
                )}
            </Label>
            <Select
                value={amountType}
                onValueChange={(value) =>
                    onTypeChange(value as InvestmentAmountType)
                }
            >
                <SelectTrigger
                    id="investment_amount_type"
                    aria-invalid={Boolean(typeError)}
                    className="h-10 w-full"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="exact">Нақты сома</SelectItem>
                    <SelectItem value="estimated">Болжамды сома</SelectItem>
                    {planned && (
                        <SelectItem value="unknown">Әзірге белгісіз</SelectItem>
                    )}
                </SelectContent>
            </Select>
            <InputError message={typeError} />
            {amountType === 'unknown' ? (
                <p className="text-xs text-slate-500">
                    Сома анықталған кезде жобаны өзгертіп енгізе аласыз.
                </p>
            ) : (
                <div className="relative">
                    <Input
                        id="total_investment"
                        aria-label="Жалпы инвестиция сомасы"
                        aria-invalid={Boolean(error)}
                        type="number"
                        min="0"
                        step="0.01"
                        value={value}
                        onChange={(event) => onValueChange(event.target.value)}
                        className="h-10 border-gray-200 bg-transparent pr-12 shadow-none focus:border-[#0f1b3d] focus-visible:ring-0"
                        placeholder="0.00"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-gray-400">
                        KZT
                    </span>
                </div>
            )}
            <InputError message={error} />
        </div>
    );
}
