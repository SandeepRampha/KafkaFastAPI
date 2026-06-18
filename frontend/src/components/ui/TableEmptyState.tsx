import { motion } from "framer-motion";
import Inbox from "lucide-react/dist/esm/icons/inbox";

interface TableEmptyStateProps {
    colspan: number;
    title?: string;
    description?: string;
}

export function TableEmptyState({
    colspan,
    title = "No results found",
    description = "Try adjusting your search or filters to find what you're looking for."
}: TableEmptyStateProps) {
    return (
        <tr>
            <td colSpan={colspan} className="h-96 text-center border-none">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center p-8 space-y-3"
                >
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-2">
                        <Inbox className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {description}
                        </p>
                    </div>
                </motion.div>
            </td>
        </tr>
    );
}
