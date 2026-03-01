import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <>
            <Avatar className="h-11 w-11 overflow-hidden rounded-full border-2 border-white/20">
                <AvatarImage src={user.avatar_url || user.avatar} alt={user.full_name} className="object-cover h-full w-full rounded-full" />
                <AvatarFallback className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {getInitials(user.full_name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">{user.full_name}</span>
                {showEmail && (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
