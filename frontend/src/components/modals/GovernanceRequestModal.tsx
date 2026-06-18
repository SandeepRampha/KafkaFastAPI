import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../../contexts/NotificationContext";
import { FileText, Shield, ChevronRight, Info } from "lucide-react";
import governanceService, { GovernanceResourceType, GovernanceOperation } from "../../services/governanceService";

interface GovernanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GovernanceRequestModal({ isOpen, onClose, onSuccess }: GovernanceRequestModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [resourceType, setResourceType] = useState<GovernanceResourceType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [topicData, setTopicData] = useState({
    name: "",
    partitions: 1,
    replication: 3,
    cleanup_policy: "delete"
  });

  const [aclData, setAclData] = useState({
    resource_type: "TOPIC",
    resource_name: "",
    principal: "User:*",
    operation: "READ",
    permission_type: "ALLOW",
    host: "*"
  });

  const resetForm = () => {
    setStep(1);
    setResourceType(null);
    setTopicData({ name: "", partitions: 1, replication: 3, cleanup_policy: "delete" });
    setAclData({ resource_type: "TOPIC", resource_name: "", principal: "User:*", operation: "READ", permission_type: "ALLOW", host: "*" });
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!resourceType) return;
    setIsSubmitting(true);
    try {
      const payload = resourceType === GovernanceResourceType.TOPIC
        ? { ...topicData }
        : { ...aclData, principal: aclData.principal.replace(/\s+/g, "") };

      const resourceName = resourceType === GovernanceResourceType.TOPIC
        ? topicData.name
        : aclData.resource_name;

      await governanceService.createRequest({
        resource_type: resourceType,
        resource_name: resourceName,
        operation: GovernanceOperation.CREATE,
        payload: payload,
        cluster_id: "default"
      });

      toast.success("Governance Request Submitted", "Your request is now awaiting review by a Data Steward.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Submission Failed", error.response?.data?.detail || "Could not submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span>New Governance Request</span>
        </div>
      }
      className="max-w-xl"
    >
      <div className="flex flex-col min-h-[400px]">
        {step === 1 ? (
          <div className="flex-1 space-y-6 py-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Select Resource Type</h3>
              <p className="text-sm text-slate-500">Pick the type of Kafka resource you are requesting.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => { setResourceType(GovernanceResourceType.TOPIC); setStep(2); }}
                className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-primary/50 hover:bg-primary/[0.02] rounded-3xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 dark:text-slate-100">Kafka Topic</p>
                    <p className="text-xs text-slate-500 italic">Create or alter data streams</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => { setResourceType(GovernanceResourceType.ACL); setStep(2); }}
                className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-primary/50 hover:bg-primary/[0.02] rounded-3xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-violet-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <Shield className="h-6 w-6 text-violet-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 dark:text-slate-100">Access Control (ACL)</p>
                    <p className="text-xs text-slate-500 italic">Grant permissions to principals</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-6 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => setStep(1)}
              className="text-xs font-bold text-primary hover:underline"
            >
              ← Back to type selection
            </button>

            {resourceType === GovernanceResourceType.TOPIC ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    Topic Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={topicData.name}
                    onChange={(e) => setTopicData({ ...topicData, name: e.target.value })}
                    placeholder="e.g. transactions-v1"
                    className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Partitions</label>
                    <Input
                      type="number"
                      value={topicData.partitions}
                      onChange={(e) => setTopicData({ ...topicData, partitions: parseInt(e.target.value) })}
                      className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Replication</label>
                    <Input
                      type="number"
                      value={topicData.replication}
                      onChange={(e) => setTopicData({ ...topicData, replication: parseInt(e.target.value) })}
                      className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Resource Name</label>
                  <Input
                    value={aclData.resource_name}
                    onChange={(e) => setAclData({ ...aclData, resource_name: e.target.value })}
                    placeholder="e.g. my-topic-*"
                    className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Principal</label>
                    <Input
                      value={aclData.principal}
                      onChange={(e) => setAclData({ ...aclData, principal: e.target.value })}
                      className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Operation</label>
                    <Select
                      value={aclData.operation}
                      onChange={(val) => setAclData({ ...aclData, operation: val })}
                      options={[
                        { label: "READ", value: "READ" },
                        { label: "WRITE", value: "WRITE" },
                        { label: "ALL", value: "ALL" }
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3 mb-6">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  This request will be sent to the **Data Stewards** for review before it can be implemented on the cluster.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="cancel"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-2xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={!resourceType || (resourceType === GovernanceResourceType.TOPIC ? !topicData.name : !aclData.resource_name)}
                  className="flex-1 h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
