raphaël markup 

This project main objective is to let the users compose drawings using an xml markup.
The drawing api and engine is based on raphaël javascript drawing library (raphaeljs.com)

This project hsa two main parts:

1) XML document definition for raphaël drawing. 
See src/raphael.xsd

2) javascript renderer for rendering a raphael XML document in an HTML document. 
See src/rm.js


A common use case:

Somebody want to compose a drawing in an existing html document with XML inside te html document. 
@see src/test/raphaeltest1.html 

More: the person can manipulate the raphael XML DOM (using jquery or XML API)
and see the changes in the drawing dynamically. (this feature relies on standar XML mutation events, that is not fully portable...)

Other interesting feature, the XML document definition support <styles> css like style definitions.
I support CSS3 selectors (any selector supported by jquery), and CSS properties are raphaël shape attribute names
More: modifying dynamically the XML DOM will dynamically update styles defined in <style> 



an attempt of defining an xml and css syntax for raphael based drawings. 

task 1) 
xml : task one: define rapx - a raphael shape xml syntax. write a dtd for raphael shapes, sets, anims, etc.
each raphael element can be ided and classified like html


task 2) 
be able of read/write raphael element attribts from/to css code.

task 3) write a renderer that is feeded with rapx+rapss and renders all in a paper.
tip use this for parsing xml: http://stackoverflow.com/questions/2908899/jquery-wont-parse-xml-with-nodes-called-option