import fs from "fs";

const lines = fs.readFileSync("src/App.tsx", "utf8").split(/\r?\n/);
const jsx = lines.slice(2399, 3787).join("\n");
const appBefore = lines.slice(0, 2399).join("\n");

function uses(name) {
  return new RegExp(`\\b${name}\\b`).test(jsx);
}

const statePairs = [...appBefore.matchAll(/const \[(\w+), (set\w+)\]/g)];
const handlers = [...appBefore.matchAll(/const ((?:handle|show|load|refresh|toggle|publish|flatten|get|parse|navigate)\w+) =/g)].map((m) => m[1]);
const computed = [...appBefore.matchAll(/^  const (\w+) = /gm)].map((m) => m[1]);

const usedState = statePairs.filter(([name]) => uses(name)).map(([name, setter]) => ({ name, setter }));
const usedHandlers = handlers.filter((name) => uses(name));
const usedComputed = computed.filter((name) => uses(name) && name.length > 4);

console.log(JSON.stringify({ usedState, usedHandlers, usedComputed }, null, 2));
