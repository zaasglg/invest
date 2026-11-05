import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ATTRACTION_STAGES } from '@/lib/project-attraction';

export default function AttractionStageSelect({
    value,
    onChange,
    error,
}: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <div
            data-form-field="attraction_stage"
            className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2"
        >
            <Label
                htmlFor="attraction_stage"
                className="mb-2 block font-semibold text-[#0f1b3d]"
            >
                Инвестор тарту кезеңі <span className="text-red-500">*</span>
            </Label>
            <p className="mb-4 text-sm text-gray-500">
                Жоспарланған жобаның инвестормен жұмыс істеу кезеңін таңдаңыз.
            </p>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                    id="attraction_stage"
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error ? 'attraction-stage-error' : undefined
                    }
                    className="h-auto min-h-10 w-full border-gray-200 text-left shadow-none [&>span]:line-clamp-none [&>span]:whitespace-normal"
                >
                    <SelectValue placeholder="Инвестор тарту кезеңін таңдаңыз" />
                </SelectTrigger>
                <SelectContent>
                    {ATTRACTION_STAGES.map((stage, index) => (
                        <SelectItem key={stage.value} value={stage.value}>
                            {index + 1}. {stage.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <InputError
                id="attraction-stage-error"
                message={error}
                className="mt-2"
            />
        </div>
    );
}
