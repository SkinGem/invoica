import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400",
  settled: "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400",
  paid: "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400",
  pending: "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400",
  processing: "bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400",
  failed: "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400",
  overdue: "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400",
  cancelled: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400",
};

const defaultStyle = "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400";

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const styles = statusStyles[status.toLowerCase()] || defaultStyle;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${styles} ${className}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default StatusBadge;
