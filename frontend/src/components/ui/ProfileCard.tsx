import { useState, type ComponentProps } from "react";
import { cn } from "../../lib/utils";
import Building2 from "lucide-react/dist/esm/icons/building-2";

export interface ProfileCardProps extends ComponentProps<"div"> {
    username: string;
    role: string;
    avatarUrl?: string;
    orgLogoUrl?: string;
    orgName?: string;
    onOrgClick?: () => void;
}

export function ProfileCard({
    username,
    role,
    avatarUrl,
    orgLogoUrl,
    orgName = "Organization",
    onOrgClick,
    className,
    ...props
}: ProfileCardProps) {
    const [imageError, setImageError] = useState(false);
    const [orgLogoError, setOrgLogoError] = useState(false);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div
            className={cn(
                "group flex items-center gap-3 pl-1.5 pr-4 py-1.5",
                "cursor-pointer",
                className
            )}
            {...props}
        >
            {/* Organization Logo Section */}
            <div
                className="flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                onClick={(e) => {
                    if (onOrgClick) {
                        e.stopPropagation();
                        onOrgClick();
                    }
                }}
                title={orgName}
            >
                {orgLogoUrl && !orgLogoError ? (
                    <img
                        src={orgLogoUrl}
                        alt={orgName}
                        className="h-10 w-auto object-contain max-w-[80px] rounded-lg mix-blend-multiply dark:mix-blend-normal"
                        onError={() => setOrgLogoError(true)}
                    />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground/70">
                        <Building2 className="w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-border/100 rotate-12 mx-0.5" />

            {/* User Info Section */}
            <div className="flex flex-col items-start ml-1">
                <span data-testid="user-name" className="text-sm font-bold text-foreground/90 leading-none tracking-tight">
                    {username}
                </span>
                <span data-testid="user-role" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                    {role}
                </span>

            </div>

            {/* Avatar Section */}
            <div className="relative">
                <div
                    data-testid="profile-icon"
                    className={cn(
                        "h-9 w-9 rounded-full ring-2 ring-background flex items-center justify-center overflow-hidden",
                        "bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground"
                    )}
                >
                    {avatarUrl && !imageError ? (
                        <img
                            src={avatarUrl}
                            alt={username}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <span className="text-xs font-bold tracking-tight">
                            {getInitials(username)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
