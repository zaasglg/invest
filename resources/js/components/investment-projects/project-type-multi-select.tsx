import { ChevronDown, Layers3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ProjectTypeOption {
    id: number;
    name: string;
}

interface ProjectTypeMultiSelectProps {
    id?: string;
    options: ProjectTypeOption[];
    value: string[];
    onChange: (value: string[]) => void;
    hasError?: boolean;
    placeholder?: string;
    disabled?: boolean;
}

export default function ProjectTypeMultiSelect({
    id,
    options,
    value,
    onChange,
    hasError = false,
    placeholder = 'Жоба түрлерін таңдаңыз',
    disabled = false,
}: ProjectTypeMultiSelectProps) {
    const selectedTypes = options.filter((option) =>
        value.includes(option.id.toString()),
    );

    const toggleType = (typeId: string) => {
        if (value.includes(typeId)) {
            onChange(value.filter((id) => id !== typeId));
        } else {
            onChange([...value, typeId]);
        }
    };

    return (
        <div className="space-y-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            'h-10 w-full justify-between border-gray-200 bg-white px-3 font-normal shadow-none hover:bg-gray-50',
                            hasError && 'border-red-500',
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <Layers3 className="h-4 w-4 shrink-0 text-slate-400" />
                            <span
                                className={cn(
                                    'truncate',
                                    selectedTypes.length === 0 &&
                                        'text-muted-foreground',
                                )}
                            >
                                {selectedTypes.length === 0
                                    ? placeholder
                                    : `${selectedTypes.length} түр таңдалды`}
                            </span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-xl p-1.5"
                >
                    {options.map((option) => {
                        const optionId = option.id.toString();
                        const selected = value.includes(optionId);

                        return (
                            <DropdownMenuCheckboxItem
                                key={option.id}
                                checked={selected}
                                onCheckedChange={() => toggleType(optionId)}
                                onSelect={(event) => event.preventDefault()}
                                className="rounded-lg py-2.5"
                            >
                                <span className="flex-1 truncate">
                                    {option.name}
                                </span>
                            </DropdownMenuCheckboxItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {selectedTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedTypes.map((type) => (
                        <span
                            key={type.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-100"
                        >
                            {type.name}
                            <button
                                type="button"
                                onClick={() => toggleType(type.id.toString())}
                                className="rounded p-0.5 text-sky-500 transition hover:bg-sky-100 hover:text-sky-800"
                                aria-label={`${type.name} түрін алып тастау`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
