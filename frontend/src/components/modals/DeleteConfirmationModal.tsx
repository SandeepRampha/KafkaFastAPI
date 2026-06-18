import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    itemName: string;
    itemType: string;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, itemType, description }: DeleteConfirmationModalProps & { description?: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        try {
            setIsDeleting(true);
            await onConfirm();
        } catch (error) {
            console.error("Delete confirmation failed:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isSubmitting={isDeleting}
            title={
                <div className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    <span>Delete {itemType}</span>
                </div>
            }
            className="max-w-md"
        >
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="space-y-2">
                    <p className="text-lg font-medium text-slate-800 dark:text-white leading-relaxed">
                        Delete <span className="text-red-600 font-bold break-all">{itemName}</span>?
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-300 px-4">
                        {description || "This action is permanent and cannot be undone."}
                    </p>
                </div>

                <div className="flex items-center justify-center gap-4 w-full mt-4">
                    <Button
                        variant="cancel"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 h-12 rounded-xl font-bold transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        isLoading={isDeleting}
                        disabled={isDeleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl font-bold shadow-lg shadow-red-500/20"
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
