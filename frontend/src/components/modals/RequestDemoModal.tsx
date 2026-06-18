import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../../contexts/NotificationContext";
import Check from "lucide-react/dist/esm/icons/check";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import User from "lucide-react/dist/esm/icons/user";
import Mail from "lucide-react/dist/esm/icons/mail";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Users from "lucide-react/dist/esm/icons/users";
import { cn } from "../../lib/utils";

interface RequestDemoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RequestDemoModal({ isOpen, onClose }: RequestDemoModalProps) {
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        companyName: "",
        jobTitle: "",
        companySize: "",
        useCase: "",
        demoType: "live", // Default to live
        consent: false
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";

        if (!formData.email.trim()) {
            newErrors.email = "Work Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (!formData.companyName.trim()) newErrors.companyName = "Company Name is required";
        if (!formData.jobTitle.trim()) newErrors.jobTitle = "Job Title is required";
        if (!formData.companySize) newErrors.companySize = "Company Size is required";

        if (!formData.consent) newErrors.consent = "You must agree to be contacted";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            toast.success("Thank you! Our team will contact you shortly.", {
                duration: 5000,
            });

            // On success, we don't reset isSubmitting, we just reset data and close
            setFormData({
                fullName: "",
                email: "",
                companyName: "",
                jobTitle: "",
                companySize: "",
                useCase: "",
                demoType: "live",
                consent: false
            });
            onClose();
        } catch (error) {
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
                    <Briefcase className="h-5 w-5 text-primary" />
                    <span>Request a Personalized Demo</span>
                </div>
            }
            className="max-w-2xl"
        >
            <div className="space-y-1 mb-6 -mt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tell us a bit about yourself and we’ll tailor the demo to your needs.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            placeholder="John Doe"
                            className={cn("h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800", errors.fullName && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            Work Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="john@company.com"
                            className={cn("h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800", errors.email && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            Company Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="companyName"
                            value={formData.companyName}
                            onChange={handleInputChange}
                            placeholder="Acme Inc."
                            className={cn("h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800", errors.companyName && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {errors.companyName && <p className="text-xs text-red-500 font-medium">{errors.companyName}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            Job Title <span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="jobTitle"
                            value={formData.jobTitle}
                            onChange={handleInputChange}
                            placeholder="DevOps Engineer"
                            className={cn("h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800", errors.jobTitle && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {errors.jobTitle && <p className="text-xs text-red-500 font-medium">{errors.jobTitle}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Company Size <span className="text-red-500">*</span>
                    </label>
                    <Select
                        value={formData.companySize}
                        onChange={(val) => handleSelectChange("companySize", val)}
                        options={[
                            { label: "1-10 employees", value: "1-10" },
                            { label: "11-50 employees", value: "11-50" },
                            { label: "51-200 employees", value: "51-200" },
                            { label: "201-1000 employees", value: "201-1000" },
                            { label: "1000+ employees", value: "1000+" }
                        ]}
                        placeholder="Select company size"
                        className={cn("bg-slate-50 dark:bg-slate-900", errors.companySize && "border-red-500 ring-red-500")}
                    />
                    {errors.companySize && <p className="text-xs text-red-500 font-medium">{errors.companySize}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        What are you looking to manage? (Optional)
                    </label>
                    <textarea
                        name="useCase"
                        rows={3}
                        value={formData.useCase}
                        onChange={handleInputChange}
                        className="flex min-h-[80px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        placeholder="Tell us about your use case..."
                    />
                </div>

                <div className="space-y-3 pt-2">
                    <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">Preferred Demo Type</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer group">
                            <input
                                type="radio"
                                name="demoType"
                                value="live"
                                checked={formData.demoType === "live"}
                                onChange={handleInputChange}
                                className="text-primary focus:ring-primary accent-primary"
                            />
                            <span className="text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Live Demo</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer group">
                            <input
                                type="radio"
                                name="demoType"
                                value="recorded"
                                checked={formData.demoType === "recorded"}
                                onChange={handleInputChange}
                                className="text-primary focus:ring-primary accent-primary"
                            />
                            <span className="text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Recorded Demo</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <label className="flex items-start gap-2 text-sm cursor-pointer group">
                        <div className="relative flex items-center mt-0.5">
                            <input
                                type="checkbox"
                                name="consent"
                                checked={formData.consent}
                                onChange={handleCheckboxChange}
                                className="peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 dark:border-slate-600 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-white dark:bg-slate-900 checked:bg-primary checked:border-primary"
                            />
                            <Check className="w-3 h-3 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100" />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs leading-tight group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            I agree to receive communications from Alephys regarding this demo request and related products.
                        </span>
                    </label>
                    {errors.consent && <p className="text-xs text-red-500 font-medium">{errors.consent}</p>}
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <Button type="button" variant="cancel" onClick={onClose} disabled={isSubmitting} className="h-12 rounded-xl border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-md shadow-primary/20">
                        Request Demo
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
