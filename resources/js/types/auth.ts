export type User = {
    id: number;
    full_name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    role?: string | null;
    role_model?: {
        id: number;
        name?: string | null;
        display_name?: string | null;
    } | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
