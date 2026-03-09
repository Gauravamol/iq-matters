import DashboardLayout from "./DashboardLayout";

const items = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/team", label: "My Team" },
  { to: "/dashboard/tournaments", label: "Join Tournament" },
  { to: "/dashboard/matches", label: "My Matches" },
  { to: "/dashboard/leaderboard", label: "Leaderboard" },
  { to: "/dashboard/profile", label: "Profile" }
];

export default function UserDashboardLayout() {
  return <DashboardLayout title="Player HQ" eyebrow="COMPETE" items={items} />;
}
