import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import type { User } from "../types";

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "user" as "admin" | "user"
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<
    Record<string, { username: string; displayName: string; password: string; role: "admin" | "user" }>
  >({});

  async function loadUsers() {
    const response = await api.listUsers();
    setUsers(response.users);
    setEditForms(
      Object.fromEntries(
        response.users.map((item) => [
          item.id,
          {
            username: item.username,
            displayName: item.displayName,
            password: "",
            role: item.role
          }
        ])
      )
    );
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

  async function onUpdateUser(id: string) {
    const target = editForms[id];
    if (!target) {
      return;
    }

    setStatus("");
    setError("");

    try {
      await api.updateUser(id, {
        username: target.username,
        displayName: target.displayName,
        password: target.password || undefined,
        role: target.role
      });
      setStatus("账号已更新。");
      setEditingId(null);
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新失败");
    }
  }

  async function onDeleteUser(id: string) {
    setStatus("");
    setError("");

    try {
      await api.deleteUser(id);
      setStatus("账号已删除。");
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "删除失败");
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
              <div className="user-list__header">
                <strong>{user.displayName}</strong>
                <span>
                  @{user.username} · {user.role}
                </span>
              </div>

              <div className="inline-actions">
                <button
                  type="button"
                  className={editingId === user.id ? "nav-button nav-button--active" : "nav-button"}
                  onClick={() => setEditingId(editingId === user.id ? null : user.id)}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={currentUser?.id === user.id}
                  onClick={() => void onDeleteUser(user.id)}
                >
                  删除
                </button>
              </div>

              {editingId === user.id ? (
                <div className="stack-form stack-form--compact">
                  <label>
                    <span>用户名</span>
                    <input
                      value={editForms[user.id]?.username ?? ""}
                      onChange={(event) =>
                        setEditForms((current) => ({
                          ...current,
                          [user.id]: {
                            ...current[user.id],
                            username: event.target.value
                          }
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>昵称</span>
                    <input
                      value={editForms[user.id]?.displayName ?? ""}
                      onChange={(event) =>
                        setEditForms((current) => ({
                          ...current,
                          [user.id]: {
                            ...current[user.id],
                            displayName: event.target.value
                          }
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>新密码</span>
                    <input
                      type="password"
                      placeholder="留空则不修改"
                      value={editForms[user.id]?.password ?? ""}
                      onChange={(event) =>
                        setEditForms((current) => ({
                          ...current,
                          [user.id]: {
                            ...current[user.id],
                            password: event.target.value
                          }
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>角色</span>
                    <select
                      value={editForms[user.id]?.role ?? "user"}
                      onChange={(event) =>
                        setEditForms((current) => ({
                          ...current,
                          [user.id]: {
                            ...current[user.id],
                            role: event.target.value as "admin" | "user"
                          }
                        }))
                      }
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void onUpdateUser(user.id)}
                  >
                    保存修改
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
