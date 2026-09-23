#!/usr/bin/env sh
# Rebuild js/hero-scene.bundle.js from js/hero-scene.js.
#
# The plain `npx esbuild js/hero-scene.js --bundle ...` you may see quoted
# elsewhere DOES NOT WORK here: hero-scene.js imports the bare specifier "three",
# which the page resolves through the importmap in index.html. esbuild does not
# read importmaps and there is no node_modules, so it fails with
#   Could not resolve "three"
# and leaves the old bundle in place — the page keeps running the previous build
# and your edit looks like it did nothing. Hence the explicit aliases below.
set -e
cd "$(dirname "$0")"

V=./vendor/three
npx --yes esbuild js/hero-scene.js --bundle --format=iife --minify --target=es2019 \
  --alias:three=$V/three.module.js \
  --alias:three/addons/lines/Line2.js=$V/addons/lines/Line2.js \
  --alias:three/addons/lines/LineMaterial.js=$V/addons/lines/LineMaterial.js \
  --alias:three/addons/lines/LineGeometry.js=$V/addons/lines/LineGeometry.js \
  --alias:three/addons/lines/LineSegments2.js=$V/addons/lines/LineSegments2.js \
  --alias:three/addons/lines/LineSegmentsGeometry.js=$V/addons/lines/LineSegmentsGeometry.js \
  --outfile=js/hero-scene.bundle.js

echo "built js/hero-scene.bundle.js"
ls -l js/hero-scene.bundle.js
