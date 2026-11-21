import { messages } from "../src/locales";
import { simulate } from "../src/analysis";
const n = Number(process.argv[2] ?? 10000);
if (!Number.isSafeInteger(n) || n < 1)
  throw Error(messages.errors.invalidRounds);
console.log(JSON.stringify(simulate(n, Array(9).fill(1)), null, 2));
