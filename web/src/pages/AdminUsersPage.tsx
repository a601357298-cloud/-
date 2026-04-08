import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { User } from "../types";

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "user" as "admin" | "user"
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    const response = await api.listUsers();
    setUsers(response.users);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    try {
      await api.createUser(form);
      setForm({
        username: "",
        displayName: "",
        password: "",
        role: "user"
      });
      setStatus("账号已创建。");
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败");
    }
  }

  return (
    <section className="admin-grid">
      <div className="form-card">
        <p className="eyebrow">管理员</p>
        <h1>创建网站账号</h1>
        <form className="stack-form" onSubmit={onSubmit}>
          <label>
            <span>用户名</span>
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </label>
          <label>
            <span>昵称</span>
            <input
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <label>
            <span>角色</span>
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as "admin" | "user" })}
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </label>
          {status ? <div className="inline-success">{status}</div> : null}
          {error ? <div className="inline-error">{error}</div> : null}
          <button type="submit" className="primary-button">
            创建账号
          </button>
        </form>
      </div>

      <div className="form-card">
        <p className="eyebrow">现有账号</p>
        <h2>账号列表</h2>
        <div className="user-list">
          {users.map((user) => (
            <div key={user.id} className="user-list__item">
              <strong>{user.displayName}</strong>
              <span>
                @{user.username} · {user.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

