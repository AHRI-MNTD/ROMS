#!/usr/bin/env node
/**
 * ROMS Production Personnel Capacity & Load Benchmark
 * Measures latency, throughput (requests/sec), and error rates under concurrent load
 * for both Gateway routing and Database-backed authenticated inventory endpoints.
 */

import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.BASE_URL || 'https://localhost';
const CA_CERT_PATH = process.env.CA_CERT_PATH || path.resolve(__dirname, '../nginx/certs/roms-root-ca.crt');
const JWT_SECRET = process.env.JWT_SECRET || 'roms-hpc-jwt-super-secret-production-key-change-me';

let caCert = null;
if (fs.existsSync(CA_CERT_PATH)) {
  caCert = fs.readFileSync(CA_CERT_PATH);
}

const httpsAgent = new https.Agent({
  ca: caCert || undefined,
  rejectUnauthorized: !!caCert,
  keepAlive: true,
  maxSockets: 250,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 250,
});

function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const testAdminToken = generateJwt(
  {
    sub: 'cms2vhsxa0000611kzs8c720r',
    email: 'systemadmin@roms.com',
    roles: ['ADMIN'],
    permissions: ['*'],
  },
  JWT_SECRET
);

function sendRequest(urlStr, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const start = process.hrtime.bigint();

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        ...headers,
        Connection: 'keep-alive',
      },
      agent: isHttps ? httpsAgent : httpAgent,
      timeout: 10000,
    };

    const req = lib.request(options, (res) => {
      res.resume();
      res.on('end', () => {
        const diff = Number(process.hrtime.bigint() - start) / 1e6; // ms
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, duration: diff });
      });
    });

    req.on('error', (err) => {
      const diff = Number(process.hrtime.bigint() - start) / 1e6;
      resolve({ ok: false, error: err.message, duration: diff });
    });

    req.on('timeout', () => {
      req.destroy();
      const diff = Number(process.hrtime.bigint() - start) / 1e6;
      resolve({ ok: false, error: 'TIMEOUT', duration: diff });
    });

    req.end();
  });
}

function calculatePercentiles(latencies) {
  latencies.sort((a, b) => a - b);
  const p = (pct) => {
    if (latencies.length === 0) return '0.00';
    const idx = Math.min(Math.floor((pct / 100) * latencies.length), latencies.length - 1);
    return latencies[idx].toFixed(2);
  };
  const sum = latencies.reduce((a, b) => a + b, 0);
  const mean = latencies.length ? (sum / latencies.length).toFixed(2) : '0.00';

  return {
    min: latencies[0]?.toFixed(2) || '0.00',
    mean,
    p50: p(50),
    p90: p(90),
    p95: p(95),
    p99: p(99),
    max: latencies[latencies.length - 1]?.toFixed(2) || '0.00',
  };
}

async function runScenario(endpoint, concurrency, totalRequests, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const latencies = [];
  let successful = 0;
  let failed = 0;
  let running = 0;
  let completed = 0;
  let started = 0;

  const startWallTime = Date.now();

  return new Promise((resolve) => {
    function launchWorker() {
      if (started >= totalRequests) return;
      started++;
      running++;

      sendRequest(url, headers).then((res) => {
        latencies.push(res.duration);
        if (res.ok) {
          successful++;
        } else {
          failed++;
        }
        running--;
        completed++;

        if (completed === totalRequests) {
          const totalDurationSec = (Date.now() - startWallTime) / 1000;
          const rps = (totalRequests / Math.max(0.001, totalDurationSec)).toFixed(1);
          resolve({
            endpoint,
            concurrency,
            totalRequests,
            successful,
            failed,
            totalDurationSec: totalDurationSec.toFixed(2),
            rps,
            stats: calculatePercentiles(latencies),
          });
        } else {
          launchWorker();
        }
      });
    }

    const initialPool = Math.min(concurrency, totalRequests);
    for (let i = 0; i < initialPool; i++) {
      launchWorker();
    }
  });
}

async function main() {
  console.log('==================================================================================');
  console.log('🔬 ROMS Production Personnel Capacity & Load Benchmark');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`CA Verification: ${caCert ? 'Strict TLS Trust (roms-root-ca.crt)' : 'System Default'}`);
  console.log('==================================================================================\n');

  // Warmup run
  console.log('Warming up connections...');
  await runScenario('/healthz', 10, 50);
  await runScenario('/api/domains/inventory', 5, 20, { Authorization: `Bearer ${testAdminToken}` });

  console.log('\n--- Test Suite 1: Gateway & Health Check Latency ---');
  const healthTiers = [
    { concurrency: 10, total: 500, label: '10 concurrent users' },
    { concurrency: 50, total: 1500, label: '50 concurrent users' },
    { concurrency: 100, total: 2000, label: '100 concurrent users' },
  ];

  const healthResults = [];
  for (const tier of healthTiers) {
    process.stdout.write(`Testing Gateway (${tier.label})... `);
    const res = await runScenario('/healthz', tier.concurrency, tier.total);
    healthResults.push({ ...res, label: tier.label });
    console.log(`${res.rps} req/s | p50: ${res.stats.p50}ms | p95: ${res.stats.p95}ms | Errors: ${res.failed}`);
  }

  console.log('\n--- Test Suite 2: Authenticated Database-Backed Inventory Queries (PostgreSQL + JWT) ---');
  const dbTiers = [
    { concurrency: 10, total: 200, label: '10 concurrent researchers' },
    { concurrency: 25, total: 500, label: '25 concurrent researchers' },
    { concurrency: 50, total: 1000, label: '50 concurrent researchers' },
  ];

  const dbResults = [];
  for (const tier of dbTiers) {
    process.stdout.write(`Testing Inventory API (${tier.label})... `);
    const res = await runScenario('/api/domains/inventory', tier.concurrency, tier.total, {
      Authorization: `Bearer ${testAdminToken}`,
    });
    dbResults.push({ ...res, label: tier.label });
    console.log(`${res.rps} req/s | p50: ${res.stats.p50}ms | p95: ${res.stats.p95}ms | Errors: ${res.failed}`);
  }

  console.log('\n==================================================================================');
  console.log('📊 Verified Capacity Benchmark Results');
  console.log('==================================================================================');
  console.log('| Workload / Endpoint | Concurrency | Total Req | Throughput | p50 Latency | p95 Latency | Error Rate |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: |');
  for (const r of [...healthResults, ...dbResults]) {
    const errorPct = ((r.failed / r.totalRequests) * 100).toFixed(1);
    console.log(`| \`${r.endpoint}\` (${r.label}) | ${r.concurrency} | ${r.totalRequests} | ${r.rps} req/s | ${r.stats.p50} ms | ${r.stats.p95} ms | ${errorPct}% |`);
  }
  console.log('==================================================================================\n');
}

main().catch(console.error);
