import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../../contexts/NotificationContext";
import Shield from "lucide-react/dist/esm/icons/shield";
import { createACL } from "../../services/adminService";
import { cn } from "../../lib/utils";

interface CreateACLModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateACLModal({ isOpen, onClose, onSuccess }: CreateACLModalProps) {
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);

    const [formData, setFormData] = useState({
        principal: "User:",
        resourceType: "Topic",
        resourceName: "",
        patternType: "Literal",
        host: "*",
        operation: "Read",
        permission: "Allow"
    });

    const errors = {
        principal: !formData.principal?.trim() ? "Principal Identity is required" : "",
        resourceName: !formData.resourceName?.trim() ? "Resource Name is required" : "",
    };

    const isFormValid = !Object.values(errors).some(err => err);

    const hasError = (field: keyof typeof errors) => {
        return !!errors[field] && (touched[field] || submitAttempted);
    };

    const handleBlur = (field: keyof typeof touched) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const resetForm = () => {
        setFormData({
            principal: "User:",
            resourceType: "Topic",
            resourceName: "",
            patternType: "Literal",
            host: "*",
            operation: "Read",
            permission: "Allow"
        });
        setIsSubmitting(false);
        setTouched({});
        setSubmitAttempted(false);
    };

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setSubmitAttempted(true);
        // Validate required fields
        if (!isFormValid) {
            toast.error("Please fill in all required fields correctly.");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await createACL({
                resource_type: formData.resourceType.toUpperCase(),
                resource_name: formData.resourceName,
                principal: formData.principal,
                operation: formData.operation,
                permission_type: formData.permission.toUpperCase(),
                pattern_type: formData.patternType.toUpperCase(),
                host: formData.host,
                cluster: "default"
            });

            // Show success message from backend or default
            const message = response.detail || "ACL request submitted successfully!";
            toast.success(message, { duration: 4000 });

            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || "Failed to submit ACL request";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isSubmitting={isSubmitting}
            title={
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span>Create New ACL Request</span>
                </div>
            }
            className="max-w-2xl"
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Principal Identity <span className="text-red-500">*</span></label>
                    <Input
                        name="principal"
                        value={formData.principal}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur("principal")}
                        placeholder="e.g. User:alice"
                        className={cn(
                            "h-11 bg-slate-50 dark:bg-slate-900",
                            hasError("principal") ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                        )}
                    />
                    {hasError("principal") && <p className="text-sm text-red-500">{errors.principal}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Type <span className="text-red-500">*</span></label>
                        <Select
                            value={formData.resourceType}
                            onChange={(val) => handleSelectChange("resourceType", val)}
                            options={["Topic", "Group", "Cluster", "Transactional ID"].map(s => ({ value: s, label: s }))}
                            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Name <span className="text-red-500">*</span></label>
                        <Input
                            name="resourceName"
                            value={formData.resourceName}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur("resourceName")}
                            placeholder="e.g. my-topic or *"
                            className={cn(
                                "h-11 bg-slate-50 dark:bg-slate-900",
                                hasError("resourceName") ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                            )}
                        />
                        {hasError("resourceName") && <p className="text-sm text-red-500">{errors.resourceName}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pattern Match <span className="text-red-500">*</span></label>
                        <Select
                            value={formData.patternType}
                            onChange={(val) => handleSelectChange("patternType", val)}
                            options={["Literal", "Prefixed"].map(s => ({ value: s, label: s }))}
                            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operation <span className="text-red-500">*</span></label>
                        <Select
                            value={formData.operation}
                            onChange={(val) => handleSelectChange("operation", val)}
                            options={[
                                "All", "Read", "Write", "Create", "Delete", "Alter", "Describe",
                                "AlterConfigs", "DescribeConfigs", "ClusterAction", "IdempotentWrite"
                            ].map(s => ({ value: s.toUpperCase(), label: s }))}
                            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            dropdownPosition="top"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Permission Policy <span className="text-red-500">*</span></label>
                        <Select
                            value={formData.permission}
                            onChange={(val) => handleSelectChange("permission", val)}
                            options={["Allow", "Deny"].map(s => ({ value: s, label: s }))}
                            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            dropdownPosition="top"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Host <span className="text-red-500">*</span></label>
                        <Input
                            name="host"
                            value={formData.host}
                            onChange={handleInputChange}
                            placeholder="*"
                            className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <Button
                        variant="cancel"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl transition-all font-semibold"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={isSubmitting || !isFormValid}
                        className={cn(
                            "flex-1 h-12 rounded-xl font-semibold shadow-sm transition-all",
                            (!isFormValid || isSubmitting)
                                ? "bg-primary/50 text-white/70 cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-white"
                        )}
                    >
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
