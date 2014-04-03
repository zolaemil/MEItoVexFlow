/*
* MeiLib - General purpose JavaScript functions for processing MEI documents.
* 
* meilib.js
*
* Author: Zoltan Komives
* Created: 05.07.2013
* 
* Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
* University of Maryland
* 
* Licensed under the Apache License, Version 2.0 (the "License"); you
* may not use this file except in compliance with the License.  You may
* obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
* implied.  See the License for the specific language governing
* permissions and limitations under the License.
*/

var MeiLib = {};

MeiLib.RuntimeError = function (errorcode, message) {
  this.errorcode = errorcode;
  this.message = message;
}

MeiLib.RuntimeError.prototype.toString = function() {
  return 'MeiLib.RuntimeError: ' + this.errorcode + ': ' + this.message?this.message:"";
}

MeiLib.createPseudoUUID = function() {
  return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).substr(-4)
}

/**
* Enumerate over the children events of node (node is a layer or a beam).
* 
* @param node an XML DOM object
*/
MeiLib.EventEnumerator = function (node) {
  this.init(node);
}

MeiLib.EventEnumerator.prototype.init = function(node) {
  if (!node) throw new MeiLib.RuntimeError('MeiLib.EventEnumerator.init():E01', 'node is null or undefined');
  this.node = node;
  this.next_evnt = null;
  this.EoI = true; // false if and only if next_evnt is valid.
  this.children = $(this.node).children();
  this.i_next = -1;
  this.read_ahead();
}

MeiLib.EventEnumerator.prototype.nextEvent = function() {
  if (!this.EoI) {
    var result = this.next_evnt;
    this.read_ahead();
    return result;
  }
  throw new MeiLib.RuntimeError('MeiLib.LayerEnum:E01', 'End of Input.')
}

MeiLib.EventEnumerator.prototype.read_ahead = function() {
  if (this.beam_enumerator) { 
    if (!this.beam_enumerator.EoI) {
      this.next_evnt = this.beam_enumerator.nextEvent();
      this.EoI = false;
    } else {
      this.EoI = true;
      this.beam_enumerator = null;
      this.step_ahead()
    }
  } else {
    this.step_ahead()
  }
}

MeiLib.EventEnumerator.prototype.step_ahead = function () {
  ++this.i_next;
  if (this.i_next < this.children.length) 
  { 
    this.next_evnt = this.children[this.i_next];
    var node_name = $(this.next_evnt).prop('localName');
    if (node_name === 'note' || node_name === 'rest' || node_name === 'mRest' || node_name === 'chord') {
      this.EoI = false
    } else if (node_name === 'beam') {
      this.beam_enumerator = new MeiLib.EventEnumerator(this.next_evnt);
      if (!this.beam_enumerator.EoI) {
        this.next_evnt = this.beam_enumerator.nextEvent();
        this.EoI = false;        
      } else {
        this.EoI = true;
      }
    }
  } else {
    this.EoI = true;
  }
}


