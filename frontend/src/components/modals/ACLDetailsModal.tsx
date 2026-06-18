import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";

interface ACLDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    principal?: string;
    resourceType?: string;
    resourceName?: string;
    operation?: string;
    permissionType?: string;
    patternType?: string;
    host?: string;
}

export function ACLDetailsModal({
    isOpen,
    onClose,
    principal,
    resourceType,
    resourceName,
    operation,
    permissionType,
    patternType,
    host
}: ACLDetailsModalProps) {
    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span>ACL Details: {principal}</span>
                </div>
            }
            className="max-w-2xl"
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Principal</label>
                    <Input value={principal} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Type</label>
                        <Input value={resourceType} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Name</label>
                        <Input value={resourceName} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operation</label>
                        <Input value={operation} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Permission</label>
                        <Input value={permissionType} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pattern Match</label>
                        <Input value={patternType || "Literal"} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Host</label>
                        <Input value={host || "*"} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                </div>

                <Button
                    onClick={onClose}
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-semibold mt-6"
                >
                    Close
                </Button>
            </div>
        </Modal>
    );
}
