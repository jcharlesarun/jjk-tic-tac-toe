const fs = require('node:fs');
const path = require('node:path');

function writeReport(root) {
  const records = fs.readFileSync(path.join(root, 'coverage/lcov.info'), 'utf8').split('end_of_record');
  const files = records.filter(record => record.includes('SF:')).map(record => {
    const entries = record.trim().split(/\r?\n/);
    const field = key => entries.find(line => line.startsWith(key + ':'))?.slice(key.length + 1);
    const missingBranches = entries.filter(line => /^BRDA:.*,(0|-)$/.test(line)).map(line => Number(line.split(':')[1].split(',')[0]));
    return {
      path: field('SF'),
      lines: { hit: Number(field('LH')), total: Number(field('LF')) },
      functions: { hit: Number(field('FNH')), total: Number(field('FNF')) },
      branches: { hit: Number(field('BRH')), total: Number(field('BRF')) },
      hits: new Map(entries.filter(line => line.startsWith('DA:')).map(line => line.slice(3).split(',').map(Number))),
      missingBranches
    };
  });
  const percent = metric => metric.total ? 100 * metric.hit / metric.total : 100;
  const thresholds = { lines: 95, functions: 95, branches: 90 };
  const expected = ['characters.js', 'game.js', 'rules.js'];
  const failures = [];
  for (const name of expected) {
    if (!files.some(file => file.path.replaceAll('\\', '/').split('/').at(-1) === name)) failures.push(`No coverage recorded for ${name}`);
  }
  for (const file of files) for (const metric of Object.keys(thresholds)) {
    const target = file.path.endsWith('rules.js') ? 100 : thresholds[metric];
    if (percent(file[metric]) < target) failures.push(`${file.path}: ${metric} coverage is below ${target}%`);
  }
  const total = Object.fromEntries(Object.keys(thresholds).map(metric => [metric, files.reduce((sum, file) => ({hit: sum.hit + file[metric].hit, total: sum.total + file[metric].total}), {hit:0,total:0})]));
  const summary = {
    generatedAt: new Date().toISOString(),
    scope: expected,
    thresholds: { perFile: thresholds, rules: { lines:100, functions:100, branches:100 } },
    totals: Object.fromEntries(Object.entries(total).map(([key,value]) => [key,{...value,percent:percent(value)}])),
    files: files.map(({hits,missingBranches,...file}) => ({...file,missingBranchLines:[...new Set(missingBranches)]})),
    failures
  };
  fs.writeFileSync(path.join(root,'coverage/summary.json'), JSON.stringify(summary,null,2) + '\n');
  const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const cell = metric => `${percent(metric).toFixed(2)}% <small>${metric.hit}/${metric.total}</small>`;
  const rows = files.map(file => `<tr><th scope="row">${escape(file.path)}</th><td>${cell(file.lines)}</td><td>${cell(file.functions)}</td><td>${cell(file.branches)}</td></tr>`).join('');
  const sources = files.map(file => {
    const source = fs.readFileSync(path.resolve(root,file.path),'utf8').split(/\r?\n/);
    const lines = source.map((line,index) => {
      const lineNumber = index + 1, count = file.hits.get(lineNumber);
      const branchMiss = file.missingBranches.includes(lineNumber);
      const state = count === undefined ? 'neutral' : count === 0 ? 'miss' : branchMiss ? 'partial' : 'covered';
      return `<div class="source-line ${state}"><span class="line-number">${lineNumber}</span><span class="count">${count ?? ''}</span><code>${escape(line) || ' '}</code>${branchMiss ? '<span class="branch-note">untested branch</span>' : ''}</div>`;
    }).join('');
    return `<details><summary>${escape(file.path)} — ${cell(file.branches)} branches</summary><div class="source">${lines}</div></details>`;
  }).join('');
  fs.writeFileSync(path.join(root,'coverage/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JJK Tic Tac Toe — Coverage</title><style>
  *{box-sizing:border-box}body{font:15px/1.6 system-ui,sans-serif;background:#f4f6fa;color:#233047;margin:0}main{max-width:1100px;margin:auto;padding:36px 24px}h1{margin-bottom:6px}h2{margin-top:30px}p{max-width:85ch;color:#536079}.cards{display:flex;gap:16px;flex-wrap:wrap;margin:25px 0}.card{flex:1;min-width:150px;background:white;border:1px solid #dce2ec;border-radius:12px;padding:20px}.card strong{display:block;font-size:30px;color:#216349}.card span{text-transform:capitalize}table{border-collapse:collapse;width:100%;background:white}th,td{padding:12px;text-align:left;border-bottom:1px solid #dce2ec}small{display:inline-block;font-size:11px;color:#67748b;margin-left:5px}details{margin:15px 0;border:1px solid #dce2ec;border-radius:9px;background:white;overflow:hidden}summary{padding:14px;cursor:pointer;font-weight:600}.source{overflow:auto;font:12px/1.8 Consolas,monospace}.source-line{display:flex;min-width:max-content}.line-number{width:50px;flex-shrink:0;text-align:right;padding-right:12px;color:#6c7788;background:#edf0f6}.count{width:55px;flex-shrink:0;text-align:right;padding-right:12px;color:#456052}.source-line code{white-space:pre;padding-right:20px}.covered{background:#f0fbf4}.miss{background:#ffe2e2}.partial{background:#fff0cb}.branch-note{font-size:11px;color:#804d12;margin-left:10px}.note{border-left:4px solid #7282b0;padding-left:16px}.result{font-weight:650;color:#216349}.failed{color:#9a2525}
  </style></head><body><main><h1>JJK Tic Tac Toe · Code coverage</h1><p>Generated ${escape(summary.generatedAt)}. Node.js V8 coverage from unit tests and DOM-substitute integration checks.</p>
  <p class="result ${failures.length?'failed':''}">${failures.length ? escape(failures.join('; ')) : 'Coverage thresholds passed.'}</p>
  <div class="cards">${Object.entries(total).map(([name,metric])=>`<div class="card"><span>${name}</span><strong>${percent(metric).toFixed(2)}%</strong><small>${metric.hit} of ${metric.total} covered</small></div>`).join('')}</div>
  <table><thead><tr><th>Source file</th><th>Lines</th><th>Functions</th><th>Branches</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="note">Scope: the active game JavaScript only. Legacy classic-game.js, test code, report scripts, CSS, HTML and SVG artwork are excluded. High coverage shows what executed; it does not prove correctness or verify browser visuals. Each file requires 95% lines/functions and 90% branches. rules.js requires 100% in all three.</p>
  <h2>Inspect source coverage</h2><p>Green: executed line. Yellow: executed line with an untested branch. Red: unexecuted line. Expand a file to inspect.</p>${sources}</main></body></html>`);
  console.log('Coverage reports: coverage/index.html, coverage/summary.json, coverage/lcov.info');
  for (const failure of failures) console.error(failure);
  return failures.length === 0;
}
module.exports = { writeReport };
