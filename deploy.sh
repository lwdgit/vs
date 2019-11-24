#!/bin/sh
rm -rf ./public
npm run build
cd ./public
git init
git add .
git commit -m 'push to gh-pages'
git push --force git@github.com:anvaka/vs.git master:gh-pages
cd ../
git tag `date "+release-%Y%m%d%H%M%S"`
git push --tags
