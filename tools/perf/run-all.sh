#!/usr/bin/env bash
# 3 runs per engine for one target. Usage: tools/perf/run-all.sh <url> <tag> <outdir>
set -u
URL=$1; TAG=$2; OUT=$3; mkdir -p "$OUT"
for i in 1 2 3; do
  for e in chromium webkit; do
    node "$(dirname "$0")/bench.mjs" "$e" "$URL" "$TAG" "$OUT/$TAG-$e-$i.json" >/dev/null 2>"$OUT/$TAG-$e-$i.err" || echo "run $TAG $e $i failed"
  done
done
