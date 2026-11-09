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
import { Textarea } from '@/components/ui/textarea';

export interface AttractionStageDetailsValue {
    attraction_handover_to_id: string;
    attraction_decline_reason: string;
    attraction_resume_on: string;
}

interface Props {
    stage: string;
    value: AttractionStageDetailsValue;
    onChange: (field: keyof AttractionStageDetailsValue, value: string) => void;
    users: { id: number; full_name: string }[];
    errors?: Partial<Record<string, string>>;
}

export default function AttractionStageDetailsForm({
    stage,
    value,
    onChange,
    users,
    errors = {},
}: Props) {
    if (!['handover', 'declined', 'paused'].includes(stage)) return null;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
            <h3 className="mb-4 font-semibold text-[#0f1b3d]">
                {stage === 'handover'
                    ? 'Сүйемелдеуге беру'
                    : stage === 'declined'
                      ? 'Инвестордың бас тартуы'
                      : 'Уақытша тоқтату'}
            </h3>
            {stage === 'handover' && (
                <div
                    data-form-field="attraction_handover_to_id"
                    className="space-y-2"
                >
                    <Label htmlFor="attraction_handover_to_id">
                        Қабылдайтын жауапты адам{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={value.attraction_handover_to_id}
                        onValueChange={(selected) =>
                            onChange('attraction_handover_to_id', selected)
                        }
                    >
                        <SelectTrigger
                            id="attraction_handover_to_id"
                            aria-invalid={Boolean(
                                errors.attraction_handover_to_id,
                            )}
                            aria-describedby={
                                errors.attraction_handover_to_id
                                    ? 'attraction-handover-error'
                                    : undefined
                            }
                            className="h-auto min-h-10 w-full text-left [&>span]:whitespace-normal"
                        >
                            <SelectValue placeholder="Қабылдайтын адамды таңдаңыз" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map((user) => (
                                <SelectItem
                                    key={user.id}
                                    value={user.id.toString()}
                                >
                                    {user.full_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError
                        id="attraction-handover-error"
                        message={errors.attraction_handover_to_id}
                    />
                    <p className="text-xs leading-relaxed text-gray-500">
                        Таңдалған адам жобаның бетінде қабылдауды растайды. Жоба
                        қабылданғанға дейін «Сүйемелдеуге берілді» деп
                        есептелмейді.
                    </p>
                    {users.length === 0 && (
                        <p className="text-xs text-amber-700">
                            Қабылдайтын адам табылмады. Алдымен жобаға куратор
                            бекітіңіз.
                        </p>
                    )}
                </div>
            )}
            {stage === 'declined' && (
                <div
                    data-form-field="attraction_decline_reason"
                    className="space-y-2"
                >
                    <Label htmlFor="attraction_decline_reason">
                        Бас тарту себебі <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        id="attraction_decline_reason"
                        value={value.attraction_decline_reason}
                        onChange={(event) =>
                            onChange(
                                'attraction_decline_reason',
                                event.target.value,
                            )
                        }
                        aria-invalid={Boolean(errors.attraction_decline_reason)}
                        aria-describedby={
                            errors.attraction_decline_reason
                                ? 'attraction-decline-error'
                                : undefined
                        }
                        className="min-h-28"
                        placeholder="Инвестордың жобадан бас тарту себебін жазыңыз"
                    />
                    <InputError
                        id="attraction-decline-error"
                        message={errors.attraction_decline_reason}
                    />
                </div>
            )}
            {stage === 'paused' && (
                <div
                    data-form-field="attraction_resume_on"
                    className="space-y-2"
                >
                    <Label htmlFor="attraction_resume_on">
                        Қайта байланысу күні{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="attraction_resume_on"
                        type="date"
                        value={value.attraction_resume_on}
                        onChange={(event) =>
                            onChange('attraction_resume_on', event.target.value)
                        }
                        aria-invalid={Boolean(errors.attraction_resume_on)}
                        aria-describedby={
                            errors.attraction_resume_on
                                ? 'attraction-resume-error'
                                : undefined
                        }
                        className="h-10"
                    />
                    <InputError
                        id="attraction-resume-error"
                        message={errors.attraction_resume_on}
                    />
                    <p className="text-xs leading-relaxed text-gray-500">
                        Уақытша тоқтатылған жоба бойынша жұмысты қайта қарау
                        немесе инвестормен байланысу күнін белгілеңіз.
                    </p>
                </div>
            )}
        </div>
    );
}
