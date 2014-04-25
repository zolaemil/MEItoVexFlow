var MEI2VF = ( function(m2v, VF, $, undefined) {

    // TODO width calculation: extra width for shifted repeat bar begins!
    // TODO width calculation: take end modifiers into account, too (not urgent; currently, end
    // modifiers are not supported in mei2vf)

    /**
     * A single instance of a staff system, containing and processing information
     * about the staff and the measures contained
     * @class MEI2VF.System
     * @private
     *
     * @constructor
     */
    m2v.System = function(startMeasureElement, leftMar, coords, staffYs, labels, labelMode) {
      var me = this;
      me.leftMar = leftMar;
      me.coords = coords;
      me.staffYs = staffYs;
      me.labels = labels;
      me.measures = [];
      me.currentMeasureInSystem = 0;
    };

    m2v.System.prototype = {

      LABEL_PADDING : 20,

      getStaffYs : function() {
        return this.staffYs;
      },

      getX : function() {
        return this.x;
      },

      addMeasure : function(measure) {
        this.measures.push(measure);
      },

      getMeasures : function() {
        return this.measures;
      },

      calculateInitialIndent : function(ctx) {
        var me = this, label, max = 0, w, connectors, i, text;
        ctx.setFont('Times', 16);
        for (label in me.labels) {
          text = me.labels[label];
          if ( typeof text === 'string') {
            w = ctx.measureText(me.labels[label]).width;
            if (max < w) {
              max = w;
            }
          }
        };
        connectors = me.getMeasures()[0].startConnectors.getAll();
        i = connectors.length;
        while (i--) {
          text = connectors[i].text;
          if ( typeof text === 'string') {
            w = ctx.measureText(me.labels[label]).width;
            if (max < w) {
              max = w;
            }
          }
        }
        me.leftMar = (max === 0) ? 0 : max + me.LABEL_PADDING;
      },

      calculateMeasureOffsets : function() {
        var measures = this.measures, i = measures.length, w;
        while (i--) {
          measures[i].calculateMeasureOffsets();
          measures[i].calculateRepeatPadding();
          w = measures[i].voices.preFormat();
          measures[i].minVoicesW = w;
        }
      },

      /**
       * calculates the width of all measures in a stave which don't have a
       * specified width in the MEI code and writes them to the measure object
       */
      calculateMissingMeasureWidths : function() {
        var me = this, i, j, totalSpecifiedMeasureWidth = 0, avaliableSingleWidth, nonSpecified_n = 0, noteOffsets = 0, totalVoicesW = 0;
        for ( i = 0, j = me.measures.length; i < j; i += 1) {
          if (me.measures[i].meiW === null) {
            nonSpecified_n += 1;
            totalSpecifiedMeasureWidth += me.measures[i].noteOffsetX + me.measures[i].minVoicesW + me.measures[i].repeatPadding;
          } else {
            totalSpecifiedMeasureWidth += me.measures[i].meiW;
          }
        }
        avaliableSingleWidth = Math.floor((me.coords.w - me.leftMar - totalSpecifiedMeasureWidth) / nonSpecified_n);
        for ( i = 0, j = me.measures.length; i < j; i += 1) {
          if (me.measures[i].meiW === null) {
            me.measures[i].w = avaliableSingleWidth + me.measures[i].noteOffsetX + me.measures[i].minVoicesW + me.measures[i].repeatPadding;
          } else {
            me.measures[i].w = me.measures[i].meiW;
          }
        }
      },

      format : function(ctx) {
        var me = this, i, j, l, measures, offsetX, width, staffs, staff, label;
        if ( typeof me.leftMar !== 'number') {
          me.calculateInitialIndent(ctx);
        }
        me.calculateMeasureOffsets();
        me.calculateMissingMeasureWidths();
        offsetX = me.coords.x + me.leftMar;
        measures = me.getMeasures();
        for ( j = 0, l = measures.length; j < l; j += 1) {
          if (measures[j]) {
            width = measures[j].w;
            staffs = measures[j].getStaffs();
            i = staffs.length;
            while (i--) {
              if (staffs[i]) {
                staff = staffs[i];
                if (j === 0) {
                  label = me.labels[i];
                  if ( typeof label === 'string') {
                    staff.setText(label, VF.Modifier.Position.LEFT, {
                      shift_y : -3
                    });
                  }
                }
                staff.x += offsetX;
                staff.glyph_start_x += offsetX;
                staff.start_x = staff.x + measures[j].noteOffsetX;
                staff.bounds.x += offsetX;
                staff.setWidth(width);
                staff.modifiers[0].x += offsetX;
                // staff.end_x += offsetX + offsetW;
                // staff.glyph_end_x += offsetX + offsetW;
              }
            }
            offsetX += width;
          }
          measures[j].addTempoToStaves();
        }
        return me;
      },

      /**
       *
       */
      draw : function(ctx) {
        var me = this, i = me.measures.length;
        while (i--) {
          if (me.measures[i]) {
            me.measures[i].draw(ctx);
          }
        }
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
