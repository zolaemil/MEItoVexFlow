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

// TODO auto left indent for labels

var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * Converts an MEI XML document to VexFlow objects and optionally renders it
     * using Raphael or HTML5 Canvas
     *
     * @constructor
     */
    m2v.Converter = function(config) {
      if (config)
        this.initConfig(config);
      return this;
    };

    m2v.Converter.prototype = {

      // STAVE_HEIGHT, HALF_LINE_DISTANCE are currently fixed
      STAVE_HEIGHT : 40, // VF.Staff.spacing_between_lines_px * 4;
      HALF_LINE_DISTANCE : 5, // VF.Staff.spacing_between_lines_px / 2;

      BOTTOM : VF.Annotation.VerticalJustify.BOTTOM,

      defaults : {
        systemLeftMar : 0,
        systemSpacing : 90,
        staveSpacing : 60,
        measurePaddingRight : 10, // VexFlow's default value: 20
        autoStaveConnectorLine : true,
        autoMeasureNumbers : false,
        labelMode : null, // no voice labels by default
        maxHyphenDistance : 75,
        //sectionsOnNewLine : false, // TODO: add feature
        // NB the weight properties can be used to specify style, weight or
        // both (space separated); some of the objects are passed directly to
        // vexFlow (which requires the name 'weight'), so the name is 'weight'
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
          top_text_position : 1.5, // 1 // in staff lines
          bottom_text_position : 7.5
        }
      },

      // TODO add setters (and getters?) for single config items / groups
      initConfig : function(config) {
        var me = this;
        me.cfg = $.extend(true, {}, me.defaults, config);
        me.printSpaceWidth = Math.floor(me.cfg.printSpaceRight - me.cfg.printSpaceLeft) - 1;
        return me;
      },

      process : function(xmlDoc) {
        var me = this, xmlDoc;
        me.reset();
        me.processScoreDef($(xmlDoc).find('scoreDef')[0]);
        me.processSections(xmlDoc);
        me.ties.createVexFromLinks(me.notes_by_id);
        me.slurs.createVexFromLinks(me.notes_by_id);
        me.hairpins.createVexFromLinks(me.notes_by_id);
        return me;
      },

      draw : function() {
        var me = this, ctx = me.cfg.ctx;
        me.drawVexStaffs(me.allVexMeasureStaffs, ctx);
        me.startConnectors.setContext(ctx).draw();
        me.inlineConnectors.setContext(ctx).draw();
        me.drawVexVoices(me.allStaffVoices, ctx);
        me.drawVexBeams(me.allBeams, ctx);
        me.ties.setContext(ctx).draw();
        me.slurs.setContext(ctx).draw();
        me.hairpins.setContext(ctx).draw();
        me.texts.setContext(ctx).draw();
        me.drawAnchoredTexts(me.allAnchoredTexts, me.HALF_LINE_DISTANCE, ctx);
        me.hyphenation.setContext(ctx).draw();
        return me;
      },

      reset : function() {
        var me = this;
        /**
         * contains all Vex.Flow.Stave objects in a 2d array
         * [measure_n][staff_n]
         */
        me.allVexMeasureStaffs = [];
        me.allStaffVoices = [];
        me.allAnchoredTexts = [];
        me.allBeams = [];

        me.texts = new m2v.Texts();
        me.startConnectors = new m2v.Connectors(me.cfg.labelMode);
        me.inlineConnectors = new m2v.Connectors();
        me.ties = new m2v.Ties();
        me.slurs = new m2v.Ties();
        me.hairpins = new m2v.Hairpins();
        me.hyphenation = new m2v.Hyphenation(me.cfg);

        /**
         * properties: xmlid: { meiNote: val, vexNote: val }
         */
        me.notes_by_id = {};
        me.currentSystem = 0;
        me.currentSystemMarginLeft = me.cfg.systemLeftMar;
        me.pendingSystemBreak = false;
        me.pendingSectionBreak = true;
        me.currentLowestY = 0;
        me.currentVoltaType = null;
        // me.currentMeasureX = null;
        me.unresolvedTStamp2 = [];
        /**
         * contains the currently effective MEI2VF.StaffInfo objects
         */
        me.currentStaffInfos = [];
        // TODO change to {xmlid1: [dir1, dir2], xmlid2: [dir3]} !?
        me.directionsInCurrentMeasure = [];
        return me;
      },

      processScoreDef : function(scoredef) {
        var me = this, i, j, children, systemLeftmar;
        systemLeftmar = $(scoredef).attr('system.leftmar');
        if ( typeof systemLeftmar === 'string') {
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
       * @param scoredef
       *            {Element} the scoreDef element to read
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
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + element.localName + '> is not supported in <scoreDef>');
        }
      },

      processPgHead : function(element) {
        var me = this;
        me.texts.addComplexText(element, {
          x : me.cfg.printSpaceLeft,
          y : 200,
          w : me.printSpaceWidth
        });
      },

      /**
       *
       * @param {Element}
       *            staffGrp
       * @param {Boolean}
       *            isChild specifies if the staffGrp is a child of another
       *            staffGrp (effect: auto staff connectors only get attached
       *            to the outermost staffGrp elements)
       * @return {Object} the range of the current staff group. Properties:
       *         first_n, last_n
       */
      processStaffGrp : function(staffGrp, isChild) {
        var me = this, range = {};
        $(staffGrp).children().each(function(i, childElement) {
          var childRange = me.processStaffGrp_child(childElement);
          m2v.L('Converter.processStaffGrp() {1}.{a}', 'childRange.first_n: ' + childRange.first_n, ' childRange.last_n: ' + childRange.last_n);
          if (i === 0)
            range.first_n = childRange.first_n;
          range.last_n = childRange.last_n;
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

        m2v.L('Converter.setConnectorModels() {2}', 'symbol: ' + symbol, ' range.first_n: ' + first_n, ' range.last_n: ' + last_n);

        // # left connectors specified in the MEI file
        me.startConnectors.setModelForStaveRange({
          top_staff_n : first_n,
          bottom_staff_n : last_n,
          symbol : symbol || 'line',
          label : $(staffGrp).attr('label'),
          labelAbbr : $(staffGrp).attr('label.abbr')
        });

        // # left auto line, only (if at all) attached to
        // //staffGrp[not(ancestor::staffGrp)]
        if (!isChild && me.cfg.autoStaveConnectorLine) {
          me.startConnectors.setModelForStaveRange({
            top_staff_n : first_n,
            bottom_staff_n : last_n,
            symbol : (symbol === 'none') ? 'none' : 'line'
          }, 'autoline');
        }

        // # inline connectors
        if (barthru === 'true') {
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
       * @param {}
       *            i
       * @param {Element}
       *            element
       * @return {Object} the range of staffs. Properties: first_n, last_n
       */
      processStaffGrp_child : function(element) {
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
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + element.localName + '> is not supported in <staffGrp>');
        }
      },

      /**
       * reads a staffDef, writes it to currentStaffInfos
       *
       * @param {Element}
       *            staffDef
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
       * current system and updates the staff modifier infos
       */
      startSystem : function(measure) {
        var me = this, i, currentSystemY, currentStaffY, lowestYCandidate, updateFn, spacing;

        m2v.L('Converter.startSystem() {enter}');

        me.pendingSystemBreak = false;
        me.currentSystem += 1;
        me.initStaffYs();
        me.currentMeasureX = me.cfg.printSpaceLeft + me.currentSystemMarginLeft;
        me.measureWidthsInSystem = me.getMeasureWidths(measure);

        if (me.pendingSectionBreak) {
          me.pendingSectionBreak = false;
          updateFn = 'forceSectionStartInfo';
        } else {
          updateFn = 'forceStaveStartInfo';
        }
        i = me.currentStaffInfos.length;
        while (i--) {
          if (me.currentStaffInfos[i])
            me.currentStaffInfos[i][updateFn]();
        }
      },

      initStaffYs : function() {
        var me = this, currentSystemY, currentStaffY, lowestYCandidate, i, j, isFirstStaff = true, infoSpacing;
        currentSystemY = (me.currentSystem === 1) ? me.cfg.printSpaceTop : me.currentLowestY + me.cfg.systemSpacing;
        currentStaffY = 0;
        for ( i = 1, j = me.currentStaffInfos.length; i < j; i += 1) {
          if (me.currentStaffInfos[i]) {
            infoSpacing = me.currentStaffInfos[i].spacing;
            currentStaffY += (isFirstStaff) ? 0 : (infoSpacing !== null) ? me.STAVE_HEIGHT + me.currentStaffInfos[i].spacing : me.STAVE_HEIGHT + me.cfg.staveSpacing;
            me.currentStaffInfos[i].absoluteY = currentSystemY + currentStaffY;
            isFirstStaff = false;
          }
        }
        lowestYCandidate = currentSystemY + currentStaffY + me.STAVE_HEIGHT;
        if (lowestYCandidate > me.currentLowestY)
          me.currentLowestY = lowestYCandidate;
      },

      /**
       * provides the width of all measures in a system, beginning with the
       * element startMeasure and ending before the next sb element
       *
       * @param startMeasure
       *            {Element} the start measure
       * @return {array} the widths of all measures in the current system
       */
      getMeasureWidths : function(startMeasure) {
        var me = this, widths;
        widths = me.addMissingMeasureWidths(me.getMEIWidthsTillSb(startMeasure));
        m2v.L('Converter.getMeasureWidths()', '#' + widths.length);
        return widths;
      },

      /**
       *
       * @param startElement
       *            {Element}
       * @return {Array} an array of all measure widths in the current stave
       */
      getMEIWidthsTillSb : function(startElement) {
        var me = this, currentElement = startElement, specifiedWidths = [];
        m2v.L('Converter.getMEIWidthsTillSb() {}');
        while (currentElement) {
          switch (currentElement.localName) {
            case 'measure' :
              specifiedWidths.push(Math.floor(+currentElement.getAttribute('width')) || null);
              break;
            case 'sb' :
              return specifiedWidths;
          }
          currentElement = me.getNext(currentElement);
          // currentElement = currentElement.nextSibling;
        }
        return specifiedWidths;
      },

      /**
       * gets the next sibling node or -- if it is undefined -- the first
       * element in the parent's following sibling
       */
      getNext : function(currentElement) {
        var me = this, parentElement, next;
        next = me.getNextElement(currentElement);
        if (next)
          return next;
        parentElement = currentElement.parentNode;
        next = me.getNextElement(parentElement);
        if (next)
          return next.firstChild;
      },

      getNextElement : function(element) {
        var n = element;
        do
          n = n.nextSibling;
        while (n && n.nodeType != 1);
        return n;
      },

      /**
       * calculates the width of all measures in a stave which don't have a
       * width specified in the MEI file
       *
       * @param widths
       *            {array}
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
        nonSpecifiedMeasureWidth = Math.floor((me.printSpaceWidth - me.currentSystemMarginLeft - totalSpecifiedMeasureWidth) / nonSpecified_n);
        for ( i = 0, j = widths.length; i < j; i += 1) {
          if (widths[i] === null)
            widths[i] = nonSpecifiedMeasureWidth;
        }
        return widths;
      },

      /**
       * sets the x coordinate for each (but the first) measure in a system
       */
      setNewMeasureX : function() {
        var me = this, previous_measure;
        // TODO check: is it necessary to check if there is a preceding
        // measure?

        previous_measure = me.allVexMeasureStaffs[me.allVexMeasureStaffs.length - 1][1];

        if (previous_measure) {
          me.currentMeasureX = previous_measure.x + previous_measure.width;
          m2v.L('Converter.setNewMeasureX()', 'currentMeasureX: ' + me.currentMeasureX);
        } else {
          me.currentMeasureX = me.cfg.printSpaceLeft + me.currentSystemMarginLeft;
          m2v.L('Converter.setNewMeasureX()', ' NO PREVIOUS MEASURE FOUND (!)');
        }
      },

      // TODO: add rule: if an ending is followed by another ending, add
      // space on the right (or choose a VexFlow parameter accordingly),
      // otherwise don't add space
      processSections : function(xmlDoc) {
        var me = this, i, j, sectionChildren;
        $(xmlDoc).find('section, ending').each(function(i, section) {
          if (section.localName === 'ending') {
            me.processEnding(section);
          } else {
            me.processSection(section);
          }
        });
      },

      processSection : function(element) {
        var me = this, i, j, sectionChildren = $(element).children();
        for ( i = 0, j = sectionChildren.length; i < j; i += 1) {
          me.processSectionChild(sectionChildren[i]);
        }
      },

      processEnding : function(element) {
        var me = this, i, j, sectionChildren = $(element).children();
        for ( i = 0, j = sectionChildren.length; i < j; i += 1) {
          me.currentVoltaType = {};
          if (i === 0)
            me.currentVoltaType.start = $(element).attr('n');
          if (i === j - 1)
            me.currentVoltaType.end = '1';
          me.processSectionChild(sectionChildren[i]);
        }
        me.currentVoltaType = null;
      },

      /**
       * MEI element <section> may contain (MEI v2.1.0): MEI.cmn: measure
       * MEI.critapp: app MEI.edittrans: add choice corr damage del gap
       * handShift orig reg restore sic subst supplied unclear MEI.shared:
       * annot ending expansion pb sb scoreDef section staff staffDef
       * MEI.text: div MEI.usersymbols: anchoredText curve line symbol
       *
       * Supported elements: <measure> <scoreDef> <staffDef> <sb>
       */
      processSectionChild : function(element) {
        var me = this;
        switch (element.localName) {
          case 'measure' :
            me.processMeasure(element);
            break;
          case 'scoreDef' :
            me.processScoreDef(element);
            break;
          case 'staffDef' :
            me.processStaffDef(element);
            break;
          case 'sb' :
            me.setPendingSystemBreak(element);
            break;
          default :
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + element.localName + '> is not supported in <section>');
        }
      },

      setPendingSystemBreak : function() {
        this.pendingSystemBreak = true;
      },

      processMeasure : function(element) {
        var me = this, measure_n, width, connectors, atSystemStart, left_barline, right_barline, currentStaveVoices, currentMeasureWidth, atSystemTop = true;

        if (me.pendingSectionBreak || me.pendingSystemBreak) {
          me.startSystem(element);
          atSystemStart = true;
          me.hyphenation.addLineBreaks(me.currentStaffInfos, me.currentMeasureX);
        } else {
          me.setNewMeasureX();
          atSystemStart = false;
        }

        currentMeasureWidth = me.measureWidthsInSystem.shift();

        m2v.L('Converter.processMeasure() {enter}', 'currentMeasureWidth: ' + currentMeasureWidth);

        currentStaveVoices = new m2v.StaveVoices();

        measure_n = +$(element).attr('n');

        left_barline = element.getAttribute('left');
        right_barline = element.getAttribute('right');

        me.directionsInCurrentMeasure = me.getDirectionsInElement(element);

        $(element).find('staff').each(function() {
          me.processStaffInMeasure(this, measure_n, left_barline, right_barline, atSystemStart, atSystemTop, currentStaveVoices, currentMeasureWidth);
          atSystemTop = false;
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
        me.extract_tempoElements(element, me.allVexMeasureStaffs[measure_n]);
      },

      // TODO handle timestamps! (it's possibly necessary to handle tempo element
      // as annotations)
      extract_tempoElements : function(element, measure) {
        var me = this, staff_n, staff, text, offsetX, vexTempo;
        $(element).find('tempo').each(function(i, tempoElement) {
          staff_n = $(tempoElement).attr('staff');
          ho = $(tempoElement).attr('ho');
          vo = $(tempoElement).attr('vo');
          staff = measure[staff_n];
          text = $(tempoElement).text();
          vexTempo = new Vex.Flow.StaveTempo({
            name : text,
            duration : $(tempoElement).attr('mm.unit'),
            dots : +$(tempoElement).attr('mm.dots'),
            bpm : +$(tempoElement).attr('mm')
          }, staff.x, 5);
          if (vo)
            vexTempo.setShiftY(+vo * me.HALF_LINE_DISTANCE);
          offsetX = (staff.getModifierXShift() > 0) ? -14 : 14;
          if (staff.hasTimeSignature)
            offsetX -= 24;
          if (ho)
            offsetX += +ho * me.HALF_LINE_DISTANCE;
          vexTempo.setShiftX(offsetX);
          vexTempo.font = me.cfg.tempoFont;
          staff.modifiers.push(vexTempo);
        });
      },

      processStaffInMeasure : function(staff_element, measure_n, left_barline, right_barline, atSystemStart, atSystemTop, currentStaveVoices, currentMeasureWidth) {
        var me = this, staff, staff_n, layers, anchoredTexts, readEvents, layer_events, labelText;

        staff_n = +$(staff_element).attr('n');

        staff = me.createVexStaff(measure_n, staff_n, left_barline, right_barline, currentMeasureWidth, atSystemStart, atSystemTop);

        if (me.allVexMeasureStaffs[measure_n] === undefined) {
          me.allVexMeasureStaffs[measure_n] = [];
        }
        me.allVexMeasureStaffs[measure_n][staff_n] = staff;

        anchoredTexts = $(staff_element).children('anchoredText').each(function(i, anchoredText) {
          me.processAnchoredStaffText(anchoredText, staff);
        });

        layers = $(staff_element).find('layer');

        readEvents = function(i, element) {
          var event = me.processElement(element, this, measure_n, staff_n, staff);
          return event.vexNote || event;
        };

        $.each(layers, function(i, layer) {
          me.resolveUnresolvedTimestamps(layer, staff_n, measure_n);
          layer_events = $(layer).children().map(readEvents).get();
          currentStaveVoices.addVoice(me.createVexVoice(layer_events, staff_n), staff_n);
        });

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
      createVexStaff : function(measure_n, staff_n, left_barline, right_barline, currentMeasureWidth, atSystemStart, atSystemTop) {
        var me = this, staffdef, staff, renderWith, currentStaffInfo, hasStartModifier = false;
        if (!staff_n) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArgument', 'Cannot render staff without attribute "n".');
        }

        currentStaffInfo = me.currentStaffInfos[staff_n];

        staff = new VF.Stave(me.currentMeasureX, currentStaffInfo.absoluteY, currentMeasureWidth, me.cfg.staff);

        // temporary; (due to a bug?) in VexFlow, bottom_text_position does
        // not
        // work when it's passed in the config object
        staff.options.bottom_text_position = me.cfg.staff.bottom_text_position;

        staff.font = me.cfg.staffFont;

        if (currentStaffInfo.showClefCheck()) {
          staff.addClef(currentStaffInfo.getClef());
          hasStartModifier = true;
        }
        if (currentStaffInfo.showKeysigCheck()) {
          staff.addKeySignature(currentStaffInfo.getKeySpec());
          hasStartModifier = true;

        }
        if (currentStaffInfo.showTimesigCheck()) {
          staff.addTimeSignature(currentStaffInfo.getTimeSig());
          staff.hasTimeSignature = true;
          hasStartModifier = true;
        }

        staff.setBegBarType( left_barline ? m2v.tables.barlines[left_barline] : VF.Barline.type.NONE);
        if (right_barline)
          staff.setEndBarType(m2v.tables.barlines[right_barline]);

        if (atSystemTop) {
          if (atSystemStart && me.cfg.autoMeasureNumbers && measure_n !== 1)
            staff.setMeasure(measure_n);
          if (me.currentVoltaType)
            me.addStaffVolta(staff);
        }
        if (atSystemStart)
          me.addStaffLabel(staff, staff_n);

        return staff;
      },

      addStaffVolta : function(staff) {
        var volta = this.currentVoltaType;
        if (volta.start)
          staff.setVoltaType(Vex.Flow.Volta.type.BEGIN, volta.start + '.', 30, 0);
        if (volta.end)
          staff.setVoltaType(Vex.Flow.Volta.type.END, "", 30, 0);
        if (!volta.start && !volta.end)
          staff.setVoltaType(Vex.Flow.Volta.type.MID, "", 30, 0);
      },

      addStaffLabel : function(staff, staff_n) {
        var me = this, labelText;
        switch (me.cfg.labelMode) {
          case 'full':
            labelText = (me.currentSystem === 1) ? me.currentStaffInfos[staff_n].label : (me.currentStaffInfos[staff_n].labelAbbr);
            break;
          case 'abbr':
            labelText = me.currentStaffInfos[staff_n].labelAbbr;
            break;
          default:
            return;
        }
        if (labelText) {
          staff.setText(labelText, Vex.Flow.Modifier.Position.LEFT, {
            shift_y : -3
          });
        }
      },

      createVexVoice : function(voice_contents, staff_n) {
        var me = this, voice, meter;
        if (!$.isArray(voice_contents)) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'me.createVexVoice() voice_contents argument must be an array.');
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
        if (!measure_n)
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.me.extract_events:', '<measure> must have @n specified');
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
              throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E01', 'Cannot find layer');
          }
          var staffdef = me.currentStaffInfos[stffinf.staff_n];
          if (!staffdef)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E02', 'Cannot determine staff definition.');
          var meter = staffdef.meter;
          if (!meter.count || !meter.unit)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E03', "Cannot determine meter; missing or incorrect @meter.count or @meter.unit.");
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
          var eventLink, atts, startid, tstamp, endid, tstamp2, measures_ahead;

          eventLink = new m2v.EventLink(null, null);

          atts = m2v.attsToObj(lnkelem);

          if (element_name === 'hairpin' && !atts.form) {
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:extract_linkingElements', '@form is mandatory in <hairpin> - make sure the xml is valid.');
          }

          eventLink.setParams(m2v.attsToObj(lnkelem));

          // find startid for eventLink. if tstamp is provided in the
          // element,
          // tstamp will be calculated.
          startid = atts.startid;
          if (startid) {
            eventLink.setFirstId(startid);
          } else {
            tstamp = atts.tstamp;
            if (tstamp) {
              startid = local_tstamp2id(tstamp, lnkelem, measure);
              eventLink.setFirstId(startid);
            }
            // else {
            // // no @startid, no @tstamp ==> eventLink.first_ref
            // remains empty.
            // }
          }

          // find end reference value (id/tstamp) of eventLink:
          endid = atts.endid;
          if (endid) {
            eventLink.setLastId(endid);
          } else {
            tstamp2 = atts.tstamp2;
            if (tstamp2) {
              measures_ahead = +measure_partOf(tstamp2);
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
            }
            // else {
            // // TODO no @endid, no @tstamp2 ==> eventLink.last_ref
            // remains empty.
            // }
          }
          eventlink_container.add(eventLink);
        });
      },

      processElement : function(element, parent_layer, measure_n, staff_n, staff) {
        var me = this;
        switch (element.localName) {
          case 'rest' :
            return me.processRest(element, staff, parent_layer, measure_n, staff_n);
          case 'mRest' :
            return me.processmRest(element, staff, parent_layer, measure_n, staff_n);
          case 'space' :
            return me.processSpace(element, staff, parent_layer, measure_n, staff_n);
          case 'note' :
            return me.processNote(element, staff, parent_layer, measure_n, staff_n);
          case 'beam' :
            return me.processBeam(element, staff, parent_layer, measure_n, staff_n);
          case 'chord' :
            return me.processChord(element, staff, parent_layer, measure_n, staff_n);
          case 'anchoredText' :
            return me.processAnchoredText(element, staff, parent_layer, measure_n, staff_n);
          default :
            throw new m2v.RUNTIME_ERROR('BadArguments', 'Rendering of element "' + element_type + '" is not supported.');
        }
      },

      processAnchoredText : function() {
        // TODO
        return;
      },

      getClefForStaffNr : function(staff_n) {
        var me = this, staff_info;
        staff_info = me.currentStaffInfos[staff_n];
        if (!staff_info) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.getClefForStaffNr():E01', 'No staff definition for staff n=' + staff_n);
        }
        return staff_info.getClef();
      },

      processNote : function(element, staff, parent_layer, measure_n, staff_n) {
        var me = this, dots, mei_acci, mei_ho, pname, oct, xml_id, mei_tie, mei_slur, i, atts, note_opts, note;

        atts = m2v.attsToObj(element);

        dots = +atts.dots;
        mei_accid = atts.accid;
        mei_ho = atts.ho;
        pname = atts.pname;
        oct = atts.oct;
        mei_tie = atts.tie;
        mei_slur = atts.slur;
        note_staff_n = +atts.staff || staff_n;

        xml_id = atts['xml:id'];
        // If xml:id is missing, create it
        if (!xml_id) {
          xml_id = MeiLib.createPseudoUUID();
          $(element).attr('xml:id', xml_id);
        }

        try {

          note_opts = {
            keys : [me.processAttsPitch(element)],
            clef : me.getClefForStaffNr(staff_n),
            duration : me.processAttsDuration(element)
          };

          me.setStemDir(element, note_opts);
          note = new VF.StaveNote(note_opts);

          if (note_staff_n === staff_n) {
            note.setStave(staff);
          } else {
            var otherStaff = me.allVexMeasureStaffs[measure_n][note_staff_n];
            if (otherStaff) {
              // TODO: the note is correctly assigned to the new staff
              // here, but
              // in the end it has the old staff assigned to it -> fix
              // that!
              // REASON PROBABLY: all notes get assigned to the old
              // staff when
              // the voices are drawn in StaveVoices.js
              // ALSO: Vex.Flow.Voice seems to assign all voice
              // tickables to only
              // one staff
              // n = note;
              note.setStave(otherStaff);
              // console.log(note);
              // throw null;
              // console.log(measure_n);
              // console.log(note_staff_n + '###############' +
              // staff_n);
              // console.log(otherStaff);
              // console.log(me.allVexMeasureStaffs[measure_n]);
            } else {
              throw new m2v.RUNTIME_ERROR('Error', 'Note has staff attribute "' + note_staff_n + '", but the staff does not exist.');
            }
          }

          me.processSyllables(note, element, staff_n);
          me.addDirections(note, xml_id);

          try {
            for ( i = 0; i < dots; i += 1) {
              note.addDotToAll();
            }
          } catch (e) {
            throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the dots of <note>: ' + m2v.listAttrs(element));
          }

          if (mei_accid)
            me.processAttrAccid(mei_accid, note, 0);
          if (mei_ho)
            me.processAttrHo(mei_ho, note);

          $.each($(element).find('artic'), function(i, ar) {
            me.addArticulation(note, ar);
          });
          // FIXME For now, we'll remove any child nodes of <note>
          $.each($(element).children(), function(i, child) {
            $(child).remove();
          });

          // Build a note object that keeps the xml:id

          if (!pname)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have pname attribute');
          if (!oct)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have oct attribute');

          if (mei_tie)
            me.processAttrTie(mei_tie, xml_id, pname, oct, me.currentSystem);
          if (mei_slur)
            me.processAttrSlur(mei_slur, xml_id, pname, oct, me.currentSystem);

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
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <note>: ' + m2v.listAttrs(element) + '\nORIGINAL ERROR MESSAGE: ' + e1.toString());
        }
      },

      // TODO add support for features found in me.processNote (annot etc.)
      // extract functions!?
      processChord : function(element, staff, parent_layer, measure_n, staff_n) {
        var me = this, i, j, hasDots, $children, dots = [], keys = [], duration, durations = [], mei_accid, durAtt, xml_id, mei_tie, mei_slur, mei_ho, chord, chord_opts;

        $children = $(element).children();

        atts = m2v.attsToObj(element);
        durAtt = atts.dur;
        mei_ho = atts.ho;
        // mei_tie = atts.tie;
        // mei_slur = atts.slur;

        var xml_id = atts['xml:id'];
        // If xml:id is missing, create it
        if (!xml_id) {
          xml_id = MeiLib.createPseudoUUID();
          $(element).attr('xml:id', xml_id);
        }

        hasDots = !!$(element).attr('dots');

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
            if ($children[i].getAttribute('dots') === '1')
              hasDots = true;
          }

          // TODO handle dots with ledger lines (has to be fixed in
          // VexFlow)
          if (hasDots)
            duration += 'd';

          chord_opts = {
            keys : keys,
            clef : me.getClefForStaffNr(staff_n),
            duration : duration
          };

          me.setStemDir(element, chord_opts);
          chord = new VF.StaveNote(chord_opts);
          chord.setStave(staff);

          var allNoteIndices = [];

          $children.each(function(i, mei_note) {

            note_atts = m2v.attsToObj(mei_note);

            allNoteIndices.push(i);
            var note_mei_tie = note_atts.tie;
            var note_mei_slur = note_atts.slur;
            var note_xml_id = note_atts['xml:id'];
            // If xml:id is missing, create it
            if (!note_xml_id) {
              note_xml_id = MeiLib.createPseudoUUID();
              $(mei_note).attr('xml:id', note_xml_id);
            }

            if (note_mei_tie)
              me.processAttrTie(note_mei_tie, note_xml_id, note_atts.pname, note_atts.oct, me.currentSystem);
            if (mei_slur)
              me.processAttrSlur(note_mei_slur, note_xml_id, note_atts.pname, note_atts.oct, me.currentSystem);

            me.notes_by_id[note_xml_id] = {
              meiNote : element,
              vexNote : chord,
              index : [i]
            };

            mei_accid = $(mei_note).attr('accid');
            if (mei_accid)
              me.processAttrAccid(mei_accid, chord, i);
          });

          if (hasDots)
            chord.addDotToAll();
          if (mei_ho)
            me.processAttrHo(mei_ho, chord);

          // TODO add support for chord/@tie and chord/@slur

          me.notes_by_id[xml_id] = {
            meiNote : element,
            vexNote : chord,
            index : allNoteIndices
          };

          return chord;
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <chord>:' + e.toString());
          // 'A problem occurred processing the <chord>: ' +
          // JSON.stringify($.each($(element).children(), function(i,
          // element) {
          // element.attrs();
          // }).get()) + '. \"' + x.toString() + '"');
        }
      },

      processRest : function(element, staff, parent_layer, measure_n, staff_n) {
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
          if (mei_ho)
            me.processAttrHo(mei_ho, rest);

          rest.setStave(staff);
          if ($(element).attr('dots') === '1')
            rest.addDotToAll();
          return rest;
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <rest>: ' + m2v.listAttrs(element));
        }
      },

      processmRest : function(element, staff, parent_layer, measure_n, staff_n) {
        var me = this, mRest, mei_ho;

        try {
          mRest = new VF.StaveNote({
            keys : ['d/5'],
            duration : 'wr'
          });
          mei_ho = $(element).attr('ho');
          if (mei_ho)
            me.processAttrHo(mei_ho, mRest);
          mRest.setStave(staff);
          return mRest;
        } catch (x) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <mRest>: ' + m2v.listAttrs(element));
        }
      },

      processSpace : function(element, staff, parent_layer, measure_n, staff_n) {
        var me = this, space;
        try {
          space = new VF.GhostNote({
            duration : me.processAttsDuration(element, true) + 'r'
          });
          space.setStave(staff);
          return space;
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <space>: ' + m2v.listAttrs(element));
        }
      },

      processBeam : function(element, staff, parent_layer, measure_n, staff_n) {
        var me = this, elements;
        elements = $(element).children().map(function(i, note) {
          // make sure to get vexNote out of wrapped note objects
          var proc_element = me.processElement(note, parent_layer, measure_n, staff_n, staff);
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
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadAttributeValue', 'Invalid attribute value: ' + mei_accid);
        }
        vexObject.addAccidental(i, new VF.Accidental(val));
      },

      processAttrHo : function(mei_ho, vexObject) {
        var me = this;
        vexObject.setExtraLeftPx(+mei_ho * me.HALF_LINE_DISTANCE);
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
              throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
            }
            result.push({
              letter : numbered_token[0],
              nesting_level : num
            });
          } else {
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
          }
        }
        return result;
      },

      /**
       * reads and converts the pitch of an <note> element
       *
       * @param {}
       *            mei_note
       * @return {String} the VexFlow pitch
       */
      processAttsPitch : function(mei_note) {
        var me = this, pname, oct;
        pname = $(mei_note).attr('pname');
        oct = $(mei_note).attr('oct');
        if (!pname || !oct) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'pname and oct attributes must be specified for <note>');
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
            note.addAnnotation(0, thisDir.place === 'below' ? me.createAnnot(thisDir.text, me.cfg.annotFont).setVerticalJustification(me.BOTTOM) : me.createAnnot(thisDir.text, me.cfg.annotFont));
          }
        }
      },

      addArticulation : function(note, ar) {
        var vexArtic = new VF.Articulation(m2v.tables.articulations[ar.getAttribute('artic')]);
        var place = ar.getAttribute('place');
        if (place) {
          vexArtic.setPosition(m2v.tables.positions[place]);
        }
        note.addArticulation(0, vexArtic);
      },

      processSyllables : function(note, element, staff_n) {
        var me = this, annot, syl;
        syl = me.processSyllable(element);
        if (syl) {
          annot = me.createAnnot(syl.text, me.cfg.lyricsFont).setVerticalJustification(me.BOTTOM);
          // TODO handle justification
          // .setJustification(VF.Annotation.Justify.LEFT);

          if (syl.wordpos)
            me.hyphenation.addSyllable(annot, syl.wordpos, staff_n);
        } else {
          // TODO currently, *syllables* are added to the vexNote even if
          // there are no acutal mei_syl elements. This seems to improve
          // spacing
          // in VexFlow but should be changed eventually
          annot = me.createAnnot('', me.cfg.lyricsFont).setVerticalJustification(me.BOTTOM);
        }
        note.addAnnotation(0, annot);
      },

      // Add annotation (lyrics)
      // processSyllable : function(mei_note) {
      // var me = this, syl, full_syl = '', dash;
      // syl = $(mei_note).find('syl');
      // $(syl).each(function(i, s) {
      // dash = ($(s).attr('wordpos') === 'i' || $(s).attr('wordpos') === 'm')
      // ?
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
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'Attribute ' + attribute + ' is mandatory.');
        }
        return result;
      },

      durMap : {
        'breve' : '0',
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
        if (result)
          return result;
        throw new m2v.RUNTIME_ERROR('BadArguments', 'The MEI duration "' + mei_dur + '" is not supported.');
      },

      processAttsDuration : function(mei_note, noDots) {
        var me = this, dur, dur_attr;

        dur_attr = $(mei_note).attr('dur');
        if (dur_attr === undefined) {
          alert('Could not get duration from:\n' + JSON.stringify(mei_note, null, '\t'));
        }
        dur = me.translateDuration(dur_attr);
        if (!noDots && $(mei_note).attr('dots') === '1')
          dur += 'd';
        return dur;
        // return me.translateDuration($(mei_note).attr('dur')) +
        // (allow_dotted
        // === true && $(mei_note).attr('dots') === '1') ? 'd' : '';
        // return me.translateDuration($(mei_note).attr('dur'));
      },

      setStemDir : function(element, optionsObj) {
        var me = this, specified_dir;
        specified_dir = {
        down : VF.StaveNote.STEM_DOWN,
        up : VF.StaveNote.STEM_UP
        }[$(element).attr('stem.dir')];
        if (specified_dir) {
          optionsObj.stem_direction = specified_dir;
        } else {
          optionsObj.auto_stem = true;
        }
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
              if (staff)
                max_start_x = Math.max(max_start_x, staff.getNoteStartX());
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

      // NB checks only once for the first defined staff; this has to be
      // changed
      // when the number of staffs changes in the course of a piece
      getFirstDefinedStaff : function(staffsInMeasure) {
        var i = staffsInMeasure.length;
        while (i--) {
          if (staffsInMeasure[i])
            return i;
        }
        throw new m2v.RUNTIME_ERROR('ERROR', 'getFirstDefinedStaff(): no staff found in the current measure.');
      },

      drawVexVoices : function(allStaffVoices, ctx) {
        var me = this, i, j, start_x, staffsInMeasure, firstDefined;
        for ( i = 0, j = allStaffVoices.length; i < j; i += 1) {
          staffsInMeasure = allStaffVoices[i].measureStaffs;
          if (!firstDefined)
            firstDefined = me.getFirstDefinedStaff(staffsInMeasure);
          allStaffVoices[i].staveVoices.format(staffsInMeasure[firstDefined].getNoteEndX() - staffsInMeasure[firstDefined].getNoteStartX() - me.cfg.measurePaddingRight);
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
          if (obj.align)
            ctx.textAlign = obj.align;
          ctx.fillText(obj.text, x, y);
        });
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
