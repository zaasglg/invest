interface ProjectTypeLike {
    id: number;
    name: string;
}

interface ProjectWithTypes {
    project_type?: ProjectTypeLike | null;
    project_types?: ProjectTypeLike[] | null;
}

export function formatProjectTypeNames(
    project: ProjectWithTypes,
    fallback = '—',
): string {
    const names = project.project_types?.map((type) => type.name) ?? [];

    if (names.length > 0) {
        return names.join(', ');
    }

    return project.project_type?.name ?? fallback;
}
