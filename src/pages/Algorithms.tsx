import { NavLink, Routes, Route } from "react-router-dom";
import TrainerF2L from "./TrainerF2L";
import F2LFeliks from "./F2LFeliks";
import AlgList from "../components/AlgList";
import type { AlgCase } from "../components/AlgList";
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
      <NavLink to="/algorithms/feliks" className={cls}>
        F2L (Feliks)
      </NavLink>
      <NavLink to="/algorithms/oll" className={cls}>
        OLL
      </NavLink>
      <NavLink to="/algorithms/pll" className={cls}>
        PLL
      </NavLink>
    </div>
  );
}

function ListPage({ title, kind, cases }: { title: string; kind: "oll" | "pll"; cases: AlgCase[] }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">{title}</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Tap ☆ to bookmark the algorithm you want to learn.
      </p>
      <AlgList kind={kind} cases={cases} />
    </main>
  );
}

export default function Algorithms() {
  return (
    <>
      <Tabs />
      <Routes>
        <Route index element={<TrainerF2L />} />
        <Route path="feliks" element={<F2LFeliks />} />
        <Route
          path="oll"
          element={<ListPage title="OLL algorithms" kind="oll" cases={ollCases as AlgCase[]} />}
        />
        <Route
          path="pll"
          element={<ListPage title="PLL algorithms" kind="pll" cases={pllCases as AlgCase[]} />}
        />
      </Routes>
    </>
  );
}
