import { useState } from "react";

// Small, dependency-free chart pieces for the analytics views. One series per chart,
// one hue, values always printed as text so nothing depends on color alone.

export type FunnelStep = { label: string; value: number };
export type StatTileData = { label: string; value: string; detail?: string };

const format = (value: number) => value.toLocaleString("en-US");

export function StatTiles({ tiles }: { tiles: StatTileData[] }) {
  return (
    <div className="p5-tiles">
      {tiles.map((tile) => (
        <div className="p5-tile" key={tile.label}>
          <small>{tile.label}</small>
          <b className={/^[$\d][\d.,]*[a-z%]*$/i.test(tile.value) ? undefined : "text"}>{tile.value}</b>
          {tile.detail ? <span>{tile.detail}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function FunnelChart({ title, steps, note }: { title: string; steps: FunnelStep[]; note?: string }) {
  const [table, setTable] = useState(false);
  const max = Math.max(...steps.map((step) => step.value), 1);
  // The largest step-to-step loss is called out in text, not by color.
  let dropIndex = -1;
  let dropRate = 0;
  steps.forEach((step, index) => {
    if (!index || !steps[index - 1].value) return;
    const loss = 1 - step.value / steps[index - 1].value;
    if (loss > dropRate) {
      dropRate = loss;
      dropIndex = index;
    }
  });

  return (
    <div className="card p5-chart">
      <div className="p5-chart-head">
        <b>{title}</b>
        <button className="pill" type="button" onClick={() => setTable((value) => !value)} aria-pressed={table}>{table ? "Chart" : "Table"}</button>
      </div>
      {table ? (
        <table className="p5-table">
          <thead><tr><th scope="col">Step</th><th scope="col">Count</th><th scope="col">Of previous</th></tr></thead>
          <tbody>
            {steps.map((step, index) => (
              <tr key={step.label}>
                <th scope="row">{step.label}</th>
                <td>{format(step.value)}</td>
                <td>{index && steps[index - 1].value ? `${Math.round((step.value / steps[index - 1].value) * 100)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p5-funnel" role="list">
          {steps.map((step, index) => {
            const share = index && steps[index - 1].value ? Math.round((step.value / steps[index - 1].value) * 100) : null;
            const description = `${step.label}: ${format(step.value)}${share !== null ? `, ${share}% of the previous step` : ""}`;
            return (
              <div className="p5-funnel-row" role="listitem" key={step.label}>
                <div className="p5-funnel-label"><span>{step.label}</span>{share !== null ? <small>{share}% of previous</small> : null}</div>
                <div className="p5-funnel-track" tabIndex={0} title={description} aria-label={description}>
                  <span className="p5-bar-area"><i style={{ width: `${Math.max(2, (step.value / max) * 100)}%` }} /></span>
                  <span className="p5-bar-value">{format(step.value)}</span>
                </div>
                {index === dropIndex && dropRate > 0.25 ? <div className="p5-drop">Largest drop-off: {Math.round(dropRate * 100)}% leave before this step</div> : null}
              </div>
            );
          })}
        </div>
      )}
      {note ? <p className="p2-fine">{note}</p> : null}
    </div>
  );
}

export function Suggestions({ items }: { items: Array<{ title: string; detail: string }> }) {
  return (
    <div className="card p5-suggestions">
      <b>What could improve</b>
      {items.map((item) => (
        <div key={item.title}><span aria-hidden="true">✦</span><p><strong>{item.title}</strong> {item.detail}</p></div>
      ))}
    </div>
  );
}
