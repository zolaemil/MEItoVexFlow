
MeiLibTest = function(){
  
  var asserts_passed = 0;
  var asserts_failed = 0;
  var assert = function(val1, val2, equal, test_output) {
    if (equal === undefined) equal = true;
    var result = equal ? val1 === val2 : val1 !== val2
    if (result) {
      asserts_passed += 1;
    } else {
      asserts_failed += 1;
      var fail_info = 'Failed assertion ' + val1 + (equal?'===':'!==') + val2;
      fail_div = $('#' + current_test_id).append('<div class="assertion-fail">' + fail_info +'</div>');
      console.log(fail_info);
      if (test_output) {
        fail_div.append('<div class="test-output">' + serialize_xml(test_output) + '</div>')
        console.log(test_output);
      }
    }
  }
  
  var serialize_xml = function(xml) {
    var serializer = new XMLSerializer();
    var strXML = serializer.serializeToString($(xml).get(0));
    var strMEI_rplc1 = strXML.replace(/</g, '&lt;');
    var strMEI_rplc2 = strMEI_rplc1.replace(/>/g, '&gt;');
    var code = '<pre><code>'+ strMEI_rplc2 +'</code></pre>';
    return code;
  }
  
  var current_test_id = "";
  var start_test = function(test_id) {
    current_test_id = test_id;
    $('#results').append('<div class="test" id="' + test_id + '"></div');
    $('#' + test_id).append('<div class="test-title">' + test_id + '</div>');
    last_asserts_failed = asserts_failed;
  }
  var end_test = function() {
    if (last_asserts_failed === asserts_failed) {
      $('#' + current_test_id).append('<div class="test-pass">Pass</div>');
    } else {
      $('#' + current_test_id).append('<div class="test-fail">Fail</div>');
    }
  }
  
  var summary = function() {
    $('#results').append('<div id="summary"></div>');
    $('div#summary').append('<div class="total-test">Total # of asserts: ' + (asserts_passed + asserts_failed) + '</div>');
    $('div#summary').append('<div class="total-pass">Pass: ' + asserts_passed + '</div>');
    $('div#summary').append('<div class="total-fail">Fail: ' + asserts_failed + '</div>');
  }

  var print_xml = function(xml) {
    document.write(serialize_xml(xml));
  }

  var mei_xml = 'TC.tstamp2id.xml'
  //load the xml file...
  xmlDoc=loadXMLDoc(mei_xml);
  console.log('MEI-XML loaded.'); 

  var score = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  console.log('Start');

  Vex.LogLevel = 5;

  console.log('********* TEST: id2tstamp() **************************************');
  start_test('IDtoTStamp');
  var id2ts_xmlDoc = loadXMLDoc('TC.id2tstamp.xml');
  console.log('MEI-XML loaded.'); 
  var id2ts_score = id2ts_xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');

  var context = [];
  var meter = { count:4, unit:4};
  $(id2ts_score).find('layer').each(function(i, layer) {
    context.push({layer:layer, meter:meter});
  });  

  var tstamp_assert_table = [
    '0m+1',
    '0m+1.5',
    '0m+2.5',
    '0m+3.5',
    '0m+4.5', 
    '1m+1',
    '1m+1.5',
    '1m+2.5',
    '1m+3.5',
    '1m+4.5',
    '2m+1',
    '3m+1',
    '3m+1.5',
    '3m+1.75',
    '3m+2',
    '3m+2.25',
    '3m+2.375',
    '3m+2.5',
    '3m+2.75',
    '3m+3',
    '3m+3.5',
    '3m+3.5',
    '3m+3.5',
    '3m+4',
    '4m+1',
    '4m+1.5',
    '4m+1.5',
    '4m+1.5',
    '4m+2',
    '4m+3',
    '4m+3',
    '4m+3',
    '5m+1',
    '5m+1.75',
    '5m+1.75',
    '5m+1.75',
    '5m+2',
    '5m+3.75',
    '5m+3.75',
    '5m+3.75',
    '5m+4'
  ]
  
  for (var i=1; i<=41; ++i) {
    var id = 'v1e' + ((i<10)?'0':'') + i.toString();
    tstamp =  MeiLib.id2tstamp(id, context);
    assert(tstamp, tstamp_assert_table[i-1]);
  }
  
  end_test();
  

  console.log('********* TEST: EventEnumerator and durationOf() ****************');
  context = [];
  start_test('event-enum-duration-of')
  
  var duration_asserts = [ 
    [ 
      1,
      1, 
      1,
      1
    ],
    [
      0.5,
      0.5,
      1,
      1,
      0.5,
      0.5
    ],
    [
      4
    ],
    [
      0.5,
      0.25,
      0.25,
      0.25,
      0.125,
      0.125,
      0.25,
      0.25,
      0.5,
      0.5,
      1
    ],
    [
      0.5,
      0.5,
      1,
      1,
      0.5
    ],
    [
      0.75,
      0.25,
      1.75,
      0.25,
      1
    ]
  ]
  
  $(score).find('layer').each(function(i, layer) {
    // console.log('<<<<measure ' + (i+1).toString());
    context.push({layer:layer, meter:meter});
    var layerEnum = new MeiLib.EventEnumerator(layer);
    var evnt;
    var j = 0;
    while (!layerEnum.EoI) {
      evnt = layerEnum.nextEvent();
      var id = $(evnt).attr('xml:id'); 
      var idstr = '['+id+']';
      var dur = MeiLib.durationOf(evnt, meter);
      assert(dur, duration_asserts[i][j]);
      j++;
    }
  });
  end_test();
  
  console.log('********* TEST: tstamp2id() **************************************');
  start_test('tstamp2id');
  context = [];
  $(score).find('layer').each(function(i, layer) {
    context.push({layer:layer, meter:meter});
  });

  
  var TCs = {
    tstamp2id:[ { name:'TEST: simple', measure:1 }, 
                { name:'TEST: with beams', measure:2 }, 
                { name:'TEST: mRest', measure:3 },
                { name:'TEST: beams and chord', measure:4 },
                { name:'TEST: chords', measure:5 },
                { name:'TEST: dots', measure:6 } ]
  }

  for (var k=0; k<TCs.tstamp2id.length; ++k) {
    console.log('=================== ' + TCs.tstamp2id[k].name + mei_xml + ':meausre #' + TCs.tstamp2id[k].measure.toString());
    var index=TCs.tstamp2id[k].measure-1;
    var tstamps = ['1', '1.1', '1.25', '1.5', '1.75', '2', '2.1', '2.25', '2.5', '2.9', '3', '3.1', '3.5', '3.9', '4', '4.25', '4.5', '4.75', '5' ];
    for (var i=0; i<tstamps.length; ++i) {
      console.log('tstamp=' + tstamps[i] + '--> xmlid=' + MeiLib.tstamp2id(tstamps[i], context[index].layer, meter));    
      //TO ASSERT: TODO: each tstamp to what's expected (19x6=114 assertions)
    }
  }
  end_test();
  
  console.log('********* TEST: MeiLib.VariantMei ********************************');
  var xmlDoc_variant_mei = loadXMLDoc('TC.Variants.xml');

  var variantMEI = new MeiLib.VariantMei(xmlDoc_variant_mei);
  // print_xml(variantMEI.score);
  console.log(variantMEI.sourceList);
  console.log(variantMEI.APPs);
  
  
  console.log('********* TEST: MeiLib.SingleVariantPathScore() *******************');

  start_test('SingleVariantPathScore');
  var appReplacements = {};
  // appReplacements['app01.l1s1m2'] = new MeiLib.AppReplacement('rdg', 'A_abcd');
  // appReplacements['app02.l1s1m3'] = new MeiLib.AppReplacement('rdg', 'A');
  // var single_path_score = new MeiLib.SingleVariantPathScore(xmlDoc_variant_mei,appReplacements);
  var single_path_score = new MeiLib.SingleVariantPathScore(variantMEI);

  // print_xml(single_path_score.score);
  // console.log(JSON.stringify(single_path_score.variantPath));
  //TO ASSERT: 
  //  1. There's no <app> in the score
  //  2. TODO: There are processing insructions with IDs: app01.l1s1m2, app02.l1s1m3 and app.m8-9
  //  3. variantPath is {"app01.l1s1m2":{"xmlID":"gqhd","tagname":"lem"},"app02.l1s1m3":{"xmlID":"x5h2","tagname":"lem"},"app.m8-9":{"xmlID":"lem.app.m9-10","tagname":"lem"}}
  apps = $(single_path_score.score).find('app');
  assert(apps.length, 0);
  assert(single_path_score.variantPath["app01.l1s1m2"].tagname, "lem");
  assert(single_path_score.variantPath["app02.l1s1m3"].tagname, "lem");
  assert(single_path_score.variantPath["app.m8-9"].tagname, "lem");
  end_test();
  
  

  console.log('********* updateVariantPath() *******************');
  start_test('updateVariantPath');
  var variantPathUpdate = {};
  variantPathUpdate['app01.l1s1m2'] = 'B_xyz';
  variantPathUpdate['app.m8-9'] = 'rdg.app.m9-10';
  single_path_score.updateVariantPath(variantPathUpdate);
  // print_xml(single_path_score.score);
  // console.log(JSON.stringify(single_path_score.variantPath));
  //TO ASSERT:
  //  1. TODO: There are the right notes within the appropriate processing instructions
  //  2. vairantPath is {"app01.l1s1m2":{"xmlID":"B_xyz","tagname":"rdg","source":"B"},"app02.l1s1m3":{"xmlID":"x5h2","tagname":"lem"},"app.m8-9":{"xmlID":"rdg.app.m9-10","tagname":"rdg","source":"A"}} 
  assert(single_path_score.variantPath["app01.l1s1m2"].tagname, "rdg");
  assert(single_path_score.variantPath["app01.l1s1m2"].xmlID, "B_xyz");
  assert(single_path_score.variantPath["app01.l1s1m2"].source, "B");
  assert(single_path_score.variantPath["app02.l1s1m3"].tagname, "lem");
  assert(single_path_score.variantPath["app.m8-9"].tagname, "rdg");
  assert(single_path_score.variantPath["app.m8-9"].xmlID, "rdg.app.m9-10");
  assert(single_path_score.variantPath["app.m8-9"].source, "A");
  end_test();

  console.log('********* getSlice() *******************');

  start_test('getSlice');
  var sliceXML = single_path_score.getSlice({start_n:2, end_n:4, noClef:true, noKey:true, noMeter:true} );
  // print_xml(sliceXML);
  //TO ASSERT: 
  // 1. the result has three measures, 
  // 2. the first measure is @n=2
  // 3. the last measure is @n=4
  // 4. in staffDef @clef.visible = false
  // 5. in staffDef @key.sig.show = false
  // 6. in staffDef @meter.rend = false
  measures = $(sliceXML).find('measure');
  staffDef = $(sliceXML).find('staffDef')[0];
  staves = $(measures[0]).find('staff');
  assert(measures.length, 3);
  assert($(measures[0]).attr('n'), "2");
  assert($(measures[2]).attr('n'), "4");
  assert($(staffDef).attr('clef.visible'), "false");
  assert($(staffDef).attr('key.sig.show'), "false");
  assert($(staffDef).attr('meter.rend'), "false");
  end_test();

  console.log('********* TEST: MeiLib.SliceMEI() ********************************');

  start_test('SliceMEI');
  var xmlDoc_slice = loadXMLDoc('TC.Slice.xml');
  var score2slice = xmlDoc_slice.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score')[0];
  var slice  = MeiLib.SliceMEI(score2slice, {start_n:1, end_n:8, noClef:true, noKey:true, noMeter:true, staves:[1, 3], noConnectors:true});
  // print_xml(slice);
  //TO ASSERT: 
  // 1. the result has 8 measures, 
  // 2. in staffDef @clef.visible = false
  // 3. in staffDef @key.sig.show = false
  // 4. in staffDef @meter.rend = false
  // 5. there are two staves
  // 6. first staff is @n=1
  // 7. second staff is @n=3
  measures = $(slice).find('measure');
  staffDef = $(slice).find('staffDef')[0];
  staves = $(measures[0]).find('staff');
  assert(measures.length, 8, true, slice);
  assert($(staffDef).attr('clef.visible'), "false");
  assert($(staffDef).attr('key.sig.show'), "false");
  assert($(staffDef).attr('meter.rend'), "false");
  assert(staves.length, 2);
  assert($(staves[0]).attr('n'), "1");
  assert($(staves[1]).attr('n'), "3");
  
  var sliceAllStaves  = MeiLib.SliceMEI(score2slice, {start_n:4, end_n:7, noClef:false, noKey:false, noMeter:false});
  // print_xml(sliceAllStaves);
  //TO ASSERT: 
  // 1. the result has 4 measures, 
  // 2. the first measure has @n=4
  // 2. in staffDef @clef.visible isn't false false
  // 3. in staffDef @key.sig.show = false
  // 4. in staffDef @meter.rend = false
  // 5. there are four staves
  measures = $(sliceAllStaves).find('measure');
  staffDef = $(sliceAllStaves).find('staffDef')[0];
  staves = $(measures[0]).find('staff');
  assert(measures.length, 4);
  assert($(measures[0]).attr('n'), "4", true, sliceAllStaves);
  assert($(staffDef).attr('clef.visible'), "false", false);
  assert($(staffDef).attr('key.sig.show'), "false", false);
  assert($(staffDef).attr('meter.rend'), "false", false);
  assert(staves.length, 4);
  
  end_test();

  console.log('********* TEST: MeiLib.VariantMei.prototype.getSlice() ***********');

  start_test('VariantMei-prototype-getSlice');
  var sliceMEI = variantMEI.getSlice({start_n:2, end_n:2, noClef:true, noKey:true, noMeter:true});
  var lem = new MeiLib.SingleVariantPathScore(sliceMEI);
  var rdg1 = new MeiLib.SingleVariantPathScore(sliceMEI, {
    'app01.l1s1m2': new MeiLib.AppReplacement('rdg', 'A_abcd'),
  });
  var rdg2 = new MeiLib.SingleVariantPathScore(sliceMEI, {
    'app01.l1s1m2': new MeiLib.AppReplacement('rdg', 'B_xyz'),
  });
  //TO ASSERT: 
  //  1. sliceMEI has one measure
  //  2. that measure has @n=2
  measures = $(sliceMEI.score).find('measure');
  assert(measures.length, 1, true, sliceMEI.score);
  assert($(measures[0]).attr('n'), "2", true, sliceMEI.score);

  end_test();

  console.log('********* TEST: MeiLib.RichMei - Simple ***********');
  start_test('RichMei-Simple');
  var xmlid_asserts = {
    'app-recon':{} , 
    'choice01':{}, 
    'app-var':{} 
  };
  var xmlDoc_rich_mei = loadXMLDoc('TC.CanonicalMEI.01.xml');
  var meiDoc = new MeiLib.MeiDoc(xmlDoc_rich_mei);

  console.log(meiDoc.APPs);
  var i;
  for (var appID in meiDoc.ALTs) {
    assert(xmlid_asserts.hasOwnProperty(appID), true);
  }  
  meiDoc.initSectionView();
  // TO ASSERT: 
  //  1. It is a plain MEI, that is:
  //    * there isn't any app or choice
  //    * sectionplane is... 
  console.log(meiDoc.sectionplane);
  apps = $(meiDoc.sectionview_score).find('app');
  choices = $(meiDoc.sectionview_score).find('app');
  assert(apps.length, 0);
  assert(choices.length, 0);
  assert(meiDoc.sectionplane["app-recon"], undefined);
  assert(meiDoc.sectionplane["choice01"].tagname, "corr");
  assert(meiDoc.sectionplane["app-var"].tagname, "lem");
  end_test();

  console.log('********* TEST: MeiLib.RichMei - Altgroups ***********');
  start_test('RichMei-Altgroups');
  var xmlid_asserts = {
    'app-recon-01':{} , 
    'app-recon-02':{} , 
    'choice01':{}, 
    'app-var-01':{},
    'app-var-02':{} 
  };
  xmlDoc_rich_mei = loadXMLDoc('TC.CanonicalMEI.02.xml');
  meiDoc = new MeiLib.MeiDoc(xmlDoc_rich_mei);

  var i;
  for (var appID in meiDoc.ALTs) {
    assert(xmlid_asserts.hasOwnProperty(appID), true);
  }  
  meiDoc.initSectionView();
  console.log(meiDoc.sectionplane);
  console.log(meiDoc.altgroups);

  apps = $(meiDoc.sectionview_score).find('app');
  choices = $(meiDoc.sectionview_score).find('app');
  assert(apps.length, 0);
  assert(choices.length, 0);
  assert(meiDoc.sectionplane["app-recon-01"], undefined);
  assert(meiDoc.sectionplane["app-recon-02"], undefined);
  assert(meiDoc.sectionplane["choice01"].tagname, "corr");
  assert(meiDoc.sectionplane["app-var-01"].tagname, "lem");
  assert(meiDoc.sectionplane["app-var-02"].tagname, "lem");
  
  assert(meiDoc.altgroups["app-recon-01"][0], "app-recon-01");
  assert(meiDoc.altgroups["app-recon-01"][1], "app-recon-02");
  assert(meiDoc.altgroups["app-recon-02"][0], "app-recon-01");
  assert(meiDoc.altgroups["app-recon-02"][1], "app-recon-02");
  assert(meiDoc.altgroups["app-var-01"][0], "app-var-01");
  assert(meiDoc.altgroups["app-var-01"][1], "app-var-02");
  assert(meiDoc.altgroups["app-var-02"][0], "app-var-01");
  assert(meiDoc.altgroups["app-var-02"][1], "app-var-02");
  end_test();

  console.log('********* TEST: MeiLib.RichMei - Modify Section View ***********');
  start_test('RichMei-SectionView');
  xmlDoc_rich_mei = loadXMLDoc('TC.CanonicalMEI.02.xml');
  meiDoc = new MeiLib.MeiDoc(xmlDoc_rich_mei);
  meiDoc.initSectionView();

  console.log('sectionplane after init: ');
  console.log(meiDoc.sectionplane);
  assert(meiDoc.sectionplane["app-recon-01"], undefined);
  assert(meiDoc.sectionplane["app-recon-02"], undefined);
  assert(meiDoc.sectionplane["choice01"].tagname, "corr");
  assert(meiDoc.sectionplane["app-var-01"].tagname, "lem");
  assert(meiDoc.sectionplane["app-var-02"].tagname, "lem");
    
  var sectionplaneUpdate = {};
  sectionplaneUpdate["app-recon-01"] = "rdgA.app-recon-01";
  sectionplaneUpdate["choice01"] = "sic-choice01";
  sectionplaneUpdate["app-var-01"] = "rdg.app-var-01";
  meiDoc.updateSectionView(sectionplaneUpdate);

  console.log('sectionplane after modifySectionview: ');
  console.log(meiDoc.sectionplane);
  // print_xml(meiDoc.sectionview_score);
  assert(meiDoc.sectionplane["app-recon-01"].xmlID, "rdgA.app-recon-01");
  assert(meiDoc.sectionplane["app-recon-02"].xmlID, "rdgA.app-recon-02");
  assert(meiDoc.sectionplane["choice01"].xmlID, "sic-choice01");
  assert(meiDoc.sectionplane["app-var-01"].xmlID, "rdg.app-var-01");
  assert(meiDoc.sectionplane["app-var-02"].xmlID, "rdg.app-var-02");
  
  
  end_test();
  console.log('Done');
  
  summary();
  

	
}