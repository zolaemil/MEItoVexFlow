/*
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
*/

var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @class MEI2VF.Converter
     * Converts an MEI XML document / document fragment to VexFlow objects and
     * optionally renders it using Raphael or HTML5 Canvas.
     *
     * Usage:
     *
     * - Either pass a config object to the constructor function or (if no config
     * object has been passed) call {@link #initConfig} after construction.
     * - Call {@link #process} to process an MEI XML document
     * - Call {@link #draw} to draw the processed VexFlow objects to a canvas
     *
     * @constructor
     * @param {Object} [config]
     * @chainable
     * @return {MEI2VF.Converter} this
     */
    m2v.Converter = function(config) {
      if (config)
        this.initConfig(config);
      return this;
    };

    m2v.Converter.prototype = {

      // TODO calculate now, that should not be too expensive
      // currently fixed
      HALF_LINE_DISTANCE : 5, // VF.Staff.spacing_between_lines_px / 2;

      BOTTOM : VF.Annotation.VerticalJustify.BOTTOM,

      defaults : {
        /**
         * @cfg {Number} page_width The width of the page
         */
        page_width : 800,
        /**
         * @cfg {Number} page_margin_top The top page margin
         */
        page_margin_top : 60,
        /**
         * @cfg {Number} page_margin_left The left page margin
         */
        page_margin_left : 20,
        /**
         * @cfg {Number} page_margin_right The right page margin
         */
        page_margin_right : 20,
        /**
         * @cfg {Number} systemSpacing The spacing between two staff
         * systems
         */
        systemSpacing : 90,
        /**
         * @cfg {Number} staveSpacing The default spacing between two staffs
         * within a system; overridden by the spacing attribute of a staffDef
         * element in the MEI code
         */
        staveSpacing : 60,
        /**
         * @cfg {Boolean} autoStaveConnectorLine Specifies if a stave connector
         * line is drawn on the left of systems by default; if set to true, the
         * auto line will not appear when staffDef/@symbol="none" is set for the
         * outermost staffDef element
         */
        autoStaveConnectorLine : true,
        /**
         * @cfg {String} labelMode Specifies the way voice labels are added
         * to staves. Values:
         *
         * - 'full': renders full labels in the first system, abbreviated labels
         * in all following systems
         * - 'abbr': only render abbreviated labels
         * - null or undefined: renders no labels
         */
        labelMode : null, // 'full',
        /**
         * @cfg {Number} maxHyphenDistance The maximum distance (in pixels)
         * between two hyphens in the lyrics lines
         */
        maxHyphenDistance : 75,
        //sectionsOnNewLine : false, // TODO: add feature

        // TODO check compatibility with RAPHAEL!
        /**
         * @cfg {Object} lyricsFont The font used for rendering lyrics (and
         * hyphens)
         *
         * NB the weight properties can be used to specify style, weight
         * or both (space separated); some of the objects are passed directly
         * to vexFlow (which requires the name 'weight'), so the name is
         * 'weight'
         */
        lyricsFont : {
          family : 'Times',
          size : 15
        },
        /**
         * @cfg {Object} annotFont the font used for annotations (for example,
         * 'pizz.')
         */
        annotFont : {
          family : 'Times',
          size : 15,
          weight : 'Italic'
        },
        /**
         * @cfg {Object} tempoFont The tempo font
         */
        tempoFont : {
          family : "Times",
          size : 17,
          weight : "bold"
        },
        /**
         * @cfg {Object} staff The staff config object passed to each
         * Vex.Flow.Staff
         */
        staff : {
          vertical_bar_width : 20, // 10 // Width around vertical bar end-marker
          top_text_position : 1.5, // 1 // in staff lines
          bottom_text_position : 7.5
        }
      },

      // TODO add setters (and getters?) for single config items / groups
      /**
       * initializes the Converter
       * @param {Object} config A config object (optional)
       * @chainable
       * @return {MEI2VF.Converter} this
       */
      initConfig : function(config) {
        var me = this;
        me.cfg = $.extend(true, {}, me.defaults, config);
        /**
         *  @property {MEI2VF.SystemInfo} systemInfo an instance of
         * MEI2VF.SystemInfo dealing with the staff info derived from the
         * current MEI document
         */
        me.systemInfo = new m2v.SystemInfo();

        // TODO see if the values of this property should better be calculated
        // in the viewer object
        /**
         * @property {Object} printSpace The print space coordinates calculated
         * from the page config. Values:
         *
         * -  `top`
         * -  `left`
         * -  `right`
         * -  `width`
         */
        me.printSpace = {
          // substract four line distances (40px) from page_margin_top in order
          // to compensate VexFlow's default top spacing / allow specifying
          // absolute
          // values
          top : me.cfg.page_margin_top - 40,
          left : me.cfg.page_margin_left,
          right : me.cfg.page_width - me.cfg.page_margin_right,
          width : Math.floor(me.cfg.page_width - me.cfg.page_margin_right - me.cfg.page_margin_left) - 1
        };
        return me;

      },

      // TODO instead of creating new objects each time on reset, call reset functions in the generated objects
      /**
       * Resets all data.
       * Called by {@link #process}.
       * @chainable
       * @return {MEI2VF.Converter} this
       */
      reset : function() {
        var me = this;
        me.systemInfo.init(me.cfg, me.printSpace);
        /**
         * Contains all {@link MEI2VF.System} objects
         */
        me.systems = [];
        /**
         * Contains all Vex.Flow.Stave objects in a 2d array. Addressing scheme:
         * [measure_n][staff_n]
         */
        me.allVexMeasureStaffs = [];
        /**
         * Contains all Vex.Flow.Beam objects. Data is just pushed in
         * and later processed as a whole, so the array index is currently
         * irrelevant.
         });
         */
        me.allBeams = [];
        /**
         * @property {MEI2VF.Ties} ties an instance of MEI2VF.Ties dealing with
         * and storing all ties found in the MEI document
         */
        me.ties = new m2v.Ties();
        /**
         * @property {MEI2VF.Ties} slurs an instance of MEI2VF.Ties dealing with
         * and storing all slurs found in the MEI document
         */
        me.slurs = new m2v.Ties();
        /**
         * @property {MEI2VF.Hairpins} hairpins an instance of MEI2VF.Hairpins
         * dealing with
         * and storing all hairpins found in the MEI document
         */
        me.hairpins = new m2v.Hairpins();
        /**
         * @property {MEI2VF.Hyphenation} hyphenation an instance of
         * MEI2VF.Hyphenation dealing with
         * and storing all lyrics hyphens found in the MEI document
         */
        me.hyphenation = new m2v.Hyphenation(me.cfg.lyricsFont, me.printSpace.right, me.cfg.maxHyphenDistance);
        /**
         * contains all notes in the current MEI document, addressable by their
         * xml:id. Each of the object properties has the xml:id as a name and
         * refers to an object with two properties:
         *
         * - `meiNote`: the XML Element of the note
         * - `vexNote`: the Vex.Flow.StaveNote }
         */
        me.notes_by_id = {};
        /**
         * @property {Number} currentSystem_n the number of the current system
         */
        me.currentSystem_n = 0;
        /**
         * @property {Boolean} pendingSystemBreak indicates if a system break is
         * currently to be processed
         */
        me.pendingSystemBreak = false;
        /**
         * @property {Boolean} pendingSectionBreak indicates if a system break is
         * currently to be processed
         */
        me.pendingSectionBreak = true;
        /**
         * @property {Object} currentVoltaType Contains information about the
         * volta type of the current staff. Properties:
         *
         * -  `start` {String} indicates the number to render to the volta. When
         * falsy, it is assumed that the volta does not start in the current
         * measure
         * -  `end` {Boolean} indicates if there is a volta end in the current
         * measure
         *
         * If null, no volta is rendered
         */
        me.currentVoltaType = null;
        /**
         *
         */
        me.unresolvedTStamp2 = [];
        return me;
      },

      /**
       * Calls {@link #reset} and then processes the specified MEI document or
       * document fragment. The generated objects can
       * be processed further or drawn immediately to a canvas via {@link #draw}.
       * @chainable
       * @param {XMLDocument} xmlDoc the XML document
       * @return {MEI2VF.Converter} this
       */
      process : function(xmlDoc) {
        var me = this;
        me.reset();
        me.systemInfo.processScoreDef($(xmlDoc).find('scoreDef')[0]);
        me.processSections(xmlDoc);
        me.ties.createVexFromLinks(me.notes_by_id);
        me.slurs.createVexFromLinks(me.notes_by_id);
        me.hairpins.createVexFromLinks(me.notes_by_id);
        return me;
      },

      /**
       * Draws the internal data objects to a canvas
       * @chainable
       * @param ctx The canvas context
       * @return {MEI2VF.Converter} this
       */
      draw : function(ctx) {
        var me = this;
        me.drawSystems(ctx);
        me.drawVexBeams(me.allBeams, ctx);
        me.ties.setContext(ctx).draw();
        me.slurs.setContext(ctx).draw();
        me.hairpins.setContext(ctx).draw();
        me.hyphenation.setContext(ctx).draw();
        return me;
      },

      /**
       * assigns an external function for processing pgHead elements. By default,
       * pgHead elements are ignored in MEI2VF.
       * @param {Function} fn the callback function. Parameter: element
       */
      setPgHeadProcessor : function(fn) {
        this.systemInfo.processPgHead = fn;
      },

      /**
       * assigns an external function for processing anchoredText elements. By
       * default, anchoredText elements are ignored in MEI2VF.
       * @param {Function} fn the callback function. Parameter: element
       */
      setAnchoredTextProcessor : function(staffFn, layerFn) {
        if (staffFn) {
          this.processAnchoredStaffText = staffFn;
        };
        if (layerFn) {
          this.processAnchoredLayerText = layerFn;
        }
      },

      /**
       * returns a 2d array of all Vex.Flow.Stave objects, arranged by
       * [measure_n][staff_n]
       * @return {Array}
       */
      getAllVexMeasureStaffs : function() {
        return this.allVexMeasureStaffs;
      },

      /**
       * returns all systems created when processing the MEI document
       * @return {Array} an array of {@link MEI2VF.System} objects
       */
      getSystems : function() {
        return this.systems;
      },

      /**
       * creates in initializes a new {@link MEI2VF.System} and updates the staff
       * modifier infos
       */
      createNewSystem : function() {
        var me = this, system, leftMar, coords;

        m2v.L('Converter.createNewSystem()', '{enter}');

        me.pendingSystemBreak = false;
        me.currentSystem_n += 1;

        leftMar = me.systemInfo.getLeftMar();
        coords = {
          x : me.printSpace.left,
          y : (me.currentSystem_n === 1) ? me.printSpace.top : me.systemInfo.getCurrentLowestY() + me.cfg.systemSpacing,
          w : me.printSpace.width
        };

        system = new m2v.System(leftMar, coords, me.systemInfo.getYs(coords.y), me.getStaffLabels());

        if (me.pendingSectionBreak) {
          me.pendingSectionBreak = false;
          me.systemInfo.forceSectionStartInfos();
        } else {
          me.systemInfo.forceStaveStartInfos();
        }

        me.hyphenation.addLineBreaks(me.systemInfo.getAllStaffInfos(), {
          system : system
        });

        me.systems[me.currentSystem_n] = system;
        return system;
      },

      // TODO: add rule: if an ending is followed by another ending, add
      // space on the right (or choose a VexFlow parameter accordingly),
      // otherwise don't add space
      /**
       *
       */
      processSections : function(xmlDoc) {
        var me = this;
        $(xmlDoc).find('section, ending').each(function() {
          if (this.localName === 'ending') {
            me.processEnding(this);
          } else {
            me.processSection(this);
          }
        });
      },

      /**
       *
       */
      processSection : function(element) {
        var me = this, i, j, sectionChildren = $(element).children();
        for ( i = 0, j = sectionChildren.length; i < j; i += 1) {
          me.processSectionChild(sectionChildren[i]);
        }
      },

      /**
       *
       */
      processEnding : function(element) {
        var me = this, i, j, sectionChildren = $(element).children();
        for ( i = 0, j = sectionChildren.length; i < j; i += 1) {
          me.currentVoltaType = {};
          if (i === 0)
            me.currentVoltaType.start = $(element).attr('n');
          if (i === j - 1)
            me.currentVoltaType.end = true;
          me.processSectionChild(sectionChildren[i]);
        }
        me.currentVoltaType = null;
      },

      /**
       * MEI element <b>section</b> may contain (MEI v2.1.0): MEI.cmn: measure
       * MEI.critapp: app MEI.edittrans: add choice corr damage del gap
       * handShift orig reg restore sic subst supplied unclear MEI.shared:
       * annot ending expansion pb sb scoreDef section staff staffDef
       * MEI.text: div MEI.usersymbols: anchoredText curve line symbol
       *
       * Supported elements: <b>measure</b> <b>scoreDef</b> <b>staffDef</b>
       * <b>sb</b>
       */
      processSectionChild : function(element) {
        var me = this;
        switch (element.localName) {
          case 'measure' :
            me.processMeasure(element);
            break;
          case 'scoreDef' :
            me.systemInfo.processScoreDef(element);
            break;
          case 'staffDef' :
            me.systemInfo.processStaffDef(element);
            break;
          case 'sb' :
            me.setPendingSystemBreak(element);
            break;
          default :
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + element.localName + '> is not supported in <section>');
        }
      },

      /**
       * sets the property {@link #pendingSystemBreak} to `true`. When true, a
       * new system will be initialized when {@link #processMeasure} is called
       * the next time.
       */
      setPendingSystemBreak : function() {
        this.pendingSystemBreak = true;
      },

      // TODO extract function for measure_child (see the staffDef functions)!?
      /**
       * Processes a MEI measure element and calls functions to process a
       * selection of ancestors: .//staff, ./slur, ./tie, ./hairpin, .//tempo
       * @param {Element} element the MEI measure element
       */
      processMeasure : function(element) {
        var me = this, measure_n, atSystemStart, left_barline, right_barline, currentStaveVoices, atSystemTop = true, system;

        if (me.pendingSectionBreak || me.pendingSystemBreak) {
          system = me.createNewSystem();
          atSystemStart = true;
        } else {
          system = me.systems[me.systems.length - 1];
          atSystemStart = false;
        }

        m2v.L('Converter.processMeasure()', '{enter}');

        measure_n = +element.getAttribute('n');
        left_barline = element.getAttribute('left');
        right_barline = element.getAttribute('right');

        currentStaveVoices = new m2v.StaveVoices();

        var staffs = [];

        me.allVexMeasureStaffs[measure_n] = staffs;

        var staffElements = [], dirElements = [], slurElements = [], tieElements = [], hairpinElements = [], tempoElements = [];

        $(element).find('*').each(function() {
          switch (this.localName) {
            case 'staff':
              staffElements.push(this);
              break;
            case 'dir':
              dirElements.push(this);
              break;
            case 'tie':
              tieElements.push(this);
              break;
            case 'slur':
              slurElements.push(this);
              break;
            case 'hairpin':
              hairpinElements.push(this);
              break;
            case 'tempo':
              tempoElements.push(this);
              break;
            default:
              break;
          }
        });

        var directions = me.dirToObj(dirElements);

        $.each(staffElements, function() {
          me.processStaffInMeasure(system, staffs, this, measure_n, left_barline, right_barline, currentStaveVoices, atSystemTop, directions);
          atSystemTop = false;
        });

        var startConnectors = new m2v.Connectors(me.cfg.labelMode);
        if (atSystemStart) {
          startConnectors.createVexFromModels(me.systemInfo.startConnectorInfos, staffs, null, null, me.currentSystem_n);
        }

        var inlineConnectors = new m2v.Connectors();
        inlineConnectors.createVexFromModels(me.systemInfo.inlineConnectorInfos, staffs, left_barline, right_barline);

        me.extract_linkingElements(tieElements, element, 'tie', me.ties);
        me.extract_linkingElements(slurElements, element, 'slur', me.slurs);
        me.extract_linkingElements(hairpinElements, element, 'hairpin', me.hairpins);

        var measure = new m2v.Measure(element, measure_n, staffs, currentStaveVoices, startConnectors, inlineConnectors, tempoElements, me.cfg.tempoFont);

        system.addMeasure(measure);
      },

      /**
       *
       */
      getStaffLabels : function() {
        var me = this, labels, i, infos, labelType;
        labels = {};
        if (!me.cfg.labelMode) {
          return labels;
        }
        labelType = (me.cfg.labelMode === 'full' && me.currentSystem_n === 1) ? 'label' : 'labelAbbr';
        infos = me.systemInfo.getAllStaffInfos();
        i = infos.length;
        while (i--) {
          if (infos[i]) {
            labels[i] = infos[i][labelType];
          }
        }
        return labels;
      },

      /**
       * Processes a single stave in a measure
       *
       * @param {MEI2VF.System} the current system
       * @param {Array} staffs
       * @param {Element} staff_element the MEI staff element
       * @param {Number} measure_n the measure number
       * @param {String} left_barline the left barline
       * @param {String} right_barline the right barline
       * @param {MEI2VF.StaveVoices} currentStaveVoices The current MEI2VF
       * StaveVoices object
       * @param {Boolean} atSystemTop indicates if the current stave is the first
       * stave in its system
       */
      processStaffInMeasure : function(system, staffs, staff_element, measure_n, left_barline, right_barline, currentStaveVoices, atSystemTop, directions) {
        var me = this, staff, staff_n, readEvents, layer_events;

        staff_n = +$(staff_element).attr('n');

        staff = me.createVexStaff(system, staff_n);

        me.addStaffModifiers(staff, staff_n, left_barline, right_barline, atSystemTop);

        staffs[staff_n] = staff;

        $(staff_element).children('anchoredText').each(function() {
          me.processAnchoredStaffText(this, staff);
        });

        readEvents = function() {
          var event = me.processNoteLikeElement(this, staff, staff_n, directions);
          // return event.vexNote;
          return event.vexNote || event;
        };

        $(staff_element).find('layer').each(function() {
          me.resolveUnresolvedTimestamps(this, staff_n, measure_n);
          layer_events = $(this).children().map(readEvents).get();
          currentStaveVoices.addVoice(me.createVexVoice(layer_events, staff_n), staff_n);
        });

      },

      /**
       * Creates a new Vex.Flow.Stave object.
       *
       * @param {MEI2VF.System} system the parent system of the staff
       * @param {Number} staff_n the staff number
       * @return {Vex.Flow.Stave} The initialized stave object
       */
      createVexStaff : function(system, staff_n) {
        var me = this, staff;
        if (!staff_n) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArgument', 'Cannot render staff without attribute "n".');
        }
        staff = new VF.Stave();
        // init the staff with fixed x measurements which will be substituted at
        // a later stage in MEI2VF.System's format() function (the Vex.Flow.Stave
        // objects must be initialized with some x measurements, but the real
        // values depend on values only available after modifiers, voices etc
        // have been added)
        staff.init(0, system.getStaffYs()[staff_n], 1000, me.cfg.staff);
        // temporary; (due to a bug?) in VexFlow, bottom_text_position does
        // not work when it's passed in the config object
        staff.options.bottom_text_position = me.cfg.staff.bottom_text_position;
        return staff;
      },

      /**
       * Adds staff modifiers (bar lines, clef, time signature, key signature,
       * volta) to a Vex.Flow.Staff.
       *
       * @param {Vex.Flow.Stave} The stave object
       * @param {Number} staff_n the staff number
       * @param {String} left_barline the left barline
       * @param {String} right_barline the right barline
       * @param {Boolean} atSystemTop indicates if the current stave is the first
       * stave in its system
       */
      addStaffModifiers : function(staff, staff_n, left_barline, right_barline, atSystemTop) {
        var me = this, currentStaffInfo;

        currentStaffInfo = me.systemInfo.getStaffInfo(staff_n);

        if (currentStaffInfo.showClefCheck()) {
          staff.clefIndex = 2;
          staff.addClef(currentStaffInfo.getClef());
        }
        if (currentStaffInfo.showKeysigCheck()) {
          staff.keySigIndex = staff.clefIndex + 1 || 2;
          staff.addKeySignature(currentStaffInfo.getKeySpec());

        }
        if (currentStaffInfo.showTimesigCheck()) {
          staff.timeSigIndex = staff.keySigIndex + 1 || staff.clefIndex + 1 || 2;
          staff.addTimeSignature(currentStaffInfo.getTimeSig());
        }

        staff.setBegBarType( left_barline ? m2v.tables.barlines[left_barline] : VF.Barline.type.NONE);
        if (right_barline)
          staff.setEndBarType(m2v.tables.barlines[right_barline]);

        if (atSystemTop && me.currentVoltaType) {
          me.addStaffVolta(staff);
        }
      },

      /**
       * Adds a volta to a staff. Currently not working due to the reworking of
       * the measure width calulation (27/4/2014)
       * @experimental
       */
      addStaffVolta : function(staff) {
        var volta = this.currentVoltaType;
        if (volta.start)
          staff.setVoltaType(Vex.Flow.Volta.type.BEGIN, volta.start + '.', 30, 0);
        if (volta.end)
          staff.setVoltaType(Vex.Flow.Volta.type.END, "", 30, 0);
        if (!volta.start && !volta.end)
          staff.setVoltaType(Vex.Flow.Volta.type.MID, "", 30, 0);
      },

      /**
       * Creates a new Vex.Flow.Voice
       * @param {Array} voice_contents The contents of the voice, an array of
       * tickables
       * @param {Number} staff_n The number of the enclosing staff element
       * return {Vex.Flow.Voice}
       */
      createVexVoice : function(voice_contents, staff_n) {
        var me = this, voice, meter;
        if (!$.isArray(voice_contents)) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'me.createVexVoice() voice_contents argument must be an array.');
        }
        meter = me.systemInfo.getStaffInfo(staff_n).meter;
        voice = new VF.Voice({
          num_beats : meter.count,
          beat_value : meter.unit,
          resolution : VF.RESOLUTION
        });
        voice.setStrict(false);
        voice.addTickables(voice_contents);
        return voice;
      },

      /**
       *
       */
      resolveUnresolvedTimestamps : function(layer, staff_n, measure_n) {
        var me = this, refLocationIndex;
        // check if there's an unresolved TStamp2 reference to this location
        // (measure, staff, layer):
        if (!measure_n)
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.me.extract_events:', '<measure> must have @n specified');
        staff_n = staff_n || 1;
        refLocationIndex = measure_n + ':' + staff_n + ':' + ($(layer).attr('n') || '1');
        if (me.unresolvedTStamp2[refLocationIndex]) {
          $(me.unresolvedTStamp2[refLocationIndex]).each(function(i) {
            this.setContext({
              layer : layer,
              meter : me.systemInfo.getStaffInfo(staff_n).meter
            });
            // TODO: remove eventLink from the list
            me.unresolvedTStamp2[refLocationIndex][i] = null;
          });
          // at this point all references should be supplied with context.
          me.unresolvedTStamp2[refLocationIndex] = null;
        }
      },

      /**
       * Extract <b>tie</b>, <b>slur</b> or <b>hairpin</b> elements and create
       * EventLink objects
       */
      extract_linkingElements : function(link_elements, measure, element_name, eventlink_container) {
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
          var staffdef = me.systemInfo.getStaffInfo(stffinf.staff_n);
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

        $.each(link_elements, function() {
          var eventLink, atts, startid, tstamp, endid, tstamp2, measures_ahead;

          eventLink = new m2v.EventLink(null, null);

          atts = m2v.Util.attsToObj(this);

          if (element_name === 'hairpin' && !atts.form) {
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:extract_linkingElements', '@form is mandatory in <hairpin> - make sure the xml is valid.');
          }

          eventLink.setParams(atts);

          // find startid for eventLink. if tstamp is provided in the
          // element,
          // tstamp will be calculated.
          startid = atts.startid;
          if (startid) {
            eventLink.setFirstId(startid);
          } else {
            tstamp = atts.tstamp;
            if (tstamp) {
              startid = local_tstamp2id(tstamp, this, measure);
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
                var staffinfo = link_staffInfo(this);
                var target_measure_n = +$(measure).attr('n') + measures_ahead;
                var refLocationIndex = target_measure_n.toString() + ':' + staffinfo.staff_n + ':' + staffinfo.layer_n;
                if (!me.unresolvedTStamp2[refLocationIndex])
                  me.unresolvedTStamp2[refLocationIndex] = [];
                me.unresolvedTStamp2[refLocationIndex].push(eventLink);
              } else {
                endid = local_tstamp2id(beat_partOf(tstamp2), this, measure);
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

      /**
       * processes a note like element by calling the adequate processing
       * function
       * @param {Element} element the element to process
       * @param {} staff
       * @param {Number} staff_n the number of the staff as given in the MEI
       * document
       * @param {} directions the directions of the current measure
       */
      processNoteLikeElement : function(element, staff, staff_n, directions) {
        var me = this;
        switch (element.localName) {
          case 'rest' :
            return me.processRest(element, staff, staff_n, directions);
          case 'mRest' :
            return me.processmRest(element, staff, staff_n, directions);
          case 'space' :
            return me.processSpace(element, staff, staff_n, directions);
          case 'note' :
            return me.processNote(element, staff, staff_n, directions);
          case 'beam' :
            return me.processBeam(element, staff, staff_n, directions);
          case 'chord' :
            return me.processChord(element, staff, staff_n, directions);
          case 'anchoredText' :
            return me.processAnchoredLayerText(element, staff, staff_n, directions);
          default :
            throw new m2v.RUNTIME_ERROR('BadArguments', 'Rendering of element "' + element.localName + '" is not supported.');
        }
      },

      /**
       *
       */
      processAnchoredStaffText : function() {
        // TODO
        return;
      },

      /**
       *
       */
      processAnchoredLayerText : function() {
        // TODO
        return;
      },

      /**
       *
       */
      processNote : function(element, staff, staff_n, directions) {
        var me = this, dots, mei_accid, mei_ho, pname, oct, xml_id, mei_tie, mei_slur, mei_staff_n, i, atts, note_opts, note;

        atts = m2v.Util.attsToObj(element);

        dots = +atts.dots;
        mei_accid = atts.accid;
        mei_ho = atts.ho;
        pname = atts.pname;
        oct = atts.oct;
        mei_tie = atts.tie;
        mei_slur = atts.slur;
        mei_staff_n = +atts.staff || staff_n;

        xml_id = atts['xml:id'];
        // If xml:id is missing, create it
        if (!xml_id) {
          xml_id = MeiLib.createPseudoUUID();
          $(element).attr('xml:id', xml_id);
        }

        try {

          note_opts = {
            keys : [me.processAttsPitch(element)],
            clef : me.systemInfo.getClef(staff_n),
            duration : me.processAttsDuration(element)
          };

          me.setStemDir(element, note_opts);
          note = new VF.StaveNote(note_opts);

          if (mei_staff_n === staff_n) {
            note.setStave(staff);
          } else {
            var otherStaff = me.allVexMeasureStaffs[me.allVexMeasureStaffs.length - 1][mei_staff_n];
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
            } else {
              throw new m2v.RUNTIME_ERROR('Error', 'Note has staff attribute "' + mei_staff_n + '", but the staff does not exist.');
            }
          }

          me.processSyllables(note, element, staff_n);
          me.addDirections(note, directions, xml_id);

          try {
            for ( i = 0; i < dots; i += 1) {
              note.addDotToAll();
            }
          } catch (e) {
            throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the dots of <note>: ' + m2v.Util.attsToString(element));
          }

          if (mei_accid)
            me.processAttrAccid(mei_accid, note, 0);
          if (mei_ho)
            me.processAttrHo(mei_ho, note);

          $.each($(element).find('artic'), function() {
            me.addArticulation(note, this);
          });
          if (atts.fermata) {
            me.addFermata(note, atts.fermata);
          }

          // FIXME For now, we'll remove any child nodes of <note>
          $.each($(element).children(), function() {
            $(this).remove();
          });

          // Build a note object that keeps the xml:id

          if (!pname)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have pname attribute');
          if (!oct)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have oct attribute');

          if (mei_tie)
            me.processAttrTie(mei_tie, xml_id, pname, oct, me.currentSystem_n);
          if (mei_slur)
            me.processAttrSlur(mei_slur, xml_id, me.currentSystem_n);

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
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <note>: ' + m2v.Util.attsToString(element) + '\nORIGINAL ERROR MESSAGE: ' + e1.toString());
        }
      },

      // TODO add support for features found in me.processNote (annot etc.)
      // extract functions!?
      /**
       *
       */
      processChord : function(element, staff, staff_n) {
        var me = this, i, j, hasDots, $children, keys = [], duration, durations = [], durAtt, xml_id, mei_slur, mei_ho, chord, chord_opts, atts, note_atts;

        $children = $(element).children();

        atts = m2v.Util.attsToObj(element);
        durAtt = atts.dur;
        mei_ho = atts.ho;
        // mei_tie = atts.tie;
        // mei_slur = atts.slur;

        xml_id = atts['xml:id'];
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

          if (hasDots)
            duration += 'd';

          chord_opts = {
            keys : keys,
            clef : me.systemInfo.getClef(staff_n),
            duration : duration
          };

          me.setStemDir(element, chord_opts);
          chord = new VF.StaveNote(chord_opts);
          chord.setStave(staff);

          var allNoteIndices = [];

          $children.each(function(i) {

            note_atts = m2v.Util.attsToObj(this);

            allNoteIndices.push(i);
            var note_mei_tie = note_atts.tie;
            var note_mei_slur = note_atts.slur;
            var note_xml_id = note_atts['xml:id'];
            // If xml:id is missing, create it
            if (!note_xml_id) {
              note_xml_id = MeiLib.createPseudoUUID();
              $(this).attr('xml:id', note_xml_id);
            }

            if (note_mei_tie)
              me.processAttrTie(note_mei_tie, note_xml_id, note_atts.pname, note_atts.oct, me.currentSystem_n);
            if (mei_slur)
              me.processAttrSlur(note_mei_slur, note_xml_id, me.currentSystem_n);

            me.notes_by_id[note_xml_id] = {
              meiNote : element,
              vexNote : chord,
              index : [i]
            };

            if (note_atts.accid) {
              me.processAttrAccid(note_atts.accid, chord, i);
            }
            if (note_atts.fermata) {
              me.addFermata(chord, note_atts.fermata, i);
            }
          });

          if (hasDots) {
            chord.addDotToAll();
          }
          if (mei_ho) {
            me.processAttrHo(mei_ho, chord);
          }
          if (atts.fermata) {
            me.addFermata(chord, atts.fermata);
          }

          // TODO add support for chord/@tie and chord/@slur

          me.notes_by_id[xml_id] = {
            meiNote : element,
            vexNote : chord,
            index : allNoteIndices
          };

          return {
            vexNote : chord,
            id : xml_id
          };
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <chord>:' + e.toString());
          // 'A problem occurred processing the <chord>: ' +
          // JSON.stringify($.each($(element).children(), function(i,
          // element) {
          // element.attrs();
          // }).get()) + '. \"' + x.toString() + '"');
        }
      },

      /**
       *
       */
      processRest : function(element, staff, unused_staff_n, directions) {
        var me = this, dur, rest, xml_id, atts;
        try {
          atts = m2v.Util.attsToObj(element);

          dur = me.processAttsDuration(element, true);
          // assign whole rests to the fourth line, all others to the
          // middle line:
          rest = new VF.StaveNote({
            keys : [(dur === 'w') ? 'd/5' : 'b/4'],
            duration : dur + 'r'
          });

          xml_id = atts['xml:id'];

          // If xml:id is missing, create it
          if (!xml_id) {
            xml_id = MeiLib.createPseudoUUID();
            $(element).attr('xml:id', xml_id);
          }

          me.addDirections(rest, directions, xml_id);

          if (atts.ho) {
            me.processAttrHo(atts.ho, rest);
          }
          rest.setStave(staff);
          if (atts.dots === '1') {
            rest.addDotToAll();
          }
          if (atts.fermata) {
            me.addFermata(rest, atts.fermata);
          }
          return {
            vexNote : rest,
            id : xml_id
          };
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <rest>: ' + m2v.Util.attsToString(element));
        }
      },

      /**
       *
       */
      processmRest : function(element, staff) {
        var me = this, mRest, atts;

        try {
          atts = m2v.Util.attsToObj(element);

          mRest = new VF.StaveNote({
            keys : ['d/5'],
            duration : 'wr'
          });

          // mRest.ignore_ticks = true;
          // mRest.addToModifierContext = function() {
          // return this;
          // };
          // console.log(mRest);
          // me.processAttrHo(10, mRest);

          if (atts.ho) {
            me.processAttrHo(atts.ho, mRest);
          }
          if (atts.fermata) {
            me.addFermata(mRest, atts.fermata);
          }
          mRest.setStave(staff);
          return {
            vexNote : mRest
            // ,
            // id : xml_id
          };
        } catch (x) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <mRest>: ' + m2v.Util.attsToString(element));
        }
      },

      /**
       *
       */
      processSpace : function(element, staff) {
        var me = this, space;
        try {
          space = new VF.GhostNote({
            duration : me.processAttsDuration(element, true) + 'r'
          });
          space.setStave(staff);
          return {
            vexNote : space
            // ,
            // id : xml_id
          };
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <space>: ' + m2v.Util.attsToString(element));
        }
      },

      /**
       *
       */
      processBeam : function(element, staff, staff_n, directions) {
        var me = this, elements;
        var process = function() {
          // make sure to get vexNote out of wrapped note objects
          var proc_element = me.processNoteLikeElement(this, staff, staff_n, directions);
          return proc_element.vexNote || proc_element;
        };
        elements = $(element).children().map(process).get();
        me.allBeams.push(new VF.Beam(elements));
        return elements;
      },

      /**
       *
       */
      processAttrAccid : function(mei_accid, vexObject, i) {
        var val = m2v.tables.accidentals[mei_accid];
        if (!val) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadAttributeValue', 'Invalid attribute value: ' + mei_accid);
        }
        vexObject.addAccidental(i, new VF.Accidental(val));
      },

      /**
       *
       */
      processAttrHo : function(mei_ho, vexObject) {
        var me = this;
        vexObject.setExtraLeftPx(+mei_ho * me.HALF_LINE_DISTANCE);
      },

      /**
       *
       */
      processAttrTie : function(mei_tie, xml_id, pname, oct, system) {
        var me = this, i, j;
        // if (!mei_tie) {
        // mei_tie = "";
        // }
        for ( i = 0, j = mei_tie.length; i < j; ++i) {
          if (mei_tie[i] === 'i') {
            me.ties.start_tieslur(xml_id, {
              pname : pname,
              oct : oct,
              system : system
            });
          } else if (mei_tie[i] === 't') {
            me.ties.terminate_tie(xml_id, {
              pname : pname,
              oct : oct,
              system : system
            });
          }
        }
      },

      /**
       *
       */
      processAttrSlur : function(mei_slur, xml_id, system) {
        var me = this, tokens;
        if (mei_slur) {
          // create a list of { letter, num }
          tokens = me.parse_slur_attribute(mei_slur);
          $.each(tokens, function() {
            if (this.letter === 'i') {
              me.slurs.start_tieslur(xml_id, {
                nesting_level : this.nesting_level,
                system : system
              });
            } else if (this.letter === 't') {
              me.slurs.terminate_slur(xml_id, {
                nesting_level : this.nesting_level,
                system : system
              });
            }
          });
        }
      },

      /**
       *
       */
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
       * converts the pitch of an MEI <b>note</b> element to a VexFlow pitch
       *
       * @param {Element} mei_note
       * @return {String} the VexFlow pitch
       */
      processAttsPitch : function(mei_note) {
        var pname, oct;
        pname = $(mei_note).attr('pname');
        oct = $(mei_note).attr('oct');
        if (!pname || !oct) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'pname and oct attributes must be specified for <note>');
        }
        return pname + '/' + oct;
      },

      // called from <measure>
      /**
       *
       */
      dirToObj : function(elements) {
        var me = this, directions = [];
        $.each(elements, function() {
          directions.push({
            text : $(this).text().trim(),
            startid : me.getMandatoryAttr(this, 'startid'),
            place : me.getMandatoryAttr(this, 'place')
          });
        });
        return directions;
      },

      /**
       *
       */
      addDirections : function(note, directions, xml_id) {
        var me = this, thisDir, i = directions.length;
        while (i--) {
          thisDir = directions[i];
          if (thisDir.startid === xml_id) {
            note.addAnnotation(0, thisDir.place === 'below' ? me.createAnnot(thisDir.text, me.cfg.annotFont).setVerticalJustification(me.BOTTOM) : me.createAnnot(thisDir.text, me.cfg.annotFont));
          }
        }
      },

      /**
       *
       */
      addArticulation : function(note, ar) {
        var vexArtic = new VF.Articulation(m2v.tables.articulations[ar.getAttribute('artic')]);
        var place = ar.getAttribute('place');
        if (place) {
          vexArtic.setPosition(m2v.tables.positions[place]);
        }
        note.addArticulation(0, vexArtic);
      },

      /**
       * adds a fermata to a note-like object
       * @param {Vex.Flow.StaveNote} note the note the fermata will be attached
       * to
       * @param {String} place The place of the fermata (values: 'above' or
       * 'below')
       * @param {Number} index The index of the note in a chord (optional)
       */
      addFermata : function(note, place, index) {
        var vexArtic = new VF.Articulation(m2v.tables.fermata[place]);
        vexArtic.setPosition(m2v.tables.positions[place]);
        note.addArticulation(index || 0, vexArtic);
      },

      /**
       *
       */
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
          // there are no actual mei_syl elements. This seems to improve
          // spacing in VexFlow but should be changed eventually
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
      /**
       *
       */
      processSyllable : function(mei_note) {
        var syl = $(mei_note).find('syl')[0];
        if (syl) {
          return {
            text : $(syl).text(),
            wordpos : $(syl).attr('wordpos')
          };
        }
      },

      // Support for annotations (lyrics, directions, etc.)
      /**
       *
       */
      createAnnot : function(text, annotFont) {
        return (new VF.Annotation(text)).setFont(annotFont.family, annotFont.size, annotFont.weight);
      },

      /**
       *
       */
      getMandatoryAttr : function(element, attribute) {
        var result = $(element).attr(attribute);
        if (!result) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'Attribute ' + attribute + ' is mandatory.');
        }
        return result;
      },

      /**
       *
       */
      translateDuration : function(mei_dur) {
        var result = m2v.tables.durations[mei_dur + ''];
        if (result)
          return result;
        throw new m2v.RUNTIME_ERROR('BadArguments', 'The MEI duration "' + mei_dur + '" is not supported.');
      },

      // TODO: dots should work with the lastest VexFlow, so try to remove the noDots
      // parameter there. Can the noDots condition be removed entirely or will there
      // be dots rendered with space elements?
      /**
       *
       */
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
      },

      /**
       *
       */
      setStemDir : function(element, optionsObj) {
        var specified_dir = {
        down : VF.StaveNote.STEM_DOWN,
        up : VF.StaveNote.STEM_UP
        }[$(element).attr('stem.dir')];
        if (specified_dir) {
          optionsObj.stem_direction = specified_dir;
        } else {
          optionsObj.auto_stem = true;
        }
      },

      drawSystems : function(ctx) {
        var me = this, i = me.systems.length;
        while (i--) {
          if (me.systems[i]) {
            me.systems[i].format(ctx).draw(ctx);
          }
        }
      },

      /**
       *
       */
      drawVexBeams : function(beams, ctx) {
        $.each(beams, function() {
          this.setContext(ctx).draw();
        });
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