/**
* Calculate the duration of an event (number of beats) according to the given meter.
* 
* Event refers to musical event such as notes, rests, chords. The MEI element <space/> is also
* considered an event.
* 
* @param evnt an XML DOM object
* @param meter the time signature object { count, unit }
*/
MeiLib.durationOf = function (evnt, meter) {

  IsSimpleEvent = function(tagName) {
    return (tagName === 'note' || tagName === 'rest' || tagName === 'space');
  }

  var durationOf_SimpleEvent = function(simple_evnt, meter) {
    var dur = $(simple_evnt).attr('dur');
    if (!dur) throw new MeiLib.RuntimeError('MeiLib.durationOf:E04', '@dur of <note>, <rest> or <space> must be specified.');
    return MeiLib.dotsMult(simple_evnt) * MeiLib.dur2beats(Number(dur), meter);    
  }
  
  var durationOf_Chord = function(chord, meter, layer_no) {
    if (!layer_no) layer_no = "1";
    var dur = $(chord).attr('dur');
    var dotsMult = MeiLib.dotsMult(chord);
    if (dur) return dotsMult * MeiLib.dur2beats(Number(dur), meter);
    $(chord).find('note').each(function(){ 
      lyr_n = $(this).attr('layer');
      if (!lyr_n || lyr_n === layer_no) {
        var dur_note = $(this).attr('dur');
        var dotsMult_note = MeiLib.dotsMult(chord);
        if (!dur && dur_note) { 
          dur = dur_note; 
          dotsMult = dotsMult_note;
        } else if (dur && dur != dur_note) {
          throw new MeiLib.RuntimeError('MeiLib.durationOf:E05', 'duration of <chord> is ambiguous.');
        }
      }
    });
    if (dur) return dotsMult * MeiLib.dur2beats(Number(dur), meter);
    throw new MeiLib.RuntimeError('MeiLib.durationOf:E06', '@dur of chord must be specified either in <chord> or in at least one of its <note> elements.');
  }

  var durationOf_Beam = function(beam, meter) {
    var acc=0;
    beam.children().each(function() {
      var dur_b;
      var dur;
      var tagName = this.prop('localName');
      if ( IsSimpleEvent(tagName) ) {
        dur_b = durationOf_SimpleEvent(this, meter);
      } else if ( tagName === 'chord' ) {
        dur_b = durationOf_Chord(this, meter);
      } else {
        throw new MeiLib.RuntimeError('MeiLib.durationOf:E03', "Not supported element '" + tagName + "'");
      }
      acc += dur_b;
    });
    return acc;
  }
  
  var evnt_name = $(evnt).prop('localName');
  if ( IsSimpleEvent(evnt_name) ) {
    return durationOf_SimpleEvent(evnt, meter);
  } else if (evnt_name === 'mRest') {
    return meter.count;
  } else if (evnt_name === 'chord') {
    return durationOf_Chord(evnt, meter);
  } else if (evnt_name === 'beam') {
    return durationOf_Beam(evnt, meter);
  } else {
    throw new MeiLib.RuntimeError('MeiLib.durationOf:E05', "Not supported element: '" + evnt_name + "'");
  }
  
}


/*
* Find the event with the minimum distance from of the given timestamp.
* 
* @param tstamp {String} the timestamp to match against events in the given context. Local timestamp only (without measure part).
* @param layer {Obejct} an XML DOM object, contains all events in the given measure.
* @param meter {Object} the effective time signature object { count, unit } in the measure containing layer.
* @return {String} the xml:id of the closest element, or undefined if <code>layer</code> contains no events.
*/
MeiLib.tstamp2id = function ( tstamp, layer, meter ) {
  var ts = Number(tstamp); 
  var ts_acc = 0;  // total duration of events before current event
  var c_ts = function() { return ts_acc+1; } // tstamp of current event
  var distF = function() { return ts - c_ts(); } // signed distance between tstamp and tstamp of current event;

  var eventList = new MeiLib.EventEnumerator(layer); 
  var evnt;
  var dist;
  var prev_evnt; // previous event
  var prev_dist; // previuos distance
  while (!eventList.EoI && (dist === undefined || dist>0)) {
    prev_evnt = evnt;
    prev_dist = dist;
    evnt = eventList.nextEvent();
    dist = distF();    
    ts_acc += MeiLib.durationOf(evnt, meter);
  }

  if (dist === undefined) return undefined;
  var winner;
  if (dist < 0) {
    if (prev_evnt && prev_dist<Math.abs(dist) ) { winner = prev_evnt; }
    else { winner = evnt; }
  } else {
    winner = evnt;
  } 
  var xml_id;
  xml_id = $(winner).attr('xml:id');
  if (!xml_id) {
    xml_id = MeiLib.createPseudoUUID();
    $(winner).attr('xml:id', xml_id);
  }
  return xml_id;
}

MeiLib.XMLID = function(elem) {
  xml_id = $(elem).attr('xml:id');
  if (!xml_id) {
    xml_id = MeiLib.createPseudoUUID();
    $(elem).attr('xml:id', xml_id);
  }
  return xml_id;
}

/*
* Calculates a timestamp value for an event in a given context. (Event refers to musical events such 
* as notes, rests and chords).
* 
* @param eventid {String} the xml:id of the event
* @param context {Array} of contextual objects {layer, meter}. Time signature is mandatory 
*                        for the first one, but optional for the rest. All layers belong to a single 
*                        logical layer. They are the layer elements from some consequtive measures.
* @return {String} the MEI timestamp value (expressed in beats relative to the meter of the measure containing the event)
*                  of all events that happened before the given event in the given context. If the event is not in the first 
*                  measure (layer) the timestamp value contains a 'measure part', that is for example 2m+2 if the
*                  event is at the second beat in the 3rd measure.
*/
MeiLib.id2tstamp = function (eventid, context) {
  var meter;
  var found = false;
  for (var i=0; i<context.length && !found; ++i) {   
    if (context[i].meter) meter = context[i].meter;
    if (i===0 && !meter) throw new MeiLib.RuntimeError('MeiLib.id2tstamp:E001', 'No time signature specified');

    var result = MeiLib.sumUpUntil(eventid, context[i].layer, meter);
    if (result.found) {
      found = true;
      return i.toString() + 'm' + '+' + (result.beats+1).toString();
    } 
  }
  throw new MeiLib.RuntimeError('MeiLib.id2tstamp:E002', 'No event with xml:id="' + eventid + '" was found in the given MEI context.');
};


