export type * from './auth';
export type * from './navigation';
export type * from './pagination';
export type * from './ui';

import type { Auth } from './auth';

export type SharedData = {
    name: string;
    auth: Auth;
    canModify: boolean;
    sidebarOpen: boolean;
    unreadNotificationsCount: number;
    unreadAssistantNotificationsCount: number;
    unreadChatMessagesCount: number;
    [key: string]: unknown;
};
