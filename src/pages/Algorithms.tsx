import { NavLink, Routes, Route } from "react-router-dom";
import F2L from "./F2L";
import OLL2Look from "./OLL2Look";
import LastLayerTrainer from "../components/LastLayerTrainer";
import type { AlgCase } from "../components/LastLayerTrainer";
import ollCases from "../data/cases/oll.json";
import pllCases from "../data/cases/pll.json";

function Tabs() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-3 py-1.5 text-white"
      : "rounded border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
  return (
    <div className="mx-auto max-w-3xl px-6 pt-4 flex flex-wrap gap-2">
      <NavLink to="/algorithms" end className={cls}>
        F2L
      </NavLink>
      <NavLink to="/algorithms/oll" className={cls}>
        OLL
      </NavLink>
      <NavLink to="/algorithms/oll2" className={cls}>
        OLL (2-look)
      </NavLink>
      <NavLink to="/algorithms/pll" className={cls}>
        PLL
      </NavLink>
    </div>
  );
}

export default function Algorithms() {
  return (
    <>
      <Tabs />
      <Routes>
        <Route index element={<F2L />} />
        <Route
          path="oll"
          element={
            <LastLayerTrainer title="OLL algorithms" kind="oll" cases={ollCases as AlgCase[]} />
          }
        />
        <Route path="oll2" element={<OLL2Look />} />
        <Route
          path="pll"
          element={
            <LastLayerTrainer title="PLL algorithms" kind="pll" cases={pllCases as AlgCase[]} />
          }
        />
      </Routes>
    </>
  );
}
