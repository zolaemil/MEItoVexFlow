var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @class MEI2VF.Measure
     * @private
     *
     * @constructor
     */
    m2v.Measure = function(element, staffs, voices, startConnectors, inlineConnectors, tempoElements, tempoFont) {
      var me = this;
      me.element = element;
      me.staffs = staffs;
      /**
       * @property {MEI2VF.StaveVoices} voices The voices of all staffs in the
       * current measure
       */
      me.voices = voices;
      /**
       * @property {MEI2VF.Connectors} startConnectors an instance of
       * MEI2VF.Connectors handling all left connectors (only the first measure
       * in a system has data)
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
      me.meiW = me.getWidthAttr(element);
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

      getX: function() {
        return this.getFirstDefinedStaff().x;
      },

      /**
       *
       */
      getFirstDefinedStaff : function() {
        var me = this, i = me.staffs.length;
        while (i--) {
          if (me.staffs[i])
            return me.staffs[i];
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
        var me = this, offsetX, vexStaff, vexTempo, atts;
        $.each(me.tempoElements, function() {
          atts = m2v.Util.attsToObj(this);
          vexStaff = me.staffs[atts.staff];
          vexTempo = new Vex.Flow.StaveTempo({
            name : $(this).text(),
            duration : atts['mm.unit'],
            dots : +atts['mm.dots'],
            bpm : +atts.mm
          }, vexStaff.x, 5);
          if (atts.vo)
            vexTempo.setShiftY(+atts.vo * me.HALF_LINE_DISTANCE);
          offsetX = (vexStaff.getModifierXShift() > 0) ? -14 : 14;
          if ( typeof vexStaff.timeSigIndex === 'number')
            offsetX -= 24;
          if (atts.ho)
            offsetX += +atts.ho * me.HALF_LINE_DISTANCE;
          vexTempo.setShiftX(offsetX);
          vexTempo.font = me.tempoFont;
          vexStaff.modifiers.push(vexTempo);
        });
      },

      calculateMeasureOffsets : function() {
        var me = this, i, staffs, staff;
        staffs = me.staffs;
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff) {
            me.noteOffsetX = Math.max(me.noteOffsetX, staff.getNoteStartX());
          }
        }
      },

      calculateRepeatPadding : function() {
        var me = this;
        var staff = me.getFirstDefinedStaff();
        me.repeatPadding = (staff.modifiers[0].barline == Vex.Flow.Barline.type.REPEAT_BEGIN && staff.modifiers.length > 2) ? 20 : 0;
      },

      // TODO align start modifiers (changes in vexflow necessary??)
      format : function(offsetX, labels) {
        var me = this, width = me.w, staffs = me.staffs, i = staffs.length;
        while (i--) {
          if (staffs[i]) {
            staff = staffs[i];
            if (labels && typeof labels[i] === 'string') {
              staff.setText(labels[i], VF.Modifier.Position.LEFT, {
                shift_y : -3
              });
            }
            staff.x += offsetX;
            staff.glyph_start_x += offsetX;
            staff.start_x = staff.x + me.noteOffsetX;
            staff.bounds.x += offsetX;
            staff.setWidth(width);
            staff.modifiers[0].x += offsetX;
            // staff.end_x += offsetX + offsetW;
            // staff.glyph_end_x += offsetX + offsetW;
          }
        }
      },

      draw : function(ctx) {
        var me = this, i, staffs, staff;
        staffs = me.staffs;
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff) {
            staff.setContext(ctx).draw();
          }
        }
        me.voices.format(me.getFirstDefinedStaff());
        me.voices.draw(ctx, staffs);
        me.startConnectors.setContext(ctx).draw();
        me.inlineConnectors.setContext(ctx).draw();

      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
