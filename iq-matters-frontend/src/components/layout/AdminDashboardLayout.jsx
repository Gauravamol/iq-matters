import DashboardLayout from "./DashboardLayout";

const items = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/tournaments", label: "Tournaments" },
  { to: "/admin/matches", label: "Matches" },
  { to: "/admin/results", label: "Results" },
  { to: "/admin/teams", label: "Teams" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/points-system", label: "Points System" },
  { to: "/admin/settings", label: "Settings" }
];

export default function AdminDashboardLayout() {
  return <DashboardLayout title="Admin Control" eyebrow="OPERATE" items={items} />;
}
