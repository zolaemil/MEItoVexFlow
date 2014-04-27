var MEI2VF = ( function(m2v, VF, $, undefined) {

    // TODO width calculation: take end modifiers into account, too (not urgent; currently, since end
    // modifiers are currently not part of mei2vf)

    /**
     * A single instance of a staff system, containing and processing information
     * about the staff and the measures contained
     * @class MEI2VF.System
     * @private
     *
     * @constructor
     */
    m2v.System = function(leftMar, coords, staffYs, labels) {
      var me = this;
      me.type = 'system';
      
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

      addMeasure : function(measure) {
        this.measures.push(measure);
      },

      getMeasure : function(i) {
        return this.measures[i];
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
        var me = this, i, j, totalSpecifiedMeasureWidth = 0, avaliableSingleWidth, nonSpecified_n = 0;
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
        var me = this, i, j, measures, offsetX, labels;
        if ( typeof me.leftMar !== 'number') {
          me.calculateInitialIndent(ctx);
        }
        me.calculateMeasureOffsets();
        me.calculateMissingMeasureWidths();
        offsetX = me.coords.x + me.leftMar;
        measures = me.getMeasures();
        for ( i = 0, j = measures.length; i < j; i += 1) {
          if (measures[i]) {
              labels = (i === 0) ? me.labels : null;
            measures[i].format(offsetX, labels);
            offsetX += measures[i].w;
          }
          measures[i].addTempoToStaves();
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
