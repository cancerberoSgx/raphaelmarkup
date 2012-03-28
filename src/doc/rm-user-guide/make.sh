#generation of htmls and pdf from docbook.
#author: sgurin

NAME=rm-user-guide
#clean
rm -rf $NAME-pdf
mkdir $NAME-pdf

rm -rf $NAME-htmls
rm -rf $NAME-html
rm $NAME.tgz

#pdf
dblatex -o $NAME-pdf/$NAME.pdf $NAME.xml

#multiple htmls
db2html $NAME.xml
cp -r images $NAME/images
mv $NAME $NAME-htmls
cp $NAME-htmls/t1.html $NAME-htmls/index.html
chmod -R a+x $NAME-htmls

tar cvfz $NAME-htmls.tgz $NAME-htmls

mkdir $NAME-html
db2html --nochunks $NAME.xml > $NAME-html/$NAME.html