/*
* Convert absolute duration into relative duration (nuber of beats) according to time signature.
* 
* @param dur {Number} reciprocal value of absolute duration (e.g. 4->quarter note, 8->eighth note, etc.)
* @param meter the time signature object { count, unit }
* @return {Number}
*/
MeiLib.dur2beats = function(dur, meter) {
  return (meter.unit/dur);
}

/*
* Convert relative duration (nuber of beats) into absolute duration (e.g. quarter note, 
* eighth note, etc) according to time signature.
* 
* @param beats {Number} duration in beats
* @param meter time signature object { count, unit }
* @return {Number} reciprocal value of absolute duration (e.g. 4 -> quarter note, 8 -> eighth note, etc.)
*/
MeiLib.beats2dur = function(beats, meter) {
  return (meter.unit/beats);
}

/**
 * Converts the <code>dots</code> attribute value into a duration multiplier. 
 *
 * @param node XML DOM object containing a node which may have <code>dots</code> attribute
 * @return {Number} The result is 1 if no <code>dots</code> attribute is present. For <code>dots="1"</code> 
 *                  the result is 1.5, for <code>dots="2"</code> the result is 1.75, etc.
 */
MeiLib.dotsMult = function(node) {
  var dots = $(node).attr('dots');
  dots = Number(dots || "0");
  var mult = 1;
  for (;dots>0;--dots) { mult += (1/Math.pow(2,dots)) };  
  return mult;
}

/**
* For a given event (such as note, rest chord or space) calculates the combined legth of preceding events, 
* or the combined lenght of all events if the given event isn't present.
* 
* @param eventid {String} the value of the xml:id attribute of the event
* @param layer {Object} an XML DOM object containing the MEI <Layer> element
* @param meter the time signature object { count, unit }
* @return an object { beats:number, found:boolean }.
*          1. 'found' is true and 'beats' is the total duration of the events that happened before the 
*               event 'eventid' within 'layer', or
*          2. 'found' is false and 'beats is the total duration of the events in 'layer'.       
*/
MeiLib.sumUpUntil = function(eventid, layer, meter) {
  
  var sumUpUntil_inNode = function(node_elem) {
    var node = $(node_elem);
    var node_name = node.prop('localName');
    if (node_name === 'note' || node_name === 'rest') { 
      if (node.attr('xml:id') === eventid) {
        return { beats:0, found:true };
      } else {
        var dur = Number(node.attr('dur'));
        if (!dur) throw new MeiLib.RuntimeError('MeiLib.sumUpUntil:E001', "Duration is not a number ('breve' and 'long' are not supported).");
        var dots = node.attr('dots');
        dots = Number(dots || "0");
        var beats = MeiLib.dotsMult(node) * MeiLib.dur2beats(dur, meter);
        
        return { beats:beats, found:false };
      }
    } else if (node_name === 'mRest') {
      if (node.attr('xml:id') === eventid) {
        found = true;
        return { beats:0, found:true };
      } else {
        return { beats:meter.count, found:false }; //the duration of a whole bar expressed in number of beats.
      }
    } else if (node_name === 'layer' || node_name === 'beam') {
      
      //sum up childrens' duration
      var beats = 0;
      var children = node.children();
      var found = false;
      for (var i=0; i<children.length && !found; ++i) {
        var subtotal = sumUpUntil_inNode(children[i]);
        beats += subtotal.beats;
        found = subtotal.found;
      }
      return { beats:beats, found:found };
    } else if (node_name === 'chord') {
      var chord_dur = node.attr('dur'); 
      if (node.attr('xml:id')===eventid) {
        return { beats:0, found:true };
      } else {        
        //... or find the longest note in the chord ????
        var chord_dur = node.attr('dur'); 
        if (chord_dur) { 
          if (node.find("[xml\\:id='" + eventid + "']").length) {
            return { beats:0, found:true };
          } else {
            return { beats:MeiLib.dur2beats(chord_dur, meter), found:found };
          }        
        } else {
          var children = node.children();
          var found = false;
          for (var i=0; i<children.length && !found; ++i) {
            var subtotal = sumUpUntil_inNode(children[i]);
            beats = subtotal.beats;
            found = subtotal.found;
          }
          return { beats:beats, found:found };            
        }
      };
    }    
    return { beats:0, found:false };
  }


  return sumUpUntil_inNode(layer);  
}

