import React from "react";

interface StatsData {
  total_invoices: number;
  total_revenue: number;
  currency: string;
  pending_count: number;
  overdue_count: number;
}

interface StatsOverviewProps {
  stats: StatsData;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    { label: "Total Invoices", value: stats.total_invoices, color: "text-blue-600 dark:text-blue-400" },
    { label: "Total Revenue", value: formatCurrency(stats.total_revenue, stats.currency), color: "text-green-600 dark:text-green-400" },
    { label: "Pending Payments", value: stats.pending_count, color: "text-amber-600 dark:text-amber-400" },
    { label: "Overdue Invoices", value: stats.overdue_count, color: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
