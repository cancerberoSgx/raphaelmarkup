cd ..
rm -rf dist
svn export . dist
cd dist/src

cat rm-core.js > rm.js
cat rm-ext.js >> rm.js
java -jar ../../yuicompressor-2.4.7.jar -v -o rm-min.js rm.js 
