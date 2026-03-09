import { Outlet } from "react-router-dom";
import MainNav from "./MainNav";

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <MainNav />
      <main className="page-frame">
        <Outlet />
      </main>
    </div>
  );
}
