import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

export const PageLoader = () => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <RefreshCw className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
                </div>
                <p className="text-xl font-medium text-slate-500 dark:text-slate-400 animate-pulse">
                    Loading.....
                </p>
            </div>
        </div>
    );
};

export const ComponentLoader = () => {
    return (
        <div className="flex items-center justify-center p-8 w-full">
            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
        </div>
    );
};
