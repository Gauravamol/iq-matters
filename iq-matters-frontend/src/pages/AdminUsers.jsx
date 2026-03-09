import React, { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const emptyForm = {
  id: null,
  name: "",
  email: "",
  password: "",
  role: "user"
};

function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, [token]);

  async function loadUsers() {
    try {
      const data = await apiRequest("/admin/users", { token });
      setUsers(data || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function resetForm() {
    setForm(emptyForm);
  }

  function startEdit(user) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role
    });
    setMessage("");
    setError("");
  }

  async function saveUser(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (form.id) {
        await apiRequest(`/admin/users/${form.id}`, {
          method: "PUT",
          token,
          body: {
            name: form.name,
            email: form.email,
            role: form.role
          }
        });
        setMessage("User updated.");
      } else {
        await apiRequest("/admin/users", {
          method: "POST",
          token,
          body: {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role
          }
        });
        setMessage("User created.");
      }

      resetForm();
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeUser(id) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/admin/users/${id}`, {
        method: "DELETE",
        token
      });
      setMessage("User deleted.");
      if (form.id === id) {
        resetForm();
      }
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="dashboard"
        eyebrow="Admin Users"
        title="Manage Users"
        description="Create, edit, and remove platform users with full role-based admin control."
      />

      <AdminPanelNav />

      <section className="page-card page-card--form">
        <div className="section-head">
          <div>
            <span className="eyebrow">User Form</span>
            <h2>{form.id ? "Edit User" : "Create User"}</h2>
          </div>
          {form.id ? <ActionButton iconName="action" className="nav-button nav-button--ghost" onClick={resetForm}>Cancel Edit</ActionButton> : null}
        </div>
        <form className="form-stack" onSubmit={saveUser}>
          <input className="form-input" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="form-input" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          {!form.id ? <input className="form-input" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /> : null}
          <select className="form-input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="admin" type="submit">{form.id ? "Save User" : "Create User"}</ActionButton>
        </form>
      </section>

      <section className="entity-grid">
        {users.map((user) => (
          <article key={user.id} className="page-card entity-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">{user.role}</span>
                <h3>{user.name}</h3>
              </div>
              <span className="entity-meta">#{user.id}</span>
            </div>
            <p>{user.email}</p>
            <p>Team: {user.team_name || "No team linked"}</p>
            <div className="button-row">
              <ActionButton iconName="settings" className="nav-button nav-button--ghost" onClick={() => startEdit(user)}>Edit</ActionButton>
              <ActionButton iconName="admin" className="nav-button nav-button--ghost" onClick={() => removeUser(user.id)}>Delete</ActionButton>
            </div>
          </article>
        ))}
      </section>
    </PageWrapper>
  );
}

export default AdminUsers;
