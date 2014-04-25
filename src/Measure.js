var MEI2VF = ( function(m2v, VF, $, undefined) {

    // TODO create tempoW, clefW, timeSigW

    /**
     * @class MEI2VF.Measure
     * @private
     *
     * @constructor
     */
    m2v.Measure = function(element, staffs, voices, startConnectors, inlineConnectors, tempoElements, tempoFont) {
      var me = this;

      me.element = element;

      me.x = undefined;
      me.y = undefined;
      me.w = undefined;

      me.tempoW = undefined;
      me.clefW = undefined;
      me.timeSigW = undefined;

      me.meiW = me.getWidthAttr(element);

      me.staffs = staffs;
      /**
       * @property {MEI2VF.StaveVoices} voices The voices of all staffs in the
       * current measure
       */
      me.voices = voices;
      /**
       * @property {MEI2VF.Connectors} startConnectors an instance of
       * MEI2VF.Connectors handling all left connectors (only the first measure of a staff has data)
       */
      me.startConnectors = startConnectors;
      /**
       * @property {MEI2VF.Connectors} startConnectors an instance of
       * MEI2VF.Connectors handling all right connectors
       */
      me.inlineConnectors = inlineConnectors;

      me.tempoElements = tempoElements;
      me.tempoFont = tempoFont;
      
      me.noteOffsetX = 0;
    };

    m2v.Measure.prototype = {

      // currently fixed
      HALF_LINE_DISTANCE : 5, // VF.Staff.spacing_between_lines_px / 2;

      getWidthAttr : function(element) {
        return +element.getAttribute('width') || null;
      },

      getStaffs : function() {
        return this.staffs;
      },

      getVoices : function() {
        return this.voices;
      },

      /**
       *
       */
      getFirstDefinedStaff : function(staffs) {
        var i = staffs.length;
        while (i--) {
          if (staffs[i])
            return i;
        }
        throw new m2v.RUNTIME_ERROR('ERROR', 'getFirstDefinedStaff(): no staff found in the current measure.');
      },

      // TODO handle timestamps! (is it necessary to handle tempo element
      // as annotations?)
      // TODO make magic numbers constants
      /**
       * Writes the data of the given tempo
       * elements to the corresponding Vex.Flow.Stave object
       * @param {Array} elements the tempo elements
       * @param {Array} measure An array of the Vex.Flow.Stave objects in the
       * current measure
       */
      addTempoToStaves : function() {
        var me = this, staff_n, staff, text, offsetX, vexTempo;
        $.each(me.tempoElements, function(i, tempoElement) {
          atts = m2v.Util.attsToObj(tempoElement);
          ho = atts.ho;
          vo = atts.vo;
          vexStaff = me.staffs[atts.staff];
          text = $(tempoElement).text();
          vexTempo = new Vex.Flow.StaveTempo({
            name : text,
            duration : atts['mm.unit'],
            dots : +atts['mm.dots'],
            bpm : +atts.mm
          }, vexStaff.x, 5);
          if (vo)
            vexTempo.setShiftY(+vo * me.HALF_LINE_DISTANCE);
          offsetX = (vexStaff.getModifierXShift() > 0) ? -14 : 14;
          if ( typeof vexStaff.timeSigIndex === 'number')
            offsetX -= 24;
          if (ho)
            offsetX += +ho * me.HALF_LINE_DISTANCE;
          vexTempo.setShiftX(offsetX);
          vexTempo.font = me.tempoFont;
          vexStaff.modifiers.push(vexTempo);
        });
      },

      calculateMeasureOffsets: function() {
        var me = this, i, staffs, staff;
        // get maximum start_x of all staffs in measure
        staffs = me.staffs;
        // (temporary and incomplete) calculate the maximum note start x of
        // all staves. Remove when there are methods in vexFlow to align start
        // modifiers and voice start x between systems
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff) {
            me.noteOffsetX = Math.max(me.noteOffsetX, staff.getNoteStartX());
          }
        }
      },


      // format: function(ctx) {
      //
      // },


      // TODO align start modifiers (changes in vexflow necessary??)
      draw : function(ctx) {
        var me = this, i, staffs, staff;
        
        staffs = me.staffs;
                // set note start x and draw staffs
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff) {
            staff.setContext(ctx).draw();
          }
        }
        // draw voices
        me.voices.format(staffs[me.getFirstDefinedStaff(staffs)]);
        me.voices.draw(ctx, staffs);
        // draw connectors
        me.startConnectors.setContext(ctx).draw();
        me.inlineConnectors.setContext(ctx).draw();

      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
