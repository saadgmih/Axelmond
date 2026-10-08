#!/usr/bin/env node

const BASE_URL = "https://perfacademy.ma";

async function timeFetch(url, options = {}) {
  const t0 = performance.now();
  const res = await fetch(url, options);
  const t1 = performance.now();
  const text = await res.text();
  const t2 = performance.now();
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    ttfbMs: Math.round(t1 - t0),
    totalMs: Math.round(t2 - t0),
    sizeBytes: text.length,
    body: text,
  };
}

async function run() {
  console.log(`Auditing ${BASE_URL}...`);
  
  // 1. Root HTML
  const root = await timeFetch(BASE_URL);
  console.log(`\n--- Root HTML (/) ---`);
  console.log(`Status: ${root.status} | TTFB: ${root.ttfbMs}ms | Total: ${root.totalMs}ms | Size: ${(root.sizeBytes/1024).toFixed(1)} KB`);
  console.log(`CF-Cache-Status: ${root.headers['cf-cache-status']} | Server: ${root.headers['server']}`);
  
  // Parse scripts and stylesheets
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  const linkRegex = /<link[^>]+href=["']([^"']+)["']/g;
  
  const scripts = [];
  let m;
  while ((m = scriptRegex.exec(root.body)) !== null) scripts.push(m[1]);
  const links = [];
  while ((m = linkRegex.exec(root.body)) !== null) {
    if (m[1].endsWith('.css') || m[1].includes('/assets/')) links.push(m[1]);
  }
  
  console.log(`\nFound ${scripts.length} scripts and ${links.length} assets/css in HTML`);
  
  for (const s of scripts) {
    const fullUrl = s.startsWith('http') ? s : `${BASE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
    const r = await timeFetch(fullUrl);
    console.log(`Script ${s}: ${r.status} | TTFB: ${r.ttfbMs}ms | Total: ${r.totalMs}ms | ${(r.sizeBytes/1024).toFixed(1)} KB | Cache: ${r.headers['cache-control'] || 'none'} | CF: ${r.headers['cf-cache-status'] || 'none'}`);
  }
  
  for (const l of links) {
    const fullUrl = l.startsWith('http') ? l : `${BASE_URL}${l.startsWith('/') ? '' : '/'}${l}`;
    const r = await timeFetch(fullUrl);
    console.log(`Asset ${l}: ${r.status} | TTFB: ${r.ttfbMs}ms | Total: ${r.totalMs}ms | ${(r.sizeBytes/1024).toFixed(1)} KB | Cache: ${r.headers['cache-control'] || 'none'} | CF: ${r.headers['cf-cache-status'] || 'none'}`);
  }
  
  // 2. APIs
  const apis = [
    '/api/health',
    '/api/auth/me',
    '/api/courses',
    '/api/reviews',
    '/api/announcements'
  ];
  
  console.log(`\n--- Key APIs ---`);
  for (const api of apis) {
    const r = await timeFetch(`${BASE_URL}${api}`);
    console.log(`API ${api}: ${r.status} | TTFB: ${r.ttfbMs}ms | Total: ${r.totalMs}ms | ${(r.sizeBytes/1024).toFixed(1)} KB`);
  }
}

run().catch(console.error);