/**
 * Returns a slice of the MEI. The slice is specified by the number of the starting and ending measures.
 *
 * About the <code>staves</code> parameter: it specifies a list of staff numbers. If it is defined, only the listed staves
 * will be kept in the resulting slice. The following elements will be removed from:
 *   1. <staffDef> elements (@staff value is matched against the specified list)
 *   2. <staff> elements (@n value is matched against the specified list)
 *   3. any other child element of measures that has @staff specified AND it is not listed.
 * 
 * Note that <staff> elements without @n will be removed.
 * 
 * @param params {obejct} like { 
 *                               start_n:NUMBER, 
 *                               end_n:NUMBER, 
 *                               noKey:BOOLEAN, 
 *                               noClef:BOOLEAN, 
 *                               noMeter:BOOLEAN,
 *                               noConnectors, 
 *                               staves:[NUMBER] 
 *                             },
 *                        where <code>noKey</code>, <code>noClef</code> and <code>noMeter</code> and <code>noConnectors</code> 
 *                        are optional. taves is optional. If staves is set, it is an array of staff numbers. Only the staves 
 *                        specified in the list will be included in the resulting MEI.
 * @return XML DOM object
 */
MeiLib.SliceMEI = function(MEI, params) {
  
  var setVisibles = function(elements, params) {
    $.each(elements, function (i, elem) {
      if (params.noClef) $(elem).attr('clef.visible', 'false');
      if (params.noKey) $(elem).attr('key.sig.show', 'false');
      if (params.noMeter) $(elem).attr('meter.rend', 'false');
    }); 
  }

  var paramsStaves = params.staves;
  if (paramsStaves) {
    var staffDefSelector = '';
    var staffNSelector = '';
    var commaspace = '';
    for (var i=0;i<paramsStaves.length;i++){
      staffDefSelector += commaspace + '[n="' + paramsStaves[i] + '"]';
      staffNSelector += commaspace + '[staff="' + paramsStaves[i] + '"]'
      if (i === 0) commaspace = ', ';
    }
  }

  
  var slice = MEI.cloneNode(true);
  var scoreDefs;
  if (paramsStaves) $(slice).find('staffDef').remove(':not(' + staffDefSelector + ')');
  if (params.noClef || params.noKey || params.noMeter) {
    var staffDefs = $(slice).find('staffDef');
    var scoreDefs = $(slice).find('scoreDef');
    setVisibles(scoreDefs, params);
    setVisibles(staffDefs, params);
  }
  if (params.noConnectors) {
    $(slice).find('staffGrp').removeAttr('symbol');
  }
  var section = $(slice).find('section')[0];
  var inside_slice = false;
  var found = false;

  /** 
   * Iterate through each child of the seciont and remove everything outside the slice.
   * Remove  
   */ 
  var section_children = section.childNodes;
  $(section_children).each( function() {
    var child = this;

    if (!inside_slice) {
      if (child.localName === 'measure' && Number($(child).attr('n')) === params.start_n) {
        inside_slice = true;
        found = true;
      } else {
        section.removeChild(child);
      } 
    } 

    if (inside_slice) {
      //remove unwanted staff
      if (paramsStaves) {
        $(child).find('[staff]').remove(':not(' + staffNSelector + ')');
        var staves = $(child).find('staff');
        $(staves).each(function() {
          var staff = this;
          if ($.inArray(Number($(staff).attr('n')), paramsStaves) === -1) {
            var parent = this.parentNode;
            parent.removeChild(this);
          } 
        })
      }
      
      //finish inside_slice state if it's the end of slice.
      if (child.localName === 'measure' && Number($(child).attr('n')) === params.end_n) {
        inside_slice = false;
      }
    }

  });

  return slice;
}


