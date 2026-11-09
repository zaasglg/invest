import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export default function InvestmentAmountInput({
    value,
    onValueChange,
    error,
}: {
    value: string;
    onValueChange: (value: string) => void;
    error?: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <Label
                htmlFor="total_investment"
                className="text-xs font-medium tracking-wide text-gray-500 uppercase"
            >
                Жалпы инвестиция <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
                <Input
                    id="total_investment"
                    aria-label="Жалпы инвестиция сомасы"
                    aria-invalid={Boolean(error)}
                    aria-required="true"
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
            <InputError message={error} />
        </div>
    );
}
