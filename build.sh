#!/usr/bin/env bash
# 把 src/ 里的各个部分按顺序拼成一个单文件网页 dist/chenxing.html
set -e
cd "$(dirname "$0")/src"
mkdir -p ../dist
cat head.html config.js config2.js cards.js meta.js relic.js sig.js story.js arena.js haz.js boss.js event.js affix.js fight.js step.js px-core.js px-hero.js px-foe.js px-fx.js ui-a.js ui-b.js ui-d.js ui-c.js > ../dist/chenxing.html
echo "built dist/chenxing.html ($(wc -c < ../dist/chenxing.html) bytes)"
