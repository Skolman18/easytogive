"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const OverviewTab = dynamic(() => import("./OverviewTab"), { ssr: false });
const UsersTab = dynamic(() => import("./UsersTab"), { ssr: false });
const OrgsTab = dynamic(() => import("./OrgsTab"), { ssr: false });
const TransactionsTab = dynamic(() => import("./TransactionsTab"), { ssr: false });
const LogsTab = dynamic(() => import("./LogsTab"), { ssr: false });

const TABS = [
  { id: "overview",       label: "Overview" },
  { id: "users",          label: "Users" },
  { id: "organizations",  label: "Organizations" },
  { id: "transactions",   label: "Transactions" },
  { id: "logs",           label: "Logs" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div>
      {/* Sub-tab nav — matches profile page tab style */}
      <div className="flex gap-0 overflow-x-auto border-b mb-8" style={{ borderColor: "#e5e1d8" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-[#1a7a4a] text-[#1a7a4a]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview"      && <OverviewTab />}
      {activeTab === "users"         && <UsersTab />}
      {activeTab === "organizations" && <OrgsTab />}
      {activeTab === "transactions"  && <TransactionsTab />}
      {activeTab === "logs"          && <LogsTab />}
    </div>
  );
}
