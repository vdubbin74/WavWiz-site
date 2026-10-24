#!/bin/sh
# Usage: tools/bump-version.sh 0.5.0   (rewrites every copy of the current version in index.html)
set -e; cd "$(dirname "$0")/.."
OLD=$(sed -n 's/.*data-version="\([0-9.]*\)".*/\1/p' index.html | head -1); NEW="$1"
[ -n "$NEW" ] || { echo "usage: $0 NEW_VERSION"; exit 1; }
sed -i "/New in /!s/$(echo "$OLD" | sed 's/\./\\./g')/$NEW/g" index.html
sed -i "s#<lastmod>[0-9-]*</lastmod>#<lastmod>$(date +%F)</lastmod>#" sitemap.xml
echo "index.html: $OLD -> $NEW"; grep -c "$NEW" index.html
