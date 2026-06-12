import { NavLink, Routes, Route } from "react-router-dom";
import TrainerCross from "./TrainerCross";
import TrainerLookahead from "./TrainerLookahead";

function Tabs() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-3 py-1.5 text-white"
      : "rounded border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
  return (
    <div className="mx-auto max-w-3xl px-6 pt-4 flex gap-2">
      <NavLink to="/trainer" end className={cls}>
        Cross
      </NavLink>
      <NavLink to="/trainer/lookahead" className={cls}>
        Look-ahead
      </NavLink>
    </div>
  );
}

export default function Trainer() {
  return (
    <>
      <Tabs />
      <Routes>
        <Route index element={<TrainerCross />} />
        <Route path="lookahead" element={<TrainerLookahead />} />
      </Routes>
    </>
  );
}
