import { NavLink, Outlet } from "react-router-dom";

export default function DashboardLayout({ title, eyebrow, items }) {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar panel panel--cyan">
        <div className="dashboard-sidebar__header">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>

        <nav className="dashboard-sidebar__nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="dashboard-sidebar__link">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="dashboard-content">
        <Outlet />
      </section>
    </div>
  );
}
