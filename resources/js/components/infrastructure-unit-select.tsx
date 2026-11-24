import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    getInfrastructureField,
    getInfrastructureUnit,
    getInfrastructureUnits,
} from '@/lib/infrastructure';
import type { ProjectInfrastructureKey } from '@/lib/infrastructure';

export default function InfrastructureUnitSelect({
    resource,
    value,
    onValueChange,
    id,
    error,
    disabled = false,
    className,
}: {
    resource: ProjectInfrastructureKey;
    value?: string;
    onValueChange: (unit: string) => void;
    id: string;
    error?: string;
    disabled?: boolean;
    className?: string;
}) {
    const field = getInfrastructureField(resource);

    return (
        <div className={className}>
            <Label
                htmlFor={id}
                className="mb-1.5 block text-xs text-muted-foreground"
            >
                Өлшем бірлігі
            </Label>
            <Select
                disabled={disabled}
                onValueChange={onValueChange}
                value={getInfrastructureUnit(resource, value).code}
            >
                <SelectTrigger
                    id={id}
                    aria-label={`${field?.label ?? resource}: өлшем бірлігі`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {getInfrastructureUnits(resource).map((unit) => (
                            <SelectItem key={unit.code} value={unit.code}>
                                {unit.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            <InputError id={`${id}-error`} message={error} className="mt-1" />
        </div>
    );
}
