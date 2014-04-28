var MEI2VF = ( function(m2v, VF, $, undefined) {

    // TODO width calculation: take end modifiers into account (do this later: end
    // modifiers are currently not part of mei2vf)

    /**
     * A single instance of a staff system, containing and processing information
     * about the measures contained
     * @class MEI2VF.System
     * @private
     *
     * @constructor
     */
    m2v.System = function(config) {
      this.init(config);
    };

    m2v.System.prototype = {

      LABEL_PADDING : 20,

      init : function(config) {
        var me = this;
        me.leftMar = config.leftMar;
        me.coords = config.coords;
        me.staffYs = config.staffYs;
        me.labels = config.labels;
        /**
         * @property {Array} the measures in the current system
         */
        me.measures = [];
      },

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

      /**
       * Calculates the system indent based on the width of the stave and
       * stave-connector labels
       * @param {Object} ctx the canvas context
       */
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
        }
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

      /**
       * Calculates the minimum width of each measure in the current system
       */
      calculateMeasureMinWidths : function() {
        var measures = this.measures, i = measures.length;
        while (i--) {
          measures[i].calculateMinWidth();
        }
      },

      /**
       * calculates the width of all measures in a stave which don't have a
       * specified width in the MEI code and writes them to their enclosing
       * measure object
       */
      calculateMissingMeasureWidths : function() {
        var me = this, i, j, totalSpecifiedMeasureWidth = 0, avaliableSingleWidth, nonSpecified_n = 0;
        for ( i = 0, j = me.measures.length; i < j; i += 1) {
          if (me.measures[i].meiW === null) {
            nonSpecified_n += 1;
            totalSpecifiedMeasureWidth += me.measures[i].getMinWidth();
          } else {
            totalSpecifiedMeasureWidth += me.measures[i].meiW;
          }
        }
        avaliableSingleWidth = Math.floor((me.coords.w - me.leftMar - totalSpecifiedMeasureWidth) / nonSpecified_n);
        for ( i = 0, j = me.measures.length; i < j; i += 1) {
          if (me.measures[i].meiW === null) {
            me.measures[i].w = avaliableSingleWidth + me.measures[i].getMinWidth();
          } else {
            me.measures[i].w = me.measures[i].meiW;
          }
        }
      },

      /**
       * formats the measures in the current system
       * @param {Object} ctx the canvas context
       * @return {MEI2VF.System} this
       */
      format : function(ctx) {
        var me = this, i, j, measures, offsetX, labels;
        if ( typeof me.leftMar !== 'number') {
          me.calculateInitialIndent(ctx);
        }
        me.calculateMeasureMinWidths();
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
       * draws the current system to a canvas
       * @param {Object} ctx the canvas context
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
