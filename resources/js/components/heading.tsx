export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header className={variant === 'small' ? '' : 'mb-8 space-y-1'}>
            <h2
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-bold text-[#0f1b3d]'
                        : 'text-xl font-bold tracking-tight text-[#0f1b3d]'
                }
            >
                {title}
            </h2>
            {description && (
                <p className="text-sm text-gray-500">{description}</p>
            )}
        </header>
    );
}
