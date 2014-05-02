function loadXMLDoc(xmlDoc) {
  var xmlhttp;
  if (window.XMLHttpRequest) {
    // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp = new XMLHttpRequest();
  } else {
    // code for IE6, IE5
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }
  xmlhttp.open("GET", xmlDoc, false);
  xmlhttp.send();
  //  var result = xmlhttp.responseXML;
  var result = createXMLDoc(xmlhttp.responseText.replace(/(<[\/]?)[\w]+:/g, '$1'));
  if (!result)
    throw "Error loading xml document: '" + xmlDoc + "' cannot be loaded!"
  return result;
}

function createXMLDoc(str) {
  var xmlDoc, parser;
  // str = this.removeNS(str);
  if (window.DOMParser) {
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(str, "text/xml");
  } else// Internet Explorer
  {
    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
    xmlDoc.async = false;
    xmlDoc.loadXML(str);
  }
  return xmlDoc;
};