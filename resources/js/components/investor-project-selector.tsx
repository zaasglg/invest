import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface InvestorProjectOption {
    id: number;
    name: string;
    region_id: number | null;
    region?: {
        id: number;
        name: string;
    } | null;
}

interface RegionOption {
    id: number;
    name: string;
    type: string;
}

interface Props {
    projects: InvestorProjectOption[];
    regions: RegionOption[];
    value: number[];
    onChange: (projectIds: number[]) => void;
    error?: string;
}

export function InvestorProjectSelector({
    projects,
    regions,
    value,
    onChange,
    error,
}: Props) {
    const [search, setSearch] = useState('');
    const [regionId, setRegionId] = useState('all');

    const projectRegions = useMemo(() => {
        const usedRegionIds = new Set(
            projects
                .map((project) => project.region_id)
                .filter((id): id is number => id !== null),
        );

        return regions
            .filter(
                (region) =>
                    region.type === 'district' && usedRegionIds.has(region.id),
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'kk'));
    }, [projects, regions]);

    const filteredProjects = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase('kk');

        return projects.filter((project) => {
            const matchesRegion =
                regionId === 'all' ||
                project.region_id?.toString() === regionId;
            const matchesSearch =
                normalizedSearch === '' ||
                project.name.toLocaleLowerCase('kk').includes(normalizedSearch);

            return matchesRegion && matchesSearch;
        });
    }, [projects, regionId, search]);

    const selectedProjects = useMemo(
        () => projects.filter((project) => value.includes(project.id)),
        [projects, value],
    );

    const toggleProject = (projectId: number) => {
        onChange(
            value.includes(projectId)
                ? value.filter((id) => id !== projectId)
                : [...value, projectId],
        );
    };

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <div>
                <Label className="font-medium text-[#0f1b3d]">
                    Инвесторға қатысты жобалар
                </Label>
                <p className="mt-1 text-xs text-gray-500">
                    Бір немесе бірнеше жобаны таңдаңыз.
                </p>
            </div>

            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Жоба атауы бойынша іздеу"
                        className="bg-white pl-9"
                    />
                </div>
                <Select value={regionId} onValueChange={setRegionId}>
                    <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Аудан немесе қала" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">
                            Барлық аудан және қала
                        </SelectItem>
                        {projectRegions.map((region) => (
                            <SelectItem
                                key={region.id}
                                value={region.id.toString()}
                            >
                                {region.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {filteredProjects.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">
                        Жоба табылмады
                    </p>
                ) : (
                    filteredProjects.map((project, index) => {
                        const checked = value.includes(project.id);

                        return (
                            <label
                                key={project.id}
                                className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                                    index > 0 ? 'border-t border-gray-100' : ''
                                } ${checked ? 'bg-cyan-50/70' : ''}`}
                            >
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                        toggleProject(project.id)
                                    }
                                    className="mt-0.5"
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-[#0f1b3d]">
                                        {project.name}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-gray-500">
                                        {project.region?.name ||
                                            'Аймақ көрсетілмеген'}
                                    </span>
                                </span>
                            </label>
                        );
                    })
                )}
            </div>

            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-cyan-700">
                    Таңдалды: {selectedProjects.length}
                </p>
                {(search !== '' || regionId !== 'all') && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearch('');
                            setRegionId('all');
                        }}
                        className="text-xs text-gray-500 hover:text-[#0f1b3d]"
                    >
                        Сүзгіні тазалау
                    </button>
                )}
            </div>

            {selectedProjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedProjects.map((project) => (
                        <span
                            key={project.id}
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-xs text-cyan-800"
                        >
                            <span className="truncate">{project.name}</span>
                            <button
                                type="button"
                                onClick={() => toggleProject(project.id)}
                                aria-label={`${project.name} жобасын алып тастау`}
                                className="rounded-full p-0.5 hover:bg-cyan-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
    );
}
