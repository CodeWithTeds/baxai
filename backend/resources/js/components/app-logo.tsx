import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-[10px]">
                <AppLogoIcon className="size-8" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    NUYDA ENTERPRISE
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    Admin panel
                </span>
            </div>
        </>
    );
}
