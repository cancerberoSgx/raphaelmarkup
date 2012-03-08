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