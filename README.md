# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/RoyZeeee/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard)
[![reward](https://make.fun/badge/token-radar-01/RoyZeeee/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

An offline research dashboard for [make.fun](https://make.fun). Rank protocols with no token recorded in a frozen DefiLlama snapshot using market-cap-to-TVL multiples from comparable protocols, seven-day TVL movement, and age since listing.

Run with Node.js 22.18 or later and the snapshot from the competition kit.

```sh
node main.ts --input /path/to/snapshot.json --output out
```

Open `out/dashboard/index.html` in your browser to search, filter, sort, and inspect the evidence and campaign research steps for each ranked protocol.
