"use client";
import { useState } from "react";
import { LayoutDashboard, Users, Building2, CreditCard, ScrollText } from "lucide-react";
import dynamic from "next/dynamic";

const OverviewTab = dynamic(() => import("./OverviewTab"), { ssr: false });
const UsersTab = dynamic(() => import("./UsersTab"), { ssr: false });
const OrgsTab = dynamic(() => import("./OrgsTab"), { ssr: false });
const TransactionsTab = dynamic(() => import("./TransactionsTab"), { ssr: false });
const LogsTab = dynamic(() => import("./LogsTab"), { ssr: false });

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "logs", label: "Logs", icon: ScrollText },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#1a7a4a]" />
          <span className="text-xs font-medium text-[#1a7a4a] uppercase tracking-wider font-mono">Admin</span>
        </div>
        <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
          Admin Dashboard
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 border-b border-[#e5e1d8] overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-[#1a7a4a] text-[#1a7a4a]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827] hover:border-[#e5e1d8]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "organizations" && <OrgsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "logs" && <LogsTab />}
      </div>
    </div>
  );
}
