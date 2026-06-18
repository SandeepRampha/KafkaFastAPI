import { useState, useMemo } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";
import Database from "lucide-react/dist/esm/icons/database";
import Shield from "lucide-react/dist/esm/icons/shield";
import Clock from "lucide-react/dist/esm/icons/clock";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Bot from "lucide-react/dist/esm/icons/bot";
import Zap from "lucide-react/dist/esm/icons/zap";
import Plus from "lucide-react/dist/esm/icons/plus";
import Search from "lucide-react/dist/esm/icons/search";
import { useNavigate } from "react-router-dom";
import { useMyRequests } from "../../hooks/queries/useMyRequests";
import { useAuth } from "../../contexts/AuthContext";
import { Skeleton } from "../../components/ui/Skeleton";
import { lazy, Suspense } from "react";

const CreateTopicModal = lazy(() => import("../../components/modals/CreateTopicModal").then(m => ({ default: m.CreateTopicModal })));

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const { data: requestsData, isLoading, refetch } = useMyRequests("default", 1, 100, undefined, "TOPIC");
  
  const stats = useMemo(() => {
    if (!requestsData) return null;
    const items = requestsData.items;
    
    const approvedCount = items.filter(r => ["APPROVED", "IMPLEMENTED", "PROVISIONED"].includes(r.status?.toUpperCase())).length;
    const pendingCount = items.filter(r => ["PENDING", "REQUESTED"].includes(r.status?.toUpperCase())).length;
    const rejectedCount = items.filter(r => ["REJECTED", "DECLINED", "FAILED"].includes(r.status?.toUpperCase())).length;
    
    const ownedTopicsCount = items.filter((r: any) => 
      (r.request_type === "TOPIC" || r.resource_type === "TOPIC") && 
      r.operation === "CREATE" && 
      ["APPROVED", "IMPLEMENTED", "PROVISIONED"].includes(r.status?.toUpperCase())
    ).length;

    return {
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
      ownedTopics: ownedTopicsCount,
      total: requestsData.total_count
    };
  }, [requestsData]);

  const recentRequests = useMemo(() => {
    if (!requestsData) return [];
    return requestsData.items.slice(0, 5);
  }, [requestsData]);

  const cards = [
    {
      title: "Active Topics",
      description: "Topics you own and manage",
      value: stats?.ownedTopics ?? 0,
      icon: Database,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      path: "/topic-catalog"
    },
    {
      title: "Pending Requests",
      description: "Awaiting administrator approval",
      value: stats?.pending ?? 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      path: "/topics"
    },
    {
      title: "Approved Actions",
      description: "Successfully processed requests",
      value: stats?.approved ?? 0,
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      path: "/topics"
    }
  ];

  return (
    <DashboardLayout role={user?.role || "user"}>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
              Welcome back, <span className="text-primary">{user?.username}</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
              Here's what's happening with your Kafka resources today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
                onClick={() => setIsTopicModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white h-12 px-6 rounded-2xl transition-all active:scale-95 font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Topic Request
            </Button>
          </div>
        </div>

        {/* stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card, i) => (
            <Card 
              key={i} 
              className="glass-panel border-none shadow-sm hover:shadow-md transition-all cursor-pointer group rounded-[2rem] overflow-hidden"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300", card.bg, card.color)}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  <div className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                    {isLoading ? <Skeleton className="h-10 w-12" /> : card.value}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{card.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{card.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 glass-panel border-none rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tighter uppercase text-slate-800 dark:text-white">Recent Activity</CardTitle>
                  <CardDescription className="font-medium mt-1">Your latest governance requests</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => navigate("/topics")} className="text-primary font-bold hover:bg-primary/10 rounded-xl">
                  View All <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
               <div className="space-y-4">
                 {isLoading ? (
                   Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
                 ) : recentRequests.length > 0 ? (
                   recentRequests.map((req, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "p-2.5 rounded-xl border",
                           req.status === "APPROVED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                           req.status === "PENDING" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                           "bg-red-500/10 border-red-500/20 text-red-500"
                         )}>
                           {req.status === "APPROVED" ? <CheckCircle className="w-5 h-5" /> :
                            req.status === "PENDING" ? <Clock className="w-5 h-5" /> :
                            <XCircle className="w-5 h-5" />}
                         </div>
                         <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{req.resource_name}</p>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{req.operation} • {new Date(req.created_at).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <Badge variant={
                        req.status === "APPROVED" ? "success" :
                        req.status === "PENDING" ? "warning" : "destructive"
                      } className="rounded-lg px-3 py-1 font-bold uppercase tracking-widest text-[10px]">
                        {req.status}
                      </Badge>
                    </div>
                   ))
                 ) : (
                   <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                     <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                     <p className="text-slate-500 font-bold">No recent activity found.</p>
                     <p className="text-slate-400 text-sm mt-1">Start by requesting a new topic.</p>
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>

          {/* Quick links & AI */}
          <div className="space-y-8">
            <Card className="glass-card border-none bg-gradient-to-br from-primary/10 to-transparent rounded-[2.5rem] overflow-hidden group">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-primary/10 group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-black tracking-tighter uppercase">Kafka Assistant</h4>
                    <p className="text-xs font-bold text-primary/70 uppercase tracking-widest">Always Active</p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed mb-6">
                  Need help choosing partitions or configuring schemas? Ask the specialized Kafka AI for best practices.
                </p>
                <Button 
                  onClick={() => navigate("/ai-assistant")}
                  className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-sm uppercase tracking-widest gap-2 shadow-lg shadow-primary/30"
                >
                  Ask Assistant <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-panel border-none rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black tracking-tighter uppercase">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-3">
                    {[
                        { label: "Browse Catalog", path: "/topic-catalog", icon: Search },
                        { label: "My ACLs", path: "/acls", icon: Shield },
                        { label: "Governance Hub", path: "/governance", icon: Zap },
                    ].map((link, i) => (
                        <Button
                            key={i}
                            variant="ghost"
                            onClick={() => navigate(link.path)}
                            className="w-full justify-start h-14 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all group"
                        >
                            <link.icon className="w-5 h-5 mr-3 text-slate-400 group-hover:text-primary transition-colors" />
                            <span className="font-bold text-slate-700 dark:text-slate-200">{link.label}</span>
                        </Button>
                    ))}
                </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        {isTopicModalOpen && (
          <CreateTopicModal
            isOpen={isTopicModalOpen}
            onClose={() => setIsTopicModalOpen(false)}
            onSuccess={refetch}
            isRequest={true}
          />
        )}
      </Suspense>
    </DashboardLayout>
  );
}
