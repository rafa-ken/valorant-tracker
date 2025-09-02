import { Link, Outlet, NavLink } from "react-router-dom";

export function AppLayout() {
  const nav = [
    { to: "/leaderboard", label: "Leaderboard" },
    { to: "/skins", label: "Skins" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold">Valorant Tracker</Link>
          <nav className="flex gap-4 text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1 rounded-xl ${isActive ? "bg-neutral-800" : "hover:bg-neutral-800/60"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
