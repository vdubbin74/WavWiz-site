#!/bin/sh
# Usage: tools/bump-version.sh NEW_VERSION [YYYY-MM-DD]   (date defaults to today; use the actual publish date)
# Rewrites every copy of the version and release date in index.html (leaves "New in x.y.z" notes headings alone).
set -e; cd "$(dirname "$0")/.."
NEW="$1"; DATE="${2:-$(date +%F)}"
[ -n "$NEW" ] || { echo "usage: $0 NEW_VERSION [YYYY-MM-DD]"; exit 1; }
echo "$DATE" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' || { echo "date must be YYYY-MM-DD"; exit 1; }
OLD=$(sed -n 's/.*data-version="\([0-9.]*\)".*/\1/p' index.html | head -1)
OLDD=$(sed -n 's/.*data-release-date="\([0-9-]*\)".*/\1/p' index.html | head -1)
us() { date -d "$1" '+%b %-d, %Y'; }
OLDUS=$(us "$OLDD"); NEWUS=$(us "$DATE")
sed -i -e "/New in /!s/$(echo "$OLD" | sed 's/\./\\./g')/$NEW/g" -e "s/$OLDD/$DATE/g" -e "s/$OLDUS/$NEWUS/g" index.html
sed -i "s#<lastmod>[0-9-]*</lastmod>#<lastmod>$DATE</lastmod>#" sitemap.xml
echo "index.html: $OLD ($OLDD) -> $NEW ($DATE)"
