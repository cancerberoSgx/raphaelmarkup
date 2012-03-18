VERSION=1.0
DISTNAME=raphaelmarkup-$VERSION

#sh makejs.sh

cd ..
rm -rf dist
mkdir dist
svn export . dist/$DISTNAME
cd dist/$DISTNAME/src

cat rm-core.js > rm.js
cat rm-ext.js >> rm.js
java -jar ../../../yuicompressor-2.4.7.jar -v -o rm-min_.js rm.js 
echo "/* raphaelmarkup - http://code.google.com/p/raphaelmarkup/ - by Sebastián Gurin - MIT LICENSE */"> rm-min.js
cat rm-min_.js >> rm-min.js
rm -r rm-min_.js

cd ../.. #dist
tar cvfz $DISTNAME.tar.gz $DISTNAME
rm -rf $DISTNAME