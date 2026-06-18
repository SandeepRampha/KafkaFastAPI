import { motion, AnimatePresence } from "framer-motion";
import Sun from "lucide-react/dist/esm/icons/sun";
import Moon from "lucide-react/dist/esm/icons/moon";
import { useTheme } from "../theme-provider";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border bg-accent hover:bg-card text-foreground transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-primary/10 relative overflow-visible h-10 w-10 flex items-center justify-center group"
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                {theme === "light" ? (
                    <motion.div
                        key="moon"
                        initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{
                            opacity: 0,
                            scale: 1.5,
                            rotate: 45,
                            transition: { duration: 0.4 }
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                        <Moon className="h-5 w-5 text-slate-700" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{
                            opacity: 0,
                            scale: 0.5,
                            rotate: -90,
                            transition: { duration: 0.4 }
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                        <Sun className="h-5 w-5 text-yellow-400" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Tooltip */}
            <div className="absolute top-[calc(100%+10px)] right-0 bg-popover text-popover-foreground border border-border/10 shadow-xl px-3 py-1.5 rounded-md text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[50]">
                {theme === "light" ? "Switch dark mode" : "Switch light mode"}
                {/* Arrow for tooltip */}
                <div className="absolute bottom-full right-3 border-4 border-transparent border-b-popover" />
            </div>
        </button>
    );
}
