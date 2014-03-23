/*******************************************************************************
 * MEItoVexFlow
 *
 * Author: Richard Lewis Contributors: Zoltan Komives, Raffaele Viglianti
 *
 * See README for details of this library
 *
 * Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
 * University of Maryland
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 ******************************************************************************/

var MEI2VF = ( function(m2v, VF, $, undefined) {

    m2v.RUNTIME_ERROR = function(error_code, message) {
      this.error_code = error_code;
      this.message = message;
    };

    m2v.RUNTIME_ERROR.prototype.toString = function() {
      return "MEI2VF.RUNTIME_ERROR: " + this.error_code + ': ' + this.message;
    };

    m2v.attsToObj = function(element) {
      var i, j, obj;
      if (element.attributes) {
        obj = {};
        for ( i = 0, j = element.attributes.length; i < j; i += 1) {
          obj[element.attributes[i].nodeName] = element.attributes[i].nodeValue;
        }
      }
      return obj;
    };

    m2v.Renderer = function(config) {
      if (config) {
        this.init(config).process().draw();
      }
      return this;
    };

    m2v.Renderer.prototype = {

      /**
       * default options (read only)
       *
       * @type Object
       */
      defaults : {
        page_scale : 0.6,
        // NB page_height and page_width are the only absolute (non-scaled)
        // values; all other measurements will be scaled; => change width and
        // height to
        // relative values, too?
        page_height : 350,
        page_width : 800,
        page_margin_top : 60,
        page_margin_left : 20,
        page_margin_right : 20,
        systemLeftMar : 100,
        systemSpacing : 70,
        staveSpacingAbove : 40,
        staveHeight : 60, // spacing not included
        measurePaddingRight : 10, // originally 20
        autoStaveConnectorLine : true,
        autoMeasureNumbers : true,
        // TODO: add feature
        autoSystemBreakSections : true,
        // NB the weight properties can be used to specify style, weight or both
        // (space separated);
        // some of the objects are passed directly to vexFlow (which requires
        // 'weight'), so I didn't change the name
        lyricsFont : {
          family : 'Times',
          size : 15
        },
        annotFont : {
          family : 'Times',
          size : 15,
          weight : 'Italic'
        },
        staffFont : {
          family : 'Times',
          size : 14,
          weight : 'Italic'
        },
        tempoFont : {
          family : "Times",
          size : 17,
          weight : "bold"
        },
        staff : {
          vertical_bar_width : 20, // 10 // Width around vertical bar end-marker
          glyph_spacing_px : 10,
          num_lines : 5,
          fill_style : "#000000",
          line_thickness : 1, // not used in VexFlow, but in m2v
          spacing_between_lines_px : 10, // in pixels
          space_above_staff_ln : 0, // 4 // in staff lines
          space_below_staff_ln : 0, // 4 // in staff lines
          top_text_position : 1.5, // 1 // in staff lines
          bottom_text_position : 7.5
        }
      },

      init : function(config) {
        var me = this, firstScoreDef;

        if (!config) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.NoConfig', 'No config passed to init().');
        }

        if (!config.data) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingData', 'No XML data passed to init().');
        }

        me.xmlDoc = me.initXmlDoc(config.data);

        firstScoreDef = $(me.xmlDoc).find('scoreDef')[0];
        if (!firstScoreDef) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadMEIFile', 'No <scoreDef> found in config.data.');
        }

        /**
         * init config: properties in the config object override MEI staffDef
         * attributes which override the defaults
         */
        me.cfg = $.extend(true, {}, me.defaults, me.getMEIPageConfig(firstScoreDef), config);

        me.printSpaceW = Math.floor(me.cfg.page_width / me.cfg.page_scale - me.cfg.page_margin_left - me.cfg.page_margin_right) - 1;
        me.halfLineDistance = me.cfg.staff.spacing_between_lines_px / 2;

        VF.STAVE_LINE_THICKNESS = me.cfg.staff.line_thickness;

        /**
         * contains all Vex.Flow.Stave objects in a 2d array [measure_n][staff_n]
         */
        me.allVexMeasureStaffs = [];
        me.allStaffVoices = [];
        me.allAnchoredTexts = [];
        me.allBeams = [];

        me.texts = new m2v.Texts();
        me.startConnectors = new m2v.Connectors();
        me.inlineConnectors = new m2v.Connectors();
        me.ties = new m2v.Ties();
        me.slurs = new m2v.Ties();
        me.hairpins = new m2v.Hairpins();
        me.hyphenation = new m2v.Hyphenation(me.cfg);

        /**
         * properties:
         *    xmlid: {
         *      meiNote: val,
         *      vexNote: val
         *    }
         */

        me.directionsInCurrentMeasure = [];

        me.notes_by_id = {};
        me.currentSystem = 0;
        me.currentSystemMarginLeft = me.cfg.systemLeftMar;
        me.pendingSystemBreak = false;
        me.pendingSectionBreak = true;
        me.currentLowestY = 0;
        // me.currentMeasureX = null;
        me.unresolvedTStamp2 = [];
        /**
         * contains the currently effective MEI2VF.StaffInfo objects
         */
        me.currentStaffInfos = [];

        return me;
      },

      process : function() {
        var me = this;
        me.processScoreDef($(me.xmlDoc).find('scoreDef')[0]);
        me.processSections(me.xmlDoc);

        me.ties.createVexFromLinks(me.notes_by_id);
        me.slurs.createVexFromLinks(me.notes_by_id);
        me.hairpins.createVexFromLinks(me.notes_by_id);
        return me;
      },

      draw : function() {
        var me = this, canvas, ctx;

        canvas = me.createCanvas(me.cfg.target, me.cfg.backend);
        ctx = me.createContext(canvas, me.cfg.backend);

        if (+me.cfg.backend === VF.Renderer.Backends.RAPHAEL) {
          me.scaleContextRaphael(canvas, ctx, me.cfg.page_scale);
        } else {
          me.scaleContext(ctx, me.cfg.page_scale);
        }

        me.drawVexStaffs(me.allVexMeasureStaffs, ctx);

        me.startConnectors.setContext(ctx).draw();
        me.inlineConnectors.setContext(ctx).draw();

        me.drawVexVoices(me.allStaffVoices, ctx);
        me.drawVexBeams(me.allBeams, ctx);

        me.ties.setContext(ctx).draw();
        me.slurs.setContext(ctx).draw();
        me.hairpins.setContext(ctx).draw();
        me.texts.setContext(ctx).draw();

        me.drawAnchoredTexts(me.allAnchoredTexts, me.halfLineDistance, ctx);

        me.hyphenation.setContext(ctx).draw();

        // me.exportRenderedMeasures(me.allVexMeasureStaffs);

        window.ctx = ctx;
        window.m = me;

        // m2v.util.drawBoundingBoxes(ctx, {
        // frame : false,
        // staffs : {
        // data : me.allVexMeasureStaffs,
        // // drawModifiers : true,
        // drawNoteArea : true
        // // },
        // // voices : {
        // // data : me.allStaffVoices,
        // // drawTickables : true,
        // // drawFrame : true
        // }
        // });

        return me;

      },

      /**
       * initializes the xml document; if a string is passed, it gets parsed
       *
       * @param xmlDoc {string|document} the input string or input document
       * @return {document} the xml document ready to be transformed
       */
      initXmlDoc : function(xmlDoc) {
        if ( typeof xmlDoc === 'string') {
          // xmlDoc = m2v.util.createXMLDoc(xmlDoc);
          xmlDoc = $.parseXML(xmlDoc);
        }
        return xmlDoc[0] || xmlDoc;
      },

      getMEIPageConfig : function(firstScoreDef) {
        var obj = m2v.attsToObj(firstScoreDef);
        return {
          page_scale : parseInt(obj['page.scale'], 10) / 100 || undefined,
          page_height : obj['page.height'],
          page_width : obj['page.width'],
          page_margin_top : (isNaN(+obj['page.topmar'])) ? undefined : +obj['page.topmar'],
          page_margin_left : (isNaN(+obj['page.leftmar'])) ? undefined : +obj['page.leftmar'],
          page_margin_right : (isNaN(+obj['page.rightmar'])) ? undefined : +obj['page.rightmar']
        };
      },

      processScoreDef : function(scoredef) {
        var me = this, i, j, children, systemLeftmar;
        systemLeftmar = $(scoredef).attr('system.leftmar');
        if (systemLeftmar) {
          me.currentSystemMarginLeft = +systemLeftmar;
        }
        children = $(scoredef).children();
        for ( i = 0, j = children.length; i < j; i += 1) {
          me.processScoreDef_child(children[i]);
        }
      },

      /**
       * @description MEI element <b>scoreDef</b> may contain (MEI v2.1.0):
       *              MEI.cmn: <b>meterSig</b> <b>meterSigGrp</b>
       *              MEI.harmony: <b>chordTable</b> MEI.linkalign:
       *              <b>timeline</b> MEI.midi: <b>instrGrp</b> MEI.shared:
       *              <b>keySig</b> <b>pgFoot</b> <b>pgFoot2</b> <b>pgHead</b>
       *              <b>pgHead2</b> <b>staffGrp</b> MEI.usersymbols:
       *              <b>symbolTable</b>
       *
       * Supported elements: <b>staffGrp</b> <b>pgHead</b>
       *
       * @param scoredef {Element} the scoreDef element to read
       */
      processScoreDef_child : function(element) {
        var me = this, staff_n;
        switch (element.localName) {
          case 'staffGrp' :
            me.processStaffGrp(element);
            break;
          case 'pgHead' :
            me.processPgHead(element);
            break;
          default :
            throw m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + children[i].localName + '> is not supported in <scoreDef>');
        }
      },

      processPgHead : function(element) {
        var me = this;
        me.texts.addComplexText(element, {
          x : me.cfg.page_margin_left,
          y : 200,
          w : me.printSpaceW
        });
      },

      /**
       *
       * @param {Element} staffGrp
       * @param {Boolean} isChild specifies if the staffGrp is a child of another
       *            staffGrp (effect: auto staff connectors only get attached
       *            to the outermost staffGrp elements)
       * @return {Object} the range of the current staff group. Properties:
       *         first_n, last_n
       */
      processStaffGrp : function(staffGrp, isChild) {
        var me = this, range = {};
        $(staffGrp).children().each(function(i, childElement) {
          var rangeChild = me.processStaffGrp_child(i, childElement);
          Vex.LogDebug('processStaffGrp() {1}.{a}: rangeChild.first_n:' + rangeChild.first_n + ' rangeChild.last_n:' + rangeChild.last_n);
          if (i === 0) {
            range.first_n = rangeChild.first_n;
          }
          range.last_n = rangeChild.last_n;
        });
        me.setConnectorModels(staffGrp, range, isChild);
        return range;
      },

      setConnectorModels : function(staffGrp, range, isChild) {
        var me = this, symbol, barthru, first_n, last_n;

        first_n = range.first_n;
        last_n = range.last_n;
        symbol = $(staffGrp).attr('symbol');
        barthru = $(staffGrp).attr('barthru');

        Vex.LogDebug('setConnectorModels() {2}: symbol:' + symbol + ' range.first_n:' + first_n + ' range.last_n:' + last_n);

        // # left connectors specified in the MEI file
        me.startConnectors.setModelForStaveRange({
          top_staff_n : first_n,
          bottom_staff_n : last_n,
          symbol : symbol || 'line',
          label : $(staffGrp).attr('label'),
          labelAbbr : $(staffGrp).attr('label.abbr')
        });

        // # left auto line, only attached to //staffGrp[not(ancestor::staffGrp)]
        if (!isChild && me.cfg.autoStaveConnectorLine) {
          me.startConnectors.setModelForStaveRange({
            top_staff_n : first_n,
            bottom_staff_n : last_n,
            symbol : (symbol === 'none') ? 'none' : 'line'
          }, 'autoline');
        }

        // # inline connectors
        if (barthru) {
          me.inlineConnectors.setModelForStaveRange({
            top_staff_n : first_n,
            bottom_staff_n : last_n,
            symbol : 'singleright' // default
          });
        }
      },

      /**
       * MEI element <staffGrp> may contain (MEI v2.1.0): MEI.cmn: meterSig
       * meterSigGrp MEI.mensural: mensur proport MEI.midi: instrDef
       * MEI.shared: clef clefGrp keySig label layerDef
       *
       * Supported elements: <b>staffGrp</b> <b>staffDef</b>
       *
       * @param {} i
       * @param {Element} element
       * @return {Object} the range of staffs. Properties: first_n, last_n
       */
      processStaffGrp_child : function(i, element) {
        var me = this, staff_n;
        switch (element.localName) {
          case 'staffDef' :
            staff_n = me.processStaffDef(element);
            return {
              first_n : staff_n,
              last_n : staff_n
            };
          case 'staffGrp' :
            return me.processStaffGrp(element, true);
          default :
            throw m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + element.localName + '> is not supported in <staffGrp>');
        }
      },

      /**
       * reads a staffDef, writes it to currentStaffInfos
       *
       * @param {Element} staffDef
       * @return {Number} the staff number of the staffDef
       */
      processStaffDef : function(staffDef) {
        var me = this, staff_n, staff_info;
        staff_n = +$(staffDef).attr('n');
        staff_info = me.currentStaffInfos[staff_n];
        if (staff_info) {
          staff_info.updateDef(staffDef);
        } else {
          me.currentStaffInfos[staff_n] = new m2v.StaffInfo(staffDef, true, true, true);
        }
        return staff_n;
      },

      /**
       * resets the x coordinates, sets the y coordinates of all staves in the
       * current system and updates the staff modifiers
       */
      startSystem : function(measure) {
        var me = this, i, j, currentSystemY, currentStaffY, lowestYCandidate, updateFn, spacing;

        Vex.LogDebug('me.startSystem() {enter}');

        me.pendingSystemBreak = false;
        me.currentSystem += 1;
        me.initStaffYs();
        me.currentMeasureX = me.cfg.page_margin_left + me.currentSystemMarginLeft;
        me.measureWidthsInSystem = me.getMeasureWidths(measure);

        if (me.pendingSectionBreak) {
          me.pendingSectionBreak = false;
          updateFn = 'forceSectionStartInfo';
        } else {
          updateFn = 'forceStaveStartInfo';
        }
        for ( i = 1, j = me.currentStaffInfos.length; i < j; i += 1) {
          me.currentStaffInfos[i][updateFn]();
        }
      },

      initStaffYs : function() {
        var me = this, currentSystemY, currentStaffY, lowestYCandidate, i, j;
        currentSystemY = (me.currentSystem === 1) ? me.cfg.page_margin_top : me.currentLowestY + me.cfg.systemSpacing;
        currentStaffY = 0;
        for ( i = 1, j = me.currentStaffInfos.length; i < j; i += 1) {
          currentStaffY += (i === 1) ? 0 : me.currentStaffInfos[i].spacing || me.cfg.staveHeight + me.cfg.staveSpacingAbove;
          me.currentStaffInfos[i].absoluteY = currentSystemY + currentStaffY;
        }
        lowestYCandidate = currentSystemY + currentStaffY + me.cfg.staveHeight;
        if (lowestYCandidate > me.currentLowestY) {
          me.currentLowestY = lowestYCandidate;
        }
      },

      /**
       * provides the width of all measures in a system, beginning with the
       * element startMeasure and ending before the next sb element
       *
       * @param startMeasure {Element} the start measure
       * @return {array} the widths of all measures in the current system
       */
      getMeasureWidths : function(startMeasure) {
        var me = this, widths;
        widths = me.addMissingMeasureWidths(me.getMEIWidthsTillSb(startMeasure));
        Vex.LogDebug('me.getMeasureWidths(): #' + widths.length);
        return widths;
      },

      /**
       *
       * @param startElement {Element}
       * @return {Array} an array of all measure widths in the current stave
       */
      getMEIWidthsTillSb : function(startElement) {
        var me = this, currentElement = startElement, widths = [];
        Vex.Log('me.getMEIWidthsTillSb() {}');
        while (currentElement) {
          switch (currentElement.localName) {
            case 'measure' :
              widths.push(Math.floor(+currentElement.getAttribute('width') / me.cfg.page_scale) || null);
              break;
            case 'sb' :
              return widths;
          }
          currentElement = currentElement.nextSibling;
        }
        return widths;
      },

      /**
       * calculates the width of all measures in a stave which don't have a width
       * specified in the MEI file
       *
       * @param widths {array}
       * @return {array} the complete measure widths array
       */
      addMissingMeasureWidths : function(widths) {
        var me = this, i, j, totalSpecifiedMeasureWidth = 0, nonSpecifiedMeasureWidth, nonSpecified_n = 0;
        for ( i = 0, j = widths.length; i < j; i += 1) {
          if (widths[i] === null) {
            nonSpecified_n += 1;
          } else {
            totalSpecifiedMeasureWidth += widths[i];
          }
        }
        nonSpecifiedMeasureWidth = Math.floor((me.printSpaceW - me.currentSystemMarginLeft - totalSpecifiedMeasureWidth) / nonSpecified_n);
        for ( i = 0, j = widths.length; i < j; i += 1) {
          if (widths[i] === null) {
            widths[i] = nonSpecifiedMeasureWidth;
          }
        }
        return widths;
      },

      /**
       * sets the x coordinate for each (but the first) measure in a system
       */
      setNewMeasureX : function() {
        var me = this, previous_measure;
        // TODO check: is it necessary to check if there is a preceding measure?

        previous_measure = me.allVexMeasureStaffs[me.allVexMeasureStaffs.length
        - 1][1];

        if (previous_measure) {
          me.currentMeasureX = previous_measure.x + previous_measure.width;
          Vex.LogDebug('setNewMeasureX(): currentMeasureX:' + me.currentMeasureX);
        } else {
          me.currentMeasureX = me.cfg.page_margin_left + me.currentSystemMarginLeft;
          Vex.LogDebug('setNewMeasureX(): NO PREVIOUS MEASURE FOUND (!)');
        }
      },

      processSections : function(xmlDoc) {
        var me = this, i, j, sectionChildElements;
        sectionChildElements = $(xmlDoc).find('section').children();
        for ( i = 0, j = sectionChildElements.length; i < j; i += 1) {
          me.processSectionChildElement(sectionChildElements[i]);
        }
      },

      /**
       * MEI element <section> may contain (MEI v2.1.0): MEI.cmn: measure
       * MEI.critapp: app MEI.edittrans: add choice corr damage del gap
       * handShift orig reg restore sic subst supplied unclear MEI.shared:
       * annot ending expansion pb sb scoreDef section staff staffDef
       * MEI.text: div MEI.usersymbols: anchoredText curve line symbol
       *
       * Supported elements: measure, scoreDef, staffDef
       */
      processSectionChildElement : function(element) {
        var me = this, fn = me.sectionChildFnMap[element.localName];
        if (fn) {
          me[fn](element);
        } else {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + element.localName + '> is not supported in <section>');
        }
      },

      sectionChildFnMap : {
        measure : 'processMeasure',
        scoreDef : 'processScoreDef',
        staffDef : 'processStaffDef',
        sb : 'setPendingSystemBreak'
      },

      setPendingSystemBreak : function() {
        this.pendingSystemBreak = true;
      },

      processMeasure : function(element) {
        var me = this, measure_n, width, connectors, atSystemStart, left_barline, right_barline, currentStaveVoices, currentMeasureWidth;

        if (me.pendingSectionBreak || me.pendingSystemBreak) {
          me.startSystem(element);
          atSystemStart = true;
          me.hyphenation.addLineBreaks(me.currentStaffInfos, me.currentMeasureX);
        } else {
          me.setNewMeasureX();
          atSystemStart = false;
        }

        currentMeasureWidth = me.measureWidthsInSystem.shift();

        Vex.LogDebug('me.processMeasure() {enter}' + ', currentMeasureWidth: ' + currentMeasureWidth);

        currentStaveVoices = new m2v.StaveVoices();

        measure_n = +$(element).attr('n');

        left_barline = element.getAttribute('left');
        right_barline = element.getAttribute('right');

        me.directionsInCurrentMeasure = me.getDirectionsInElement(element);

        $(element).find('staff').each(function() {
          me.processStaffInMeasure(this, measure_n, left_barline, right_barline, atSystemStart, currentStaveVoices, currentMeasureWidth);
        });

        me.allStaffVoices.push({
          staveVoices : currentStaveVoices,
          measureStaffs : me.allVexMeasureStaffs[measure_n]
        });

        if (atSystemStart) {
          me.startConnectors.createVexFromModels(me.allVexMeasureStaffs[measure_n], null, null, me.currentSystem);
        }
        me.inlineConnectors.createVexFromModels(me.allVexMeasureStaffs[measure_n], left_barline, right_barline);

        me.extract_linkingElements(element, 'tie', me.ties);
        me.extract_linkingElements(element, 'slur', me.slurs);
        me.extract_linkingElements(element, 'hairpin', me.hairpins);

        me.processTempoChildren(element, me.allVexMeasureStaffs[measure_n]);

        // TODO loop through all measure children instead of processing them
        // groupwise?
      },

      // TODO handle tempo directions in the course of measures
      processTempoChildren : function(element, measure) {
        var me = this, staff_n, staff, text, offsetX, vexTempo;
        $(element).find('tempo').each(function(i, tempoElement) {
          staff_n = $(tempoElement).attr('staff');
          staff = measure[staff_n];
          text = $(tempoElement).text();
          vexTempo = new Vex.Flow.StaveTempo({
            name : text
            // TODO handle MM
            // duration: mm.unit
            // dots: +$(tempoElement).attr('dots'),
            // bpm: $(tempoElement).attr('mm'),
          }, staff.x, 5);
          offsetX = (staff.hasTimeSignature) ? -40 : 10;
          vexTempo.setShiftX(offsetX);
          vexTempo.font = me.cfg.tempoFont;
          staff.modifiers.push(vexTempo);
        });
      },

      processStaffInMeasure : function(staff_element, measure_n, left_barline, right_barline, atSystemStart, currentStaveVoices, currentMeasureWidth) {
        var me = this, staff, staff_n, measureNumberToRender, layers, anchoredTexts, readEvents, layer_events, labelText;

        staff_n = +$(staff_element).attr('n');

        if (atSystemStart && me.cfg.autoMeasureNumbers && measure_n !== 1) {
          measureNumberToRender = measure_n;
        }

        staff = me.createVexStaff(staff_n, left_barline, right_barline, measureNumberToRender, currentMeasureWidth);

        anchoredTexts = $(staff_element).children('anchoredText').each(function(i, anchoredText) {
          me.processAnchoredStaffText(anchoredText, staff);
        });

        if (atSystemStart) {
          labelText = (me.currentSystem === 1) ? me.currentStaffInfos[staff_n].label : (me.currentStaffInfos[staff_n].labelAbbr);
          if (labelText) {
            staff.setText(labelText, Vex.Flow.Modifier.Position.LEFT, {
              shift_y : -3
            });
          }
        }

        layers = $(staff_element).find('layer');

        readEvents = function(i, element) {
          var event = me.processElement(element, this, staff_element, staff);
          return event.vexNote || event;
        };

        $.each(layers, function(i, layer) {
          me.resolveUnresolvedTimestamps(layer, staff_n, measure_n);
          layer_events = $(layer).children().map(readEvents).get();
          currentStaveVoices.addVoice(me.createVexVoice(layer_events, staff_n), staff_n);
        });

        if (me.allVexMeasureStaffs[measure_n] === undefined) {
          me.allVexMeasureStaffs[measure_n] = [];
        }
        me.allVexMeasureStaffs[measure_n][staff_n] = staff;
      },

      /**
       * Initialise staff #staff_n. Render necessary staff modifiers.
       *
       * @param {} staff_n
       * @param {} left_barline
       * @param {} right_barline
       * @param {} measure_n
       * @return {Vex.Flow.Stave}
       */
      createVexStaff : function(staff_n, left_barline, right_barline, measure_n, currentMeasureWidth) {
        var me = this, staffdef, staff, renderWith, currentStaffInfo;
        if (!staff_n) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArgument', 'Cannot render staff without attribute "n".');
        }

        currentStaffInfo = me.currentStaffInfos[staff_n];

        staff = new VF.Stave(me.currentMeasureX, currentStaffInfo.absoluteY, currentMeasureWidth, me.cfg.staff);

        // temporary; (due to a bug?) in VexFlow, bottom_text_position does not
        // work when it's passed in the config object
        staff.options.bottom_text_position = me.cfg.staff.bottom_text_position;

        staff.font = me.cfg.staffFont;

        if (measure_n && staff_n === 1) {
          staff.setMeasure(measure_n);
        }

        if (currentStaffInfo.showClefCheck()) {
          staff.addClef(currentStaffInfo.getClef());
        }
        if (currentStaffInfo.showKeysigCheck()) {
          staff.addKeySignature(currentStaffInfo.getKeySpec());
        }
        if (currentStaffInfo.showTimesigCheck()) {
          staff.addTimeSignature(currentStaffInfo.getTimeSig());
          staff.hasTimeSignature = true;
        }

        staff.setBegBarType( left_barline ? m2v.tables.barlines[left_barline] : VF.Barline.type.NONE);
        if (right_barline) {
          staff.setEndBarType(m2v.tables.barlines[right_barline]);
        }

        return staff;
      },

      createVexVoice : function(voice_contents, staff_n) {
        var me = this, voice, meter;
        if (!$.isArray(voice_contents)) {
          throw m2v.RUNTIME_ERROR('BadArguments', 'me.createVexVoice() voice_contents argument must be an array.');
        }
        meter = me.currentStaffInfos[staff_n].meter;
        voice = new VF.Voice({
          num_beats : meter.count,
          beat_value : meter.unit,
          resolution : VF.RESOLUTION
        });
        voice.setStrict(false);
        voice.addTickables(voice_contents);
        // $.each(voice_contents, function(i, o) { voice.addTickables([o]);
        // });
        return voice;
      },

      // TODO: better attach to staff instead of writing an own array!?!?
      // TODO allow anchored text relative to other elements than <staff>
      processAnchoredStaffText : function(element, staff) {
        var me = this, $element = $(element);
        me.allAnchoredTexts.push({
          text : $element.text(),
          container : staff,
          x : $element.attr('x'),
          y : $element.attr('y'),
          ho : $element.attr('ho'),
          vo : $element.attr('vo')
        });
      },

      resolveUnresolvedTimestamps : function(layer, staff_n, measure_n) {
        var me = this, refLocationIndex;
        // check if there's an unresolved TStamp2 reference to this location
        // (measure, staff, layer):
        if (!measure_n) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.me.extract_events:', '<measure> must have @n specified');
        }
        staff_n = staff_n || 1;
        refLocationIndex = measure_n + ':' + staff_n + ':' + ($(layer).attr('n') || '1');
        if (me.unresolvedTStamp2[refLocationIndex]) {
          $(me.unresolvedTStamp2[refLocationIndex]).each(function(i, eventLink) {
            eventLink.setContext({
              layer : layer,
              meter : me.currentStaffInfos[staff_n].meter
            });
            // TODO: remove eventLink from the list
            me.unresolvedTStamp2[refLocationIndex][i] = null;
          });
          // at this point all references should be supplied with context.
          me.unresolvedTStamp2[refLocationIndex] = null;
        }
      },

      /**
       * Extract <tie>, <slur> or <hairpin> elements and create EventLink
       * objects
       */
      extract_linkingElements : function(measure, element_name, eventlink_container) {
        var me = this;

        var link_staffInfo = function(lnkelem) {
          return {
            staff_n : $(lnkelem).attr('staff') || '1',
            layer_n : $(lnkelem).attr('layer') || '1'
          };
        };

        // convert tstamp into startid in current measure
        var local_tstamp2id = function(tstamp, lnkelem, measure) {
          var stffinf = link_staffInfo(lnkelem);
          var staff = $(measure).find('staff[n="' + stffinf.staff_n + '"]');
          var layer = $(staff).find('layer[n="' + stffinf.layer_n + '"]').get(0);
          if (!layer) {
            var layer_candid = $(staff).find('layer');
            if (layer_candid && !layer_candid.attr('n'))
              layer = layer_candid;
            if (!layer)
              throw m2v.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E01', 'Cannot find layer');
          }
          var staffdef = me.currentStaffInfos[stffinf.staff_n];
          if (!staffdef)
            throw m2v.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E02', 'Cannot determine staff definition.');
          var meter = staffdef.meter;
          if (!meter.count || !meter.unit)
            throw m2v.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E03', "Cannot determine meter; missing or incorrect @meter.count or @meter.unit.");
          return MeiLib.tstamp2id(tstamp, layer, meter);
        };

        var measure_partOf = function(tstamp2) {
          return tstamp2.substring(0, tstamp2.indexOf('m'));
        };

        var beat_partOf = function(tstamp2) {
          return tstamp2.substring(tstamp2.indexOf('+') + 1);
        };

        var link_elements = $(measure).find(element_name);

        $.each(link_elements, function(i, lnkelem) {
          var eventLink = new m2v.EventLink(null, null);
          if (element_name === 'hairpin') {
            var form = $(lnkelem).attr('form');
            if (!form) {
              throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:extract_linkingElements', '@form is mandatory in <hairpin> - make sure the xml is valid.');
            }
            eventLink.setParams({
              form : form,
              place : $(lnkelem).attr('place')
            });
          } else {
            eventLink.setParams({
              bezier : $(lnkelem).attr('bezier'),
              y_shift_start : +$(lnkelem).attr('startvo'),
              y_shift_end : +$(lnkelem).attr('endvo')
            });
          }
          // find startid for eventLink. if tstamp is provided in the
          // element,
          // tstamp will be calculated.
          var startid = $(lnkelem).attr('startid');
          if (startid) {
            eventLink.setFirstId(startid);
          } else {
            var tstamp = $(lnkelem).attr('tstamp');
            if (tstamp) {
              startid = local_tstamp2id(tstamp, lnkelem, measure);
              eventLink.setFirstId(startid);
            } else {
              // no @startid, no @tstamp ==> eventLink.first_ref
              // remains empty.
            }
          }

          // find end reference value (id/tstamp) of eventLink:
          var endid = $(lnkelem).attr('endid');
          if (endid) {
            eventLink.setLastId(endid);
          } else {
            var tstamp2 = $(lnkelem).attr('tstamp2');
            if (tstamp2) {
              var measures_ahead = +measure_partOf(tstamp2);
              if (measures_ahead > 0) {
                eventLink.setLastTStamp(beat_partOf(tstamp2));
                // register that eventLink needs context;
                // need to save: measure.n, link.staff_n,
                // link.layer_n
                var staffinfo = link_staffInfo(lnkelem);
                var target_measure_n = +$(measure).attr('n') + measures_ahead;
                var refLocationIndex = target_measure_n.toString() + ':' + staffinfo.staff_n + ':' + staffinfo.layer_n;
                if (!me.unresolvedTStamp2[refLocationIndex])
                  me.unresolvedTStamp2[refLocationIndex] = [];
                me.unresolvedTStamp2[refLocationIndex].push(eventLink);
              } else {
                endid = local_tstamp2id(beat_partOf(tstamp2), lnkelem, measure);
                eventLink.setLastId(endid);
              }
            } else {
              // TODO no @endid, no @tstamp2 ==> eventLink.last_ref
              // remains
              // empty.
            }
          }
          eventlink_container.add(eventLink);
        });
      },

      processElement : function(element, parent_layer, parent_staff_element, staff) {
        var me = this, fn = me.elementFnMap[element.localName];
        if (fn) {
          return me[fn](element, staff, parent_layer, parent_staff_element);
        }
        throw m2v.RUNTIME_ERROR('BadArguments', 'Rendering of element "' + element_type + '" is not supported.');
      },

      elementFnMap : {
        rest : 'processRest',
        mRest : 'processmRest',
        space : 'processSpace',
        note : 'processNote',
        beam : 'processBeam',
        chord : 'processChord',
        anchoredText : 'processAnchoredText'
      },

      processAnchoredText : function() {
        return;
        // TODO
      },

      getClefForStaffNr : function(staff_n) {
        var me = this, staff_info;
        staff_info = me.currentStaffInfos[staff_n];
        if (!staff_info) {
          throw m2v.RUNTIME_ERROR('MEI2VF.getClefForStaffNr():E01', 'No staff definition for staff n=' + staff_n);
        }
        return staff_info.getClef();
      },

      processNote : function(element, staff, parent_layer, parent_staff_element) {
        var me = this, dots, mei_acci, mei_ho, pname, oct, xml_id, mei_tie, mei_slur, i;

        var atts = m2v.attsToObj(element);

        dots = +atts.dots;
        mei_accid = atts.accid;
        mei_ho = atts.ho;
        pname = atts.pname;
        oct = atts.oct;
        xml_id = atts['xml:id'];
        mei_tie = atts.tie;
        mei_slur = atts.slur;

        try {
          var staff_n = $(parent_staff_element).attr('n');

          var note_opts = {
            keys : [me.processAttsPitch(element)],
            clef : me.getClefForStaffNr(staff_n),
            duration : me.processAttsDuration(element)
          };

          me.setStemDir(element, note_opts);
          var note = new VF.StaveNote(note_opts);
          note.setStave(staff);

          me.processSyllables(note, element, staff_n);
          me.addDirections(note, xml_id);

          try {
            for ( i = 0; i < dots; i += 1) {
              note.addDotToAll();
            }
          } catch (e) {
            throw m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the dots of <note>: ' + m2v.util.listAttrs(element));
          }

          if (mei_accid) {
            me.processAttrAccid(mei_accid, note, 0);
          }
          if (mei_ho) {
            me.processAttrHo(mei_ho, note);
          }

          $.each($(element).find('artic'), function(i, ar) {
            note.addArticulation(0, new VF.Articulation(m2v.tables.articulations[$(ar).attr('artic')]).setPosition(m2v.tables.positions[$(ar).attr('place')]));
          });
          // FIXME For now, we'll remove any child nodes of <note>
          $.each($(element).children(), function(i, child) {
            $(child).remove();
          });

          // Build a note object that keeps the xml:id

          if (!pname) {
            throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have pname attribute');
          }
          if (!oct) {
            throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have oct attribute');
          }

          // If xml:id is missing, create it
          if (!xml_id) {
            xml_id = MeiLib.createPseudoUUID();
            $(element).attr('xml:id', xml_id);
          }

          if (mei_tie) {
            me.processAttrTie(mei_tie, xml_id, pname, oct, me.currentSystem);
          }
          if (mei_slur) {
            me.processAttrSlur(mei_slur, xml_id, pname, oct, me.currentSystem);
          }

          me.notes_by_id[xml_id] = {
            meiNote : element,
            vexNote : note
          };

          // return note object
          return {
            vexNote : note,
            id : xml_id
          };

        } catch (e1) {
          throw m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <note>: ' + m2v.util.listAttrs(element));
        }
      },

      // TODO add support for features found in me.processNote (annot etc.)
      // extract functions!?
      processChord : function(element, staff, parent_layer, parent_staff_element) {
        var me = this, i, j, hasDottedNote = false, $children, dots = [], keys = [], duration, durations = [], mei_accid, durAtt, xml_id, mei_tie, mei_slur, mei_ho;

        $children = $(element).children();
        durAtt = $(element).attr('dur');
        mei_ho = $(element).attr('ho');

        try {
          if (durAtt) {
            duration = me.translateDuration(+durAtt);
          } else {
            for ( i = 0, j = $children.length; i < j; i += 1) {
              durations.push(+$children[i].getAttribute('dur'));
            }
            duration = me.translateDuration(Math.max.apply(Math, durations));
          }

          for ( i = 0, j = $children.length; i < j; i += 1) {
            keys.push(me.processAttsPitch($children[i]));
            // dots.push(+$children[i].getAttribute('dots'));
            if ($children[i].getAttribute('dots') === '1') {
              hasDottedNote = true;
            }
          }

          // TODO handle dots with ledger lines (has to be fixed in VexFlow)
          if (hasDottedNote || $(element).attr('dots')) {
            duration += 'd';
          }

          var chord_opts = {
            keys : keys,
            clef : me.getClefForStaffNr($(parent_staff_element).attr('n')),
            duration : duration
          };

          me.setStemDir(element, chord_opts);
          var chord = new VF.StaveNote(chord_opts);
          chord.setStave(staff);

          $children.each(function(i, mei_note) {
            mei_accid = $(mei_note).attr('accid');
            if (mei_accid) {
              me.processAttrAccid(mei_accid, chord, i);
            }
          });

          if (hasDottedNote || $(element).attr('dots')) {
            chord.addDotToAll();
          }

          if (mei_ho) {
            me.processAttrHo(mei_ho, chord);
          }

          return chord;
        } catch (e) {
          throw m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <chord>:' + e.toString());
          // 'A problem occurred processing the <chord>: ' +
          // JSON.stringify($.each($(element).children(), function(i,
          // element) {
          // element.attrs();
          // }).get()) + '. \"' + x.toString() + '"');
        }
      },

      processRest : function(element, staff, parent_layer, parent_staff_element) {
        var me = this, dur, rest, mei_ho, xml_id;
        try {
          dur = me.processAttsDuration(element, true);
          // assign whole rests to the fourth line, all others to the
          // middle line:
          rest = new VF.StaveNote({
            keys : [(dur === 'w') ? 'd/5' : 'b/4'],
            duration : dur + 'r'
          });

          xml_id = $(element).attr('xml:id');

          me.addDirections(rest, xml_id);

          mei_ho = $(element).attr('ho');
          if (mei_ho) {
            me.processAttrHo(mei_ho, rest);
          }

          rest.setStave(staff);
          if ($(element).attr('dots') === '1') {
            rest.addDotToAll();
          }
          return rest;
        } catch (e) {
          throw m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <rest>: ' + m2v.util.listAttrs(element));
        }
      },

      processmRest : function(element, staff, parent_layer, parent_staff_element) {
        var me = this, mRest, mei_ho;

        try {
          mRest = new VF.StaveNote({
            keys : ['d/5'],
            duration : 'wr'
          });
          mei_ho = $(element).attr('ho');
          if (mei_ho) {
            me.processAttrHo(mei_ho, mRest);
          }
          mRest.setStave(staff);
          return mRest;
        } catch (x) {
          throw m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <mRest>: ' + m2v.util.listAttrs(element));
        }
      },

      processSpace : function(element, staff) {
        var me = this, space;
        try {
          space = new VF.GhostNote({
            duration : me.processAttsDuration(element, true) + 'r'
          });
          space.setStave(staff);
          return space;
        } catch (e) {
          throw m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <space>: ' + m2v.util.listAttrs(element));
        }
      },

      processBeam : function(element, staff, parent_layer, parent_staff_element) {
        var me = this, elements;
        elements = $(element).children().map(function(i, note) {
          // make sure to get vexNote out of wrapped note objects
          var proc_element = me.processElement(note, parent_layer, parent_staff_element, staff);
          return proc_element.vexNote || proc_element;
        }).get();
        me.allBeams.push(new VF.Beam(elements));
        return elements;
      },

      accidentalMap : {
        'n' : 'n',
        'f' : 'b',
        's' : '#',
        'bb' : 'ff',
        'ss' : '##'
      },

      processAttrAccid : function(mei_accid, vexObject, i) {
        var me = this, val = me.accidentalMap[mei_accid];
        if (!val) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadAttributeValue', 'Invalid attribute value: ' + mei_accid);
        }
        vexObject.addAccidental(i, new VF.Accidental(val));
      },

      processAttrHo : function(mei_ho, vexObject) {
        var me = this;
        vexObject.setExtraLeftPx(+mei_ho * me.halfLineDistance);
      },

      processAttrTie : function(mei_tie, xml_id, pname, oct, system) {
        var me = this, i, j;
        // if (!mei_tie) {
        // mei_tie = "";
        // }
        for ( i = 0, j = mei_tie.length; i < j; ++i) {
          switch (mei_tie[i]) {
            case 'i' :
              me.ties.start_tieslur(xml_id, {
                pname : pname,
                oct : oct,
                system : system
              });
              break;
            case 't' :
              me.ties.terminate_tie(xml_id, {
                pname : pname,
                oct : oct,
                system : system
              });
          }
        }
      },

      processAttrSlur : function(mei_slur, xml_id, pname, oct, system) {
        var me = this, tokens;
        if (mei_slur) {
          // create a list of { letter, num }
          tokens = me.parse_slur_attribute(mei_slur);
          $.each(tokens, function(i, token) {
            switch (token.letter) {
              case 'i' :
                me.slurs.start_tieslur(xml_id, {
                  nesting_level : token.nesting_level,
                  system : system
                });
                break;
              case 't' :
                me.slurs.terminate_slur(xml_id, {
                  nesting_level : token.nesting_level,
                  system : system
                });
                break;
            }
          });
        }
      },

      parse_slur_attribute : function(slur_str) {
        var result = [], numbered_tokens, numbered_token, i, j, num;
        numbered_tokens = slur_str.split(' ');
        for ( i = 0, j = numbered_tokens.length; i < j; i += 1) {
          numbered_token = numbered_tokens[i];
          if (numbered_token.length === 1) {
            result.push({
              letter : numbered_token,
              nesting_level : 0
            });
          } else if (numbered_token.length === 2) {
            num = +numbered_token[1];
            if (!num) {
              throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
            }
            result.push({
              letter : numbered_token[0],
              nesting_level : num
            });
          } else {
            throw m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
          }
        }
        return result;
      },

      /**
       * reads and converts the pitch of an <note> element
       *
       * @param {} mei_note
       * @return {String} the VexFlow pitch
       */
      processAttsPitch : function(mei_note) {
        var me = this, pname, oct;
        pname = $(mei_note).attr('pname');
        oct = $(mei_note).attr('oct');
        if (!pname || !oct) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'pname and oct attributes must be specified for <note>');
        }
        return pname + '/' + oct;
      },

      // called from <measure>
      getDirectionsInElement : function(element) {
        var me = this, directions = [];

        $(element).find('dir').each(function() {
          directions.push({
            text : $(this).text().trim(),
            startid : me.getMandatoryAttr(this, 'startid'),
            place : me.getMandatoryAttr(this, 'place')
          });
        });

        return directions;
      },

      addDirections : function(note, xml_id) {
        var me = this, thisDir, i = me.directionsInCurrentMeasure.length;
        while (i--) {
          thisDir = me.directionsInCurrentMeasure[i];
          if (thisDir.startid === xml_id) {
            note.addAnnotation(2, thisDir.place === 'below' ? me.createAnnot(thisDir.text, me.cfg.annotFont).setBottom(true) : me.createAnnot(thisDir.text, me.cfg.annotFont));
          }
        }
      },

      processSyllables : function(note, element, staff_n) {
        var me = this, annot, syl;
        syl = me.processSyllable(element);
        if (syl) {
          annot = me.createAnnot(syl.text, me.cfg.lyricsFont).setBottom(true);
          // TODO handle justification
          // .setJustification(VF.Annotation.Justify.LEFT);

          if (syl.wordpos) {
            me.hyphenation.addSyllable(annot, syl.wordpos, staff_n);
          }
        } else {
          // currently, *syllables* are added to the vexNote even if
          // there are no acutal mei_syl elements. This seems to improve spacing
          // in VexFlow but should be changed eventually
          annot = me.createAnnot('', me.cfg.lyricsFont).setBottom(true);
        }
        note.addAnnotation(2, annot);
      },

      // Add annotation (lyrics)
      // processSyllable : function(mei_note) {
      // var me = this, syl, full_syl = '', dash;
      // syl = $(mei_note).find('syl');
      // $(syl).each(function(i, s) {
      // dash = ($(s).attr('wordpos') === 'i' || $(s).attr('wordpos') === 'm') ?
      // '-' : '';
      // full_syl += (i > 0 ? '\n' : '') + $(s).text() + dash;
      // });
      // return full_syl;
      // },

      // temporarily only handle one syllable per note
      processSyllable : function(mei_note) {
        var me = this, syl, full_syl = '', dash, wordpos;
        syl = $(mei_note).find('syl')[0];
        if (syl) {
          wordpos = $(syl).attr('wordpos');
          return {
            text : $(syl).text(),
            wordpos : wordpos
          };
        }
      },

      // Support for annotations (lyrics, directions, etc.)
      createAnnot : function(text, annotFont) {
        var me = this;
        return (new VF.Annotation(text)).setFont(annotFont.family, annotFont.size, annotFont.weight);
      },

      getMandatoryAttr : function(element, attribute) {
        var me = this, result;
        result = $(element).attr(attribute);
        if (!result) {
          throw m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'Attribute ' + attribute + ' is mandatory.');
        }
        return result;
      },

      durMap : {
        '1' : 'w',
        '2' : 'h',
        '4' : 'q',
        '8' : '8',
        '16' : '16',
        '32' : '32',
        '64' : '64'
        // '128': '',
        // '256': '',
        // '512': '',
        // '1024': '',
        // '2048': '',
        // 'maxima': '',
        // 'longa': '',
        // 'brevis': '',
        // 'semibrevis': '',
        // 'minima': '',
        // 'semiminima': '',
        // 'fusa': '',
        // 'semifusa': ''
      },

      translateDuration : function(mei_dur) {
        var me = this, result;
        mei_dur += '';
        result = me.durMap[mei_dur];
        if (result) {
          return result;
        }
        // if (mei_dur === 'long') return ;
        if (mei_dur === 'breve') {
          if (VF.durationToTicks.durations['0'] != undefined) {
            return '0';
          }
          return 'w';
        }
        throw m2v.RUNTIME_ERROR('BadArguments', 'The MEI duration "' + mei_dur + '" is not supported.');
      },

      processAttsDuration : function(mei_note, noDots) {
        var me = this, dur, dur_attr;

        dur_attr = $(mei_note).attr('dur');
        if (dur_attr === undefined) {
          alert('Could not get duration from:\n' + JSON.stringify(mei_note, null, '\t'));
        }
        dur = me.translateDuration(dur_attr);
        if (!noDots && $(mei_note).attr('dots') === '1') {
          dur += 'd';
        }
        return dur;
        // return me.translateDuration($(mei_note).attr('dur')) +
        // (allow_dotted
        // === true && $(mei_note).attr('dots') === '1') ? 'd' : '';
        // return me.translateDuration($(mei_note).attr('dur'));
      },

      setStemDir : function(element, optionsObj) {
        var me = this, specified_dir;
        specified_dir = {
        down: VF.StaveNote.STEM_DOWN,
        up: VF.StaveNote.STEM_UP
        }[$(element).attr('stem.dir')];
        if (specified_dir) {
          optionsObj.stem_direction = specified_dir;
        } else {
          optionsObj.auto_stem = true;
        }
      },

      // TODO change canvas width and height when a target canvas is passed!
      // TODO handle jQuery target objects, too!?
      createCanvas : function(target, backend) {
        var me = this, h, w;
        h = me.cfg.page_height;
        w = me.cfg.page_width;
        if (target.localName === 'canvas' || target.localName === 'svg') {
          return target;
        }
        if (+backend === VF.Renderer.Backends.RAPHAEL) {
          w /= me.cfg.page_scale;
          h /= me.cfg.page_scale;
          return $('<svg width="' + w + '" height="' + h + '"></svg>').appendTo(target).get(0);
        }
        return $('<canvas width="' + w + '" height="' + h + '"></canvas>').appendTo(target).get(0);
      },

      /**
       * creates the renderer context
       *
       * @param target {} the target element
       * @param backend {} the backend
       * @returns the canvas context
       */
      createContext : function(canvas, backend) {
        return new VF.Renderer(canvas, backend || VF.Renderer.Backends.CANVAS).getContext();
      },

      /**
       * scales the current context
       *
       * @param ctx {} the canvas context
       * @param scale {Number} the scale ratio. 1 means 100%
       */
      scaleContext : function(ctx, scale) {
        ctx.scale(scale, scale);
      },

      // FIXME display errors
      // TODO simplify raphael scaling
      scaleContextRaphael : function(canvas, ctx, scale) {
        var me = this, paper, h, w;
        // paper = ctx.paper;
        // h = me.cfg.page_height;
        // w = me.cfg.page_width;
        // paper.setViewBox(0, 0, w / scale, h / scale);
        // paper.canvas.setAttribute('preserveAspectRatio', 'none');
        // $(canvas).find('svg').attr('width', w).attr('height', h);
        // $(canvas).attr('width', w).attr('height', h);
      },

      // TODO align start modifiers (changes in vexflow necessary??)
      drawVexStaffs : function(allVexMeasureStaffs, ctx) {
        var i, k, max_start_x, startModifiers, staff;
        i = allVexMeasureStaffs.length;
        while (i--) {
          if (allVexMeasureStaffs[i]) {
            max_start_x = 0;
            // get maximum start_x of all staffs in measure
            k = allVexMeasureStaffs[i].length;
            while (k--) {
              staff = allVexMeasureStaffs[i][k];
              if (staff) {
                max_start_x = Math.max(max_start_x, staff.getNoteStartX());
              }
            }
            k = allVexMeasureStaffs[i].length;
            while (k--) {
              staff = allVexMeasureStaffs[i][k];
              if (staff) {
                staff.setNoteStartX(max_start_x);
                staff.setContext(ctx).draw();
              }
            }
          }
        }
      },

      drawVexVoices : function(allStaffVoices, ctx) {
        var me = this, i, j, start_x, staffsInMeasure;
        for ( i = 0, j = allStaffVoices.length; i < j; i += 1) {
          staffsInMeasure = allStaffVoices[i].measureStaffs;
          allStaffVoices[i].staveVoices.format(staffsInMeasure[1].getNoteEndX() - staffsInMeasure[1].getNoteStartX() - me.cfg.measurePaddingRight);
          allStaffVoices[i].staveVoices.draw(ctx, staffsInMeasure);
        }
      },

      drawVexBeams : function(beams, ctx) {
        $.each(beams, function(i, beam) {
          beam.setContext(ctx).draw();
        });
      },

      // TODO make anchored texts staff modifiers
      drawAnchoredTexts : function(allAnchoredTexts, halfLineDistance, ctx) {
        var me = this, x, y, staff;
        $.each(allAnchoredTexts, function(i, obj) {
          staff = obj.container;
          y = +obj.y || staff.getYForLine(3) - 4 + (+obj.vo * halfLineDistance || 0);
          x = +obj.x || staff.glyph_start_x + (+obj.ho * halfLineDistance || 0);
          ctx.font = obj.font || '20px Times';
          if (obj.align) {
            ctx.textAlign = obj.align;
          }
          ctx.fillText(obj.text, x, y);
        });
      },

      exportRenderedMeasures : function(measures) {
        m2v.rendered_measures = measures;
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
