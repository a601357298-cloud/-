import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="page-shell">
      <header className="topbar">
        <Link className="brand" to="/study/python">
          QUESTION FLOW
        </Link>

        <div className="topbar__actions">
          {user ? (
            <span className="status-pill">已登录 · {user.displayName}</span>
          ) : (
            <Link className="ghost-button" to="/login" state={{ from: location.pathname }}>
              登录
            </Link>
          )}

          <Link className="primary-button" to="/upload">
            上传题目
          </Link>

          {user?.role === "admin" ? (
            <Link className="ghost-button" to="/admin/users">
              管理账号
            </Link>
          ) : null}

          {user ? (
            <button type="button" className="ghost-button" onClick={() => void logout()}>
              退出
            </button>
          ) : null}
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

