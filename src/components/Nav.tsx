import { NavLink } from "react-router-dom";
import { useProfile } from "../state/ProfileProvider";

const LINKS = [
  { to: "/timer", label: "Timer" },
  { to: "/trainer", label: "Trainer" },
  { to: "/algorithms", label: "Algorithms" },
];

export default function Nav() {
  const { profile, setSetting } = useProfile();
  const dark = profile.settings.theme === "dark";

  return (
    <nav className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
                    ? "text-slate-900 dark:text-slate-100 font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setSetting("theme", dark ? "light" : "dark")}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="ml-auto rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>
    </nav>
  );
}
