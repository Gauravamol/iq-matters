import Button from "../../components/ui/Button";
import Panel from "../../components/ui/Panel";
import { useAuth } from "../../hooks/useAuth";

export default function Profile() {
  const { user, team, logout } = useAuth();

  return (
    <div className="stack-xl">
      <section className="section-copy">
        <span className="eyebrow">PROFILE</span>
        <h2>Account snapshot</h2>
        <p>Review the linked identity driving your tournament access and permissions.</p>
      </section>

      <Panel glow="green" className="stack-md">
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Linked Team:</strong> {team?.name || "No team linked"}</p>
        <Button variant="ghost" onClick={logout}>Logout</Button>
      </Panel>
    </div>
  );
}
