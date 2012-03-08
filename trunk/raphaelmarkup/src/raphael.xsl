<?xml version="1.0" encoding="ISO-8859-1"?>

<!-- 
this xsl stylesheet is a template for displaying raphaelmarkup xml documents 
directly in the browser without the need of a xhtml document. 
For usng it in your raphaelmarkup xml documents, 

1) make a copy of it, 

2) edit the <xsl:variable values to point to the correct javascript paths and title

3) Use it like this in your raphaelmarkup XML document:

<?xml version="1.0" encoding="ISO-8859-1"?>

<?xml-stylesheet type="text/xsl" href="./../../raphael.xsl"?>

<raphael id="raphaelDocument1"
	xmlns="http://raphaeljs.com"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://raphaeljs.com ../../raphael.xsd">
	
	<paper x="10" y="10" width="400" height="400">
	...
	</paper>
</raphael>

-->
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
	<html>
	<head>

	<title>
		<xsl:value-of select="$doc.title" />
	</title>

	<script>
		<xsl:attribute name="type">text/javascript</xsl:attribute>
		<xsl:attribute name="src">
	        <xsl:value-of select="$raphael.js.path" />
	      </xsl:attribute>
	</script>

	<script>
		<xsl:attribute name="type">text/javascript</xsl:attribute>
		<xsl:attribute name="src">
        <xsl:value-of select="$jquery.js.path" />
      </xsl:attribute>
	</script>

	<script>
		<xsl:attribute name="type">text/javascript</xsl:attribute>
		<xsl:attribute name="src">
        <xsl:value-of select="$rm.js.path" />
      </xsl:attribute>
	</script>

	</head>

	<body>
	
	<xsl:copy-of select="/"></xsl:copy-of>
	
	 <xsl:element name="script">
		<xsl:attribute name="type">text/javascript</xsl:attribute>			
	 	$(document).ready(function(){
	 		rm.render();
 		}); 
    </xsl:element>
	</body>
	</html>
	
</xsl:template>

</xsl:stylesheet>