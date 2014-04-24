var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @class MEI2VF.Measure
     * @private
     *
     * @constructor
     */
    m2v.Measure = function(element, staffs, voices, startConnectors, inlineConnectors) {
      var me = this;

      me.element = element;

      me.x = undefined;
      me.y = undefined;
      me.w = undefined;

      me.meiW = me.getWidthAttr(element);

      me.staffs = staffs;
      /**
       * @property {MEI2VF.StaveVoices} voices The voices of all staffs in the
       * current measure
       */
      me.voices = voices;
      /**
       * @property {MEI2VF.Connectors} startConnectors an instance of
       * MEI2VF.Connectors handling all start connectors
       */
      me.startConnectors = startConnectors;
      /**
       * @property {MEI2VF.Connectors} startConnectors an instance of
       * MEI2VF.Connectors handling all start connectors
       */
      me.inlineConnectors = inlineConnectors;
    };

    m2v.Measure.prototype = {

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

      // TODO align start modifiers (changes in vexflow necessary??)
      draw : function(ctx) {
        var me = this, i, max_start_x, startModifiers, staffs, staff;

        max_start_x = 0;
        // get maximum start_x of all staffs in measure
        staffs = me.staffs;
        // (temporary and incomplete) calculate the maximum note start x of
        // all staves. Remove when there are methods in vexFlow to align start
        // modifiers and voice start x between systems
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff)
            max_start_x = Math.max(max_start_x, staff.getNoteStartX());
        }
        // set note start x and draw staffs
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff) {
            staff.setNoteStartX(max_start_x);
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