/**
 * Represents an MEI <app> or <choice> element. 
 * 
 * @param xmlID {String} the xml:id attribute value of the <app> or <choice> element.
 * @param parentID {String} the xml:id attribute value of the direct parent element of the <app> or <choice> element.
 */
MeiLib.Alt = function(xmlID, parentID) {
  this.xmlID = xmlID;
  this.altitems = [];
  this.parentID = parentID;
}

/**
 * Represents a <lem>, <rdg>, <sic> or <corr> element.
 * 
 * @param xmlID {String} the xml:id attribute value of the element.
 * @param tagname {String} 'lem' for <lem> and 'rdg for <rdg> elements.
 * @param source {String} space-separated list of the source IDs what the given item belongs to.
 * @param resp {String} xmlID of the editor responsible for the given reading or correction.
 * @param n {String} @n attribute value of the element.
 */
MeiLib.Variant = function(xmlID, tagname, source, resp, n){
  this.xmlID = xmlID;
  this.tagname = tagname;
  this.source = source;
  this.resp = resp;
  this.n = n;
}

/**
 * A Rich MEI is an MEI that contain ambiguity represented by Critical Apparatus (<app>, <rdg>, etc.),
 * or Editorial Transformation (<choice>, <corr>, etc.) elements. 
 * 
 * @param meiDoc is the MEI document.
 */
MeiLib.MeiDoc = function(meiXmlDoc) {
  if (meiXmlDoc) this.init(meiXmlDoc);
}


/**
 * Initializes a <code>MeiLib.MeiDoc</code> object.
 *
 * The constructor extracts information about alternative encodings and compiles 
 * them into a JS object (this.ALTs). The obejcts are exposed as per the following:
 *  1. <code>sourceList</code> is the list of sources as defined in the MEI header (meiHead).
 *  2. <code>editorList</code> is the list of editors listed in the MEI header.
 *  3. <code>ALTs</code> is the object that contains information about the alternative encodings. It
 *     contains one entry per for each <app> or <choice> element. It is indexed by the xml:id attribute 
 *     value of the elements.
 *  4. <code>altgroups</code> is the obejct that contains how <app> and <choice> elements are grouped 
 *     together to form a logical unit of alternative encoding.
 * @param meiXmlDoc is an XML document containing the rich MEI
 */
MeiLib.MeiDoc.prototype.init = function(meiXmlDoc) {
  this.xmlDoc = meiXmlDoc;
  this.rich_head = meiXmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'meiHead')[0];
  this.rich_music = meiXmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'music')[0];
  this.rich_score = $(this.rich_music).find('score')[0];
  this.parseSourceList();
  this.parseEditorList();
  this.parseALTs();
  this.initAltgroups();
  this.initSectionView();
}

MeiLib.MeiDoc.prototype.getRichScore = function() {
  return this.rich_score;
}

MeiLib.MeiDoc.prototype.getPlainScore = function() {
  return this.plain_score;
}

MeiLib.MeiDoc.prototype.getALTs = function() {
  return this.ALTs;
}

MeiLib.MeiDoc.prototype.getSourceList = function() {
  return this.sourceList;
}

MeiLib.MeiDoc.prototype.getEditorList = function() {
  return this.editorList;
}

/**
 * Extracts information about the sources as defined in the MEI header.
 * 
 * @return {Object} is a container indexed by the xml:id attribute value of the <sourceDesc> element.
 */
MeiLib.MeiDoc.prototype.parseSourceList = function() {
  // var srcs = $(this.rich_head).find('sourceDesc').children();
  // this.sourceList = {};
  // var i
  // for(i=0;i<srcs.length;++i) {
  //   var src = srcs[i];
  //   var xml_id = $(src).attr('xml:id');
  //   var serializer = new XMLSerializer();
  //   this.sourceList[xml_id] = serializer.serializeToString(src);    
  // }
  // return this.sourceList;
  this.sources = $(this.rich_head).find('sourceDesc').children();
  return this.sources;
}

MeiLib.MeiDoc.prototype.parseEditorList = function() {
  // var edtrs = $(this.rich_head).find('titleStmt').children('editor');
  // this.editorList = {};
  // var i
  // for(i=0;i<edtrs.length;++i) {
  //   var edtr = edtrs[i];
  //   var xml_id = $(edtr).attr('xml:id');
  //   this.editorList[xml_id] = edtr;
  // }
  this.editors = $(this.rich_head).find('titleStmt').children('editor');
  return this.editors;
}
/**
 * Extracts information about the elements encoding alternatives. The method stores its result in 
 * the <code>ALTs</code> property.
 * 
 * <code>ALTs</code> is a container of  MeiLib.Alt obejcts indexed by the xml:id attribute value 
 * of the <app> or <choice> elements. 
 */
