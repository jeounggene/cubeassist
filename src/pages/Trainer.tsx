import { NavLink, Routes, Route } from "react-router-dom";
import TrainerCross from "./TrainerCross";
import TrainerF2L from "./TrainerF2L";

function Tabs() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "rounded bg-slate-900 px-3 py-1.5 text-white"
      : "rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100";
  return (
    <div className="mx-auto max-w-3xl px-6 pt-4 flex gap-2">
      <NavLink to="/trainer" end className={cls}>
        Cross
      </NavLink>
      <NavLink to="/trainer/f2l" className={cls}>
        F2L
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
        <Route path="f2l" element={<TrainerF2L />} />
      </Routes>
    </>
  );
}
