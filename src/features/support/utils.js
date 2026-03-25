export const QUERY_ACTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_EMPLOYEE"];

export const SUPERADMIN_STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "Working" },
  { key: "WAITING_FOR_EMPLOYEE", label: "Waiting" },
  { key: "RESOLVED", label: "Resolved" },
];

export function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getLeaveStatusTheme(status) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") {
    return { color: "#34D399", bg: "rgba(52, 211, 153, 0.14)", iconName: "approved" };
  }
  if (normalized === "REJECTED") {
    return { color: "#FB7185", bg: "rgba(251, 113, 133, 0.14)", iconName: "rejected" };
  }
  return { color: "#FBBF24", bg: "rgba(251, 191, 36, 0.14)", iconName: "pending" };
}

export function getQueryStatusTone(status) {
  const normalized = String(status || "OPEN").toUpperCase();
  if (normalized === "RESOLVED") {
    return {
      label: "Resolved",
      bg: "rgba(52, 211, 153, 0.15)",
      border: "rgba(52, 211, 153, 0.24)",
      text: "#A7F3D0",
    };
  }
  if (normalized === "CLOSED") {
    return {
      label: "Closed",
      bg: "rgba(148, 163, 184, 0.14)",
      border: "rgba(148, 163, 184, 0.2)",
      text: "#CBD5E1",
    };
  }
  if (normalized === "REJECTED") {
    return {
      label: "Rejected",
      bg: "rgba(251, 113, 133, 0.14)",
      border: "rgba(251, 113, 133, 0.22)",
      text: "#FECDD3",
    };
  }
  if (normalized === "WAITING_FOR_EMPLOYEE") {
    return {
      label: "Waiting",
      bg: "rgba(56, 189, 248, 0.14)",
      border: "rgba(56, 189, 248, 0.24)",
      text: "#BAE6FD",
    };
  }
  if (normalized === "IN_PROGRESS") {
    return {
      label: "In Progress",
      bg: "rgba(250, 204, 21, 0.14)",
      border: "rgba(250, 204, 21, 0.24)",
      text: "#FDE68A",
    };
  }
  return {
    label: "Open",
    bg: "rgba(192, 132, 252, 0.14)",
    border: "rgba(192, 132, 252, 0.22)",
    text: "#E9D5FF",
  };
}
