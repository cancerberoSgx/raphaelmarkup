raphaël markup 

This project main objective is to let the users compose drawings using an xml markup.
The drawing api and engine is based on raphaël javascript drawing library (raphaeljs.com)

This project hsa two main parts:

1) XML document definition for raphaël drawing. 
See src/raphael.xsd

2) javascript renderer for rendering a raphael XML document in an HTML document. 
See src/rm.js




how can you write and publish on internet raphael drawings in xml format?

First option: 
put the <raphael element inside your html document, like test/raphaeltest1.html. 
Be careful of adding jquery, raphael and rm.js scripts in your document:

<html>
<head>
	<script src="../deps/jquery-1.7.1.min.js"></script>
	<script src="../deps/raphael-min.js"></script>
	<script type="text/javascript" src="../rm.js"></script>
<title>Raphael markup test 1</title>
</head>
<body>
<raphael id="raphaelDocument1"
	xmlns="http://raphaeljs.com"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://raphaeljs.com ../raphael.xsd">
	
	<paper x="10" y="10" width="400" height="400">
		<rect x="20" y="30" width="100" height="200"></rect>
		<rect x="200" y="30" width="100" height="200"></rect>
		<circle cx="20" cy="300" radius="20" stroke="red"></circle>
		
		<set class="set1">
			<circle cx="220" cy="300" radius="40" stroke="red"></circle>
			<rect x="333" y="130" width="20" height="40"></rect>
			<ellipse x="333" y="330" rx="20" ry="40"></ellipse>
		</set>
	</paper>
</raphael>
<script type="text/javascript">
/* render the raphael document */
rm.render(document, "#raphaelDocument1", null);
</script>
</body>
</html> 


Second option: Render the xml document with an XSL stylesheet. raphaelmarkup comes with a
XSL stylesheet that will transform raphaelmarkup xml in xhtml, so browsers can open the xml file directly.
The steps for creating a drawing1 drawing are:
1) create a drawing1.xsl file with the following content:

<?xml version="1.0" encoding="ISO-8859-1"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">		
	<xsl:variable name="doc.title" select="'raphael markup test1'" />
	<xsl:variable name="raphael.id" select="'raphaelDocument1'" />	
	<xsl:variable name="raphael.js.path" select="'../../deps/raphael-min.js'" />
	<xsl:variable name="jquery.js.path" select="'../../deps/jquery-1.7.1.min.js'" />
	<xsl:variable name="rm.js.path" select="'../../rm.js'" />
	<xsl:include href="../../raphael.xsl"/> 	
	<xsl:template match="*">
	</xsl:template>
</xsl:stylesheet>

2) be sure of editing the <xsl:variable and <xsl:include attributes for correctly pointing
to the necesary javascript files and raphael.xsl file.

3) compose your raphael markup in the file drawing1.xml and link drawing1.xsl stylesheet, like this:

<?xml version="1.0" encoding="ISO-8859-1"?>
<?xml-stylesheet type="text/xsl" href="index2.xsl"?>
<raphael>	
	<paper x="10" y="10" width="400" height="400">
		<rect x="20" y="30" width="100" height="200"></rect>
		<rect x="200" y="30" width="100" height="200"></rect>
		<circle cx="20" cy="300" radius="20" stroke="red"></circle>
		
		<set class="set1">
			<circle cx="220" cy="300" radius="40" stroke="red"></circle>
			<rect x="333" y="130" width="20" height="40"></rect>
			<ellipse x="333" y="330" rx="20" ry="40"></ellipse>
		</set>
	</paper>
</raphael> 

4) try to open the drawing1.xml file in your favourite browser.
IMPORTANT: this may not work with local files. publish all files in a web server, like apache or tomcat, and open drawing1.xml from there.  









CSS like style support
it is important to know that current CSS like support is not CSS. Some CSS language rules are not supported or differet. for example:  
	paper rect { 
 		fill: blue; 
 		opacity: 0.5; 
 		stroke-width: 10  
 	} 
	.set1 {
		fill: yellow;
	}
 	.set1 circle { 
 		fill: black; 
 		stroke: red; 
 		stroke-width: 4; 
 		opacity: 0.8
	} 	
	/* note about sets. here is a difference between CSS. here, one may think that 
	the (last) rectangle inside the set should be filled 
	with yellow, because of the second css rule. But no, 
	the rule affecting that rect is the first, "paper rect. 
	Note that .set1 is affecting the last ellipse in the set.*/
	
	





preprosessing tags : <template and <use for defining templates

we can define templates using the <template tag and then call the template with <use

Note that these two tags are proccessed before renderizaton and won't be 
included in resulting DOM. The resulting DOM will contain the template 
application results. For avoiding errors this why <use must be always 
inside a <template el.

In template body, attributes values must be valid javascript expressions. 
If you want If you don't want to evaluate anything then use a javascript string


<template name="face">
	<param name="leftEyeColor"></param>
	...	
	<body>
	<set class="face1">
		<use template="eye">
			<param name="color" value="'${leftEyeColor}'"></param>
		</use>
	</set>
	</body>	
</template>




TODO: template can extends other templates. this will only means that 
the parent will be applyed first, and the the extended definition. 
Child template can reference parameters of the parent template.


<template name="face">
	
	<!-- a variable definition that can be used with {} like a parameter.
	<var name="radius" value="80"></var>
	
	<!-- template parameter definition -->
	<param name="leftEye"></param>
	<param name="leftEye"></param>
	<param name="rightEye"></param>
	
	<body>
	<set class="face1">
		<use template="eye">
			<param name="color" value="blue"></param>
		</use>
	</set>
	</body>
	
</template>


<template name="eye">

	<!-- template parameter definition -->
	<param name="leftEye"></param>
	<param name="rightEye"></param>
	<param name="mouth"></param>
	
	<body>
	<set class="face1">
		<use template="eye">
			<param name="color" value="blue"></param>
		</use>
	</set>
	</body>
	
</template>



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











<!-- 			<%for(var i=0; i&lt;circleCount; circleCount++) {%> -->
<!-- 				<circle cx="<%= cx+randomBetween(10, size)" -->
<!-- 					cy="<%= cy+randomBetween(10, size)" -->
<!-- 					fill="<%=randomColor()$>" -->
<!-- 					r="<%=circleMaxRadius%>" -->
<!-- 					stroke-width="2" stroke="<%=randomColor()$>"></circle> -->
<!-- 			<%}%>				 -->