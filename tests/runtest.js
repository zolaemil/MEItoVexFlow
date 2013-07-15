
MEI2VF.RunTest = function(test_case, canvas, titleElem){

  $(titleElem).html(test_case.title);

  //load the xml file...
  Vex.LogInfo("Running Test Case Title: '" + test_case.title + "' MEI-XML:" + (test_case.mei_xml_file?"'"+test_case.mei_xml_file+"'":'embedded'));
  
  if (test_case.mei_xml_file) {
    xmlDoc=loadXMLDoc(test_case.mei_xml_file);
  } else {
    
    if (window.DOMParser)
      {
      parser=new DOMParser();
      xmlDoc=parser.parseFromString(test_case.mei_xml_string,"text/xml");
      }
    else // Internet Explorer
      {
      xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async=false;
      xmlDoc.loadXML(text); 
      }
  }
  
  if (xmlDoc) { 
    Vex.LogInfo('MEI-XML loaded.'); 
  } else {
    Vex.LogInfo('TEST FAILED: MEI-XML cannot be loaded.'); 
  }

  //... and render it onto the canvas
  var MEI = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  Vex.LogInfo('Rendering... ');
  MEI2VF.render_notation(MEI, canvas, 981,400);
  Vex.LogInfo('Done (' + test_case.title + ')');
	
}
