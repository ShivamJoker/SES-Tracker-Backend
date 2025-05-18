import Wretch from "wretch";

const MOMENTO_API_KEY = process.env.MOMENTO_API_KEY;

if (!MOMENTO_API_KEY) {
  throw Error("MOMENTO_API_KEY not found in ENV");
}

export const MOMENTO_API = Wretch(
  "https://api.cache.cell-us-east-1-1.prod.a.momentohq.com",
).auth(MOMENTO_API_KEY);
