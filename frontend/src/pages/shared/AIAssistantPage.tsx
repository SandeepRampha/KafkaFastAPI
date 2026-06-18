import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { useAuth } from "../../contexts/AuthContext";
import { AIWorkspace } from "../../components/aiWorkspace/AIWorkspace";

export default function AIAssistantPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      role={user?.role || "user"}
      title="AI Workspace"
      description="Deep Analysis, Persistent Sessions & Actionable Insights"
    >
      <AIWorkspace />
    </DashboardLayout>
  );
}
