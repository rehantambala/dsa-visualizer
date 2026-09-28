/**
 * frontend/src/components/AnalyticsDashboard.jsx
 *
 * BUG FIXED: this was reading data.mostUsed / data.averageSteps (as a scalar) /
 * data.visualizationUsage, but GET /api/analytics actually returns
 * { mostUsedAlgorithms, visualizerUsage, averageSteps } where averageSteps is an
 * ARRAY of { algorithm, averageSteps }, not a number. Every field name was wrong,
 * so this dashboard would render empty forever even with a live backend and real
 * data flowing in. Field names below now match the controller exactly.
 */
import { useEffect, useState } from "react";
import { api } from "../services/api.js";

function AnalyticsDashboard() {
  const [data, setData] = useState({ mostUsedAlgorithms: [], visualizerUsage: [], averageSteps: [] });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .getAnalytics()
      .then((res) => {
        if (cancelled) return;
        setData({
          mostUsedAlgorithms: res.mostUsedAlgorithms || [],
          visualizerUsage: res.visualizerUsage || [],
          averageSteps: res.averageSteps || [],
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyData =
    data.mostUsedAlgorithms.length > 0 || data.visualizerUsage.length > 0 || data.averageSteps.length > 0;

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / ANALYTICS</p>
        <h1>ANALYTICS DASHBOARD</h1>
        <p className="subtitle">Live stats pulled from every run logged across every visualizer.</p>
      </section>

      {status === "error" && (
        <section className="control-panel stage-block stage-delay-2">
          <div className="panel-title">CONNECTION</div>
          <p className="sorting-note">
            Could not reach the analytics backend. Make sure the API server is running and
            VITE_API_BASE_URL is set correctly.
          </p>
        </section>
      )}

      {status === "ready" && !hasAnyData && (
        <section className="control-panel stage-block stage-delay-2">
          <div className="panel-title">NO DATA YET</div>
          <p className="sorting-note">
            No runs logged yet. Go run Sorting, Graph, Tree, or Pathfinding and come back - every
            completed run gets recorded here automatically.
          </p>
        </section>
      )}

      <section className="dashboard-grid stage-block stage-delay-3">
        <div className="info-card">
          <div className="panel-title">MOST USED ALGORITHMS</div>
          <div className="complexity-list">
            {data.mostUsedAlgorithms.length === 0 && <div>--</div>}
            {data.mostUsedAlgorithms.map((a) => (
              <div key={a.algorithm}>
                {a.algorithm} : {a.totalRuns} run{a.totalRuns === 1 ? "" : "s"}
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <div className="panel-title">AVERAGE STEP COUNT (PER ALGORITHM)</div>
          <div className="complexity-list">
            {data.averageSteps.length === 0 && <div>--</div>}
            {data.averageSteps.map((a) => (
              <div key={a.algorithm}>
                {a.algorithm} : {a.averageSteps.toFixed(1)} steps avg
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <div className="panel-title">VISUALIZER USAGE (BY SESSION)</div>
          <div className="complexity-list">
            {data.visualizerUsage.length === 0 && <div>--</div>}
            {data.visualizerUsage.map((v) => (
              <div key={v.visualizer}>
                {v.visualizer} : {v.totalSessions} session{v.totalSessions === 1 ? "" : "s"}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AnalyticsDashboard;
