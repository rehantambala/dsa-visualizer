import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

function AnalyticsDashboard() {
  const [data, setData] = useState({ mostUsed: [], averageSteps: 0, visualizationUsage: [] });

  useEffect(() => {
    api.getAnalytics().then(setData).catch(() => {});
  }, []);

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / ANALYTICS</p>
        <h1>ANALYTICS DASHBOARD</h1>
      </section>
      <section className="dashboard-grid stage-block stage-delay-2">
        <div className="info-card">
          <div className="panel-title">MOST USED ALGORITHMS</div>
          <div className="complexity-list">{data.mostUsed.map((a) => <div key={a.name}>{a.name} : {a.count}</div>)}</div>
        </div>
        <div className="info-card">
          <div className="panel-title">AVERAGE STEP COUNT</div>
          <div className="complexity-list"><div>{data.averageSteps}</div></div>
        </div>
        <div className="info-card">
          <div className="panel-title">VISUALIZATION USAGE</div>
          <div className="complexity-list">{data.visualizationUsage.map((v) => <div key={v.name}>{v.name} : {v.count}</div>)}</div>
        </div>
      </section>
    </div>
  );
}

export default AnalyticsDashboard;
