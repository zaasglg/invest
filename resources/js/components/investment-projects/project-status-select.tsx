import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function ProjectStatusSelect({
    value,
    onChange,
    error,
    plannedOnly = false,
    operationalOnly = false,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    plannedOnly?: boolean;
    operationalOnly?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2 rounded-lg border border-[#e7d8ad] bg-[#fffaf0] p-4">
            <Label htmlFor="status" className="font-semibold text-[#0f1b3d]">
                Жоба мәртебесі <span className="text-red-500">*</span>
            </Label>
            <Select value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger
                    id="status"
                    autoFocus
                    aria-invalid={Boolean(error)}
                    className="h-10 w-full bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                    <SelectValue placeholder="Мәртебені таңдаңыз" />
                </SelectTrigger>
                <SelectContent>
                    {!operationalOnly && (
                        <SelectItem value="plan">Жоспарланған</SelectItem>
                    )}
                    {!plannedOnly && (
                        <>
                            <SelectItem value="implementation">
                                Іске асыру
                            </SelectItem>
                            <SelectItem value="launched">
                                Іске қосылған
                            </SelectItem>
                            <SelectItem value="suspended">
                                Тоқтатылған
                            </SelectItem>
                        </>
                    )}
                </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-slate-500">
                {operationalOnly
                    ? 'Сүйемелдеу бағытында тек іске асырылып жатқан, іске қосылған немесе тоқтатылған жобалар жүргізіледі.'
                    : plannedOnly && disabled
                      ? 'Жоспарланған мәртебе бекітілген. Жоба қабылданған кезде жүйе оны сүйемелдеу бағытына автоматты өткізеді.'
                      : plannedOnly
                        ? 'Бұл бағытта инвестор тарту кезеңіндегі жоспарланған жобалар жүргізіледі.'
                        : value === 'plan'
                          ? 'Жоба атауын, ауданын, инвестиция сомасын және инвестор тарту кезеңін көрсетіңіз. Мәртебені осы жерден өзгертуге болады; сүйемелдеуге беру міндетті емес.'
                          : 'Осы мәртебеде компанияны, жоба түрін және инвестиция сомасын толық көрсетіңіз.'}
            </p>
            <InputError message={error} />
        </div>
    );
}