MeiLib.MeiDoc.prototype.parseALTs = function() {
  this.ALTs = {};
//  console.log(this.rich_score);
  var apps = $(this.rich_score).find('app, choice');
  for (var i=0;i<apps.length; i++) {
    var app = apps[i];
    var parent = app.parentNode;
    var altitems = $(app).find('rdg, lem, sic, corr');
    var AppsItem = new MeiLib.Alt(MeiLib.XMLID(app), MeiLib.XMLID(parent));
    AppsItem.altitems = {};
    for (var j=0;j<altitems.length;j++) {
      var altitem = altitems[j];
      var source = $(altitem).attr('source');
      var resp = $(altitem).attr('resp');
      var n = $(altitem).attr('n');
      var tagname = $(altitem).prop('localName');
      var varXMLID = MeiLib.XMLID(altitem);
      AppsItem.altitems[varXMLID] = new MeiLib.Variant(varXMLID, tagname, source, resp, n);
    }
    this.ALTs[MeiLib.XMLID(app)] = AppsItem;
  }
}

MeiLib.MeiDoc.prototype.initAltgroups = function() {
  var ALTs = this.ALTs;
  annots = $(this.rich_score).find('annot[type="appGrp"], annot[type="choiceGrp"]');
  this.altgroups = {};
  for (var i=0;i<annots.length; i++) {
    altgroup = [];
    token_list = $(annots[i]).attr('plist').split(' ');
    for (var j=0; j<token_list.length; j++) {
       altgroup.push(token_list[j].replace('#', ''));
    }
    for (var j in altgroup) {
      this.altgroups[altgroup[j]] = altgroup;
    }
  };
}
/**
 * The MeiLib.MeiDoc.initSectionView transforms the rich MEI (this.rich_score) into a plain MEI (this.sectionview_score)
 * 
 * An MEI is called 'plain' MEI if it contains no <app> or <choice> elements. Such an MEI can also be referred 
 * after the analogy of 2D section views of a 3D object: the rich MEI is a higher-dimensional object, of which 
 * we would like to display a 'flat' section view. The term 'section plane' refers to a combination of
 * alternatives at different locations in the score. The section plane defines the actual view of the 
 * higher-dimensional object. For instance, consider a score that has two different variants at measure 
 * #5 (let's call them (variant A and variant B), and it contains three different variants at measure #10 
 * (let's call those ones variants C, D and E). In this case the section plane would contain two elements 
 * the first one is either A or B, the second one is C, D or E.
 * 
 * The extracted information about all the <app> and <choice> elements are stored in an array. 
 * Using this array the application can access information such as what alternative encodings are present 
 * in the score, what source a variant comes from, etc. This array is exposed by te <code>ALTs</code> property.
 * 
 */
