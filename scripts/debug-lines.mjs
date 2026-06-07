import fs from "fs";
const lines = fs.readFileSync("C:/Users/saadg/Desktop/AxelmondResearchLab/src/App.tsx", "utf8").split(/\r?\n/);
const i = lines.findIndex((l) => l.includes(") : role === \"teacher\" ? ("));
console.log("idx", i);
for (let j = i; j < i + 6; j++) console.log(j + 1, lines[j]);
