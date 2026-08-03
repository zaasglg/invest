export type User = {
    id: number;
    full_name: string;
    email: string;
    avatar?: string;
    avatar_url?: string | null;
    role?: string | null;
    region_id?: number | null;
    telegram_chat_id?: string | null;
    baskarma_type?: 'district' | 'oblast' | 'additional' | null;
    role_model?: {
        id: number;
        name?: string | null;
        display_name?: string | null;
    } | null;
    invest_sub_role?: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
