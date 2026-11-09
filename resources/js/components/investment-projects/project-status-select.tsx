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
}: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    plannedOnly?: boolean;
}) {
    return (
        <div className="space-y-2 rounded-lg border border-[#e7d8ad] bg-[#fffaf0] p-4">
            <Label htmlFor="status" className="font-semibold text-[#0f1b3d]">
                Жоба мәртебесі <span className="text-red-500">*</span>
            </Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                    id="status"
                    autoFocus
                    aria-invalid={Boolean(error)}
                    className="h-10 w-full bg-white"
                >
                    <SelectValue placeholder="Мәртебені таңдаңыз" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="plan">Жоспарланған</SelectItem>
                    <SelectItem value="implementation" disabled={plannedOnly}>
                        Іске асыру
                    </SelectItem>
                    <SelectItem value="launched" disabled={plannedOnly}>
                        Іске қосылған
                    </SelectItem>
                    <SelectItem value="suspended" disabled={plannedOnly}>
                        Тоқтатылған
                    </SelectItem>
                </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-slate-500">
                {plannedOnly
                    ? 'Жаңа жоба жоспарланған мәртебеден басталады. Кейін «Өзгерту» бетінде мәртебесін ауыстыра аласыз. Сүйемелдеуге беру — қосымша мүмкіндік.'
                    : value === 'plan'
                      ? 'Жоба атауын, ауданын, инвестиция сомасын және инвестор тарту кезеңін көрсетіңіз. Мәртебені осы жерден өзгертуге болады; сүйемелдеуге беру міндетті емес.'
                      : 'Осы мәртебеде компанияны, жоба түрін және инвестиция сомасын толық көрсетіңіз.'}
            </p>
            <InputError message={error} />
        </div>
    );
}
