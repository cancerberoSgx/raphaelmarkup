cat rm.js > rm-all.js
cat rm-ext.js >> rm-all.js
java -jar ../yuicompressor-2.4.7.jar -o rm-all-min.js rm-all.js 
