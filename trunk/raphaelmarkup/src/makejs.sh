cat rm-core.js > rm.js
cat rm-ext.js >> rm.js
java -jar ../yuicompressor-2.4.7.jar -v -o rm-min_.js rm.js 
echo "/* raphaelmarkup - http://code.google.com/p/raphaelmarkup/ - by Sebastián Gurin - MIT LICENSE */"> rm-min.js
cat rm-min_.js >> rm-min.js
