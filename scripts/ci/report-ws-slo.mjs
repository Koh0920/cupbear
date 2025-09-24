import { readFileSync } from 'node:fs';

if (process.argv.length < 3) {
  console.error('Usage: node report-ws-slo.mjs <k6-summary.json>');
  process.exit(1);
}

const summaryPath = process.argv[2];
const raw = readFileSync(summaryPath, 'utf8');
const summary = JSON.parse(raw);

const connectMetric = summary.metrics?.ws_connection_time;
const disconnectMetric = summary.metrics?.ws_disconnects;

if (!connectMetric || !disconnectMetric) {
  console.error('Missing expected k6 metrics in summary file.');
  process.exit(1);
}

const connectP95Raw = connectMetric.values?.['p(95)'];
const disconnectRateRaw = disconnectMetric.values?.rate;

const connectP95 = Number(connectP95Raw);
const disconnectRate = Number(disconnectRateRaw);

if (!Number.isFinite(connectP95) || !Number.isFinite(disconnectRate)) {
  console.error('SLO values could not be derived from metrics.');
  process.exit(1);
}

console.log(`::notice ::WebSocket connect p95: ${connectP95.toFixed(2)} ms`);
console.log(`::notice ::WebSocket disconnect rate: ${(disconnectRate * 100).toFixed(3)}%`);
