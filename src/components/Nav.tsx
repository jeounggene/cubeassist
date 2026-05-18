import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/library", label: "Library" },
  { to: "/trainer", label: "Trainer" },
  { to: "/notation", label: "Notation" },
];

export default function Nav() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-4">
        <span className="font-bold text-lg">CubeAssist</span>
        <ul className="flex gap-4">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "text-slate-900 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