MeiLib.MeiDoc.prototype.initSectionView  = function(altReplacements) {
  altReplacements = altReplacements || {};
  // Make a copy of the rich MEI. We don't want to remove nodes from the original object.
  this.sectionview_score = this.rich_score.cloneNode(true);
  this.sectionplane = {};
  
  // Transform this.sectionview_score into a plain MEI:
  //
  //   * itereate through all <app> and <choice> elements:
  //     o chose the appropriate rdg or lem defined by sectionplane (sectionplane[app.xmlID]).
  //       If nothing is defined, leave it empty.
  //     o chose the appropriate sic or corr defined by sectionplance (sectionplane[choice.xmlID])
  //       If nothing is defined, chose the first corr, if exists, otherwise chose sic, if exists.
  // When replacing an item, mark the location of replacement with XML processing instructions.
  
  var alts = $(this.sectionview_score).find('app, choice');
  
  var alt_instance2insert;
  var alt_item_xml_id;
  var this_sectionview_score = this.sectionview_score;
  var this_sectionplane = this.sectionplane;
  var this_ALTs = this.ALTs;
  var xmlDoc = this.xmlDoc;
  $(alts).each(function(i, alt){
    var alt_xml_id = MeiLib.XMLID(alt);
    var replacement = altReplacements[alt_xml_id];
    if (replacement) {
      // apply replacement, or...
      alt_item_xml_id = replacement.xmlID;
      var alt_item = $(this_score).find(replacement.tagname + '[xml\\:id="' + alt_item_xml_id +'"]')[0];
      if (!alt_item) throw new MeiLib.RuntimeError('MeiLib.MeiDoc.prototype.initSectionView():E01', "Cannot find <lem>, <rdg>, <sic>, or <corr> with @xml:id '" + alt_item_xml_id + "'.");
      alt_instance2insert = alt_item.childNodes;      
    } else {
      if (alt.localName === 'choice') {
        // ...the default replacement is...
        var corr = $(alt).find('corr')[0];
        if (corr) {
          // ...the first corr...
          alt_item_xml_id = MeiLib.XMLID(corr);
          alt_instance2insert = corr.childNodes;
          //...or
        } else {
          // ...the first sic.
          var sic = $(alt).find('sic')[0];
          if (sic) {
            alt_item_xml_id = MeiLib.XMLID(sic);
            alt_instance2insert = sic.childNodes;
          } else {
            alt_instance2insert = [];
          }
        } 
      } else {
        var lem = $(alt).find('lem')[0];
        if (lem) {
          // ...the first cor...
          alt_item_xml_id = MeiLib.XMLID(lem);
          alt_instance2insert = lem.childNodes;
          //...or
        } else {
          alt_instance2insert = [];
        }
      }
    }
    var parent = alt.parentNode;
    var PIStart = xmlDoc.createProcessingInstruction('MEI2VF', 'rdgStart="' + alt_xml_id + '"');
    parent.insertBefore(PIStart, alt);
    $.each(alt_instance2insert, function () { 
      parent.insertBefore(this.cloneNode(true), alt); 
    });
    var PIEnd = xmlDoc.createProcessingInstruction('MEI2VF', 'rdgEnd="' + alt_xml_id + '"');
    parent.insertBefore(PIEnd, alt);
    parent.removeChild(alt);

    this_sectionplane[alt_xml_id] = [];
    if (this_ALTs[alt_xml_id].altitems[alt_item_xml_id]) {
      this_sectionplane[alt_xml_id].push(this_ALTs[alt_xml_id].altitems[alt_item_xml_id]);
    }
  })

  return this.sectionview_score;
  
}

/**
 * Updates the sectionview score (plain MEI) by replacing one or more alternative instance with other alternatives. 
 * 
 * @param sectionplaneUpdate {object} the list of changes. It is an container of xml:id attribute values of 
 *                                   <rdg>, <lem>, <sic> or <corr> elements, indexed by the xml:id attribute values of the
 *                                   corresponding <app> or <choice> elements.
 *                                   sectionplaneUpdate[altXmlID] = altInstXmlID is the xml:id attribute value of 
 *                                   the <rdg>, <lem>, <sic> or <corr> element, which is to be inserted in place of the 
 *                                   original <app xml:id=altXmlID> or <choice xml:id=altXmlID>
 *                                   When replacing an <app> or <choice> that is part of a group of such elements (defined
 *                                   by this.altgroups), then those other elements needs to be replaced as well.
 */
MeiLib.MeiDoc.prototype.updateSectionView = function(sectionplaneUpdate) {
  
  var corresponding_alt_item = function(altitems, altitem) {
    var vars_match = function(v1, v2) {
      var res = 0;
      for (var field in v1) {
        if (v1[field] !== undefined && v1[field] === v2[field]) {
          res++;
        }
      }
      console.log('vars_match: ' + res);
      return res;
    }
    var max = 0;
    var corresponding_item;
    for (var alt_item_id in altitems) {
      M = vars_match(altitems[alt_item_id], altitem);
      if (max<M) {
        max = M;
        corresponding_item = altitems[alt_item_id];
      }
    }
    return corresponding_item;
  }

  for (altID in sectionplaneUpdate) {
    var this_ALTs = this.ALTs;
    var altitems2insert = [];
    $(sectionplaneUpdate[altID]).each(function(){
      altitems2insert.push(this_ALTs[altID].altitems[this]);
    });
    var alt_instance2insert = this.ALTs[altID].altitems[sectionplaneUpdate[altID]];
    altgroup = this.altgroups[altID];
    if (altgroup) {
      // if altID is present in altgroups, then replace all corresponding alts with the 
      // alt_item that correspons to alt_instance2insert
      var i;
      for (i=0; i<altgroup.length; i++) {
        altID__ = altgroup[i];
        var altitems2insert__ = [];
        $(altitems2insert).each(function(){
          altitems2insert__.push(corresponding_alt_item(this_ALTs[altID__].altitems, this))
        });
        this.replaceAltInstance({appXmlID:altID__, replaceWith:altitems2insert__});
      }
    } else {
      // otherwise just replace alt[xml:id=altID]
      this.replaceAltInstance({appXmlID:altID, replaceWith:altitems2insert});
    }
  }
}

