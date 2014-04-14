
MEI2VF.RunTest = function(test_case, canvas, titleElem, backend){

  $(titleElem).html(test_case.title);
  var canvas_width = test_case.canvas_width || 1031;
  var canvas_height = test_case.canvas_height || 200;
  $(canvas).attr('width', canvas_width);
  $(canvas).attr('height', canvas_height);
  var score_width = canvas_width; // - 50;
  var score_height = canvas_height; // - 50;

  //load the xml file...
  window.console.log("Running Test Case Title: '" + test_case.title + "' MEI-XML: '" + test_case.mei_xml + "'");
  xmlDoc=loadXMLDoc(test_case.mei_xml);
  if (xmlDoc) { 
    window.console.log('MEI-XML loaded.'); 
  } else {
    //TODO: throw exception
  }
  //... and render it onto the canvas
  var MEI = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  window.console.log('Rendering... ');
  MEI2VF.render_notation(MEI, canvas, score_width, score_height, backend, test_case.options);
  window.console.log('Done (' + test_case.title + ')');
	
}

