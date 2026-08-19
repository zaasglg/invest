import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';

import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    autoComplete: 'current-password' | 'new-password';
    autoFocus?: boolean;
    error?: string;
    id: string;
    label: string;
    name: string;
    placeholder: string;
    tabIndex?: number;
};

export default function AuthPasswordField({
    autoComplete,
    autoFocus = false,
    error,
    id,
    label,
    name,
    placeholder,
    tabIndex,
}: Props) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="grid gap-2">
            <Label htmlFor={id} className="text-sm font-medium text-slate-200">
                {label}
            </Label>
            <div className="relative">
                <LockKeyhole
                    className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500"
                    strokeWidth={1.8}
                />
                <Input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    name={name}
                    required
                    autoFocus={autoFocus}
                    tabIndex={tabIndex}
                    autoComplete={autoComplete}
                    aria-invalid={Boolean(error)}
                    placeholder={placeholder}
                    className="h-12 rounded-lg border-white/[0.08] bg-white/[0.03] pr-12 pl-11 text-white shadow-none placeholder:text-slate-600 hover:border-white/[0.16] focus-visible:border-cyan-300/50 focus-visible:ring-cyan-300/10"
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setVisible((value) => !value)}
                    aria-label={
                        visible ? 'Құпиясөзді жасыру' : 'Құпиясөзді көрсету'
                    }
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-300"
                >
                    {visible ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                </button>
            </div>
            <InputError message={error} />
        </div>
    );
}