/**
 * Replace an alternative instance in the sectionview score and in the sectionplane
 * 
 * @param alt_inst_update {object}
 * @return the updated score
 */
MeiLib.MeiDoc.prototype.replaceAltInstance = function(alt_inst_update) {
  
  var extendWithNodeList = function(nodeArray, nodeList) {
    var res = nodeArray;
    var i;
    for (i=0; i<nodeList.length; ++i) {
        res.push(nodeList[i]);
    }
    return res;
  }

  var app_xml_id = alt_inst_update.appXmlID;
  var parent = $(this.sectionview_score).find('[xml\\:id=' + this.ALTs[app_xml_id].parentID +']')[0];
  if (typeof parent === 'undefined') {
    return;
  }
  var children = parent.childNodes;

  var nodes2insert = [];
  var this_rich_score = this.rich_score;
  if (alt_inst_update.replaceWith) {
    $(alt_inst_update.replaceWith).each(function() {
      var replaceWith_item = this;
      var replaceWith_xmlID = replaceWith_item.xmlID;
      var var_inst_elem = $(this_rich_score).find(replaceWith_item.tagname + '[xml\\:id="' + replaceWith_xmlID +'"]')[0];
      nodes2insert = extendWithNodeList(nodes2insert, var_inst_elem.childNodes);
    });
  }
  console.log(nodes2insert)
  
  var match_pseudo_attrValues = function(data1, data2) {
    data1 = data1.replace("'", '"');
    data2 = data2.replace("'", '"');
    return data1 === data2;
  }
  
  var inside_inst = false;
  var found = false;
  var insert_before_this = null;
  $(children).each( function() {
    var child = this;
    if (child.nodeType === 7) {
      if (child.nodeName === 'MEI2VF' && match_pseudo_attrValues(child.nodeValue, 'rdgStart="' + app_xml_id + '"')) {
        inside_inst = true;     
        found = true;   
      } else if (child.nodeName === 'MEI2VF' && match_pseudo_attrValues(child.nodeValue, 'rdgEnd="' + app_xml_id + '"')) {
        inside_inst = false;                
        insert_before_this = child;
      }
    } else if (inside_inst) {
      parent.removeChild(child);
    } 
  });

  if (!found) throw "processing instruction not found"; 
  if (inside_inst) throw "Unmatched <?MEI2VF rdgStart?>";
    
  var insert_method; 
  if (insert_before_this) { 
    insert_method = function (elem) { parent.insertBefore(elem, insert_before_this) };
  } else {
    insert_method = function (elem) { parent.appendChild(elem) };
  }

  $.each(nodes2insert, function () {
     insert_method(this.cloneNode(true)); 
  });  
   
  this.sectionplane[app_xml_id] = alt_inst_update.replaceWith;
   
  return this.sectionview_score;
}

/**
 * Get a slice of the sectionview_score.
 *
 * @param params {Obejct} contains the parameters for slicing. For more info see at documentation 
 *               of MeiLib.SliceMEI
 * @return an XML DOM object containing the slice of the plain MEI
 */
MeiLib.MeiDoc.prototype.getSectionViewSlice = function(params) {
  return MeiLib.SliceMEI(this.sectionview_score, params);
}

/**
 * Get a slice of the whole rich MEI document.
 *
 * @param params {Obejct} contains the parameters for slicing. For more info see at documentation 
 *               of MeiLib.SliceMEI
 * @return a MeiDoc object
 */
MeiLib.MeiDoc.prototype.getRichSlice = function(params) {
  var slice = new MeiLib.MeiDoc();
  slice.xmlDoc = this.xmlDoc;
  slice.rich_head = this.rich_head.cloneNode();
  slice.rich_music = this.rich_music.cloneNode();
  slice.rich_score = MeiLib.SliceMEI(this.rich_score, params);
  slice.sourceList = this.sourceList;
  slice.editorList = this.editorList;
  slice.ALTs = this.ALTs;
  slice.altgroups = this.altgroups;
  return slice;
}




