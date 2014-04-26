var MEI2TEXT = ( function(m2t, VF, $, undefined) {

    //         me.drawAnchoredTexts(me.allAnchoredTexts, me.HALF_LINE_DISTANCE, ctx);

    /**
     * @class MEI2TEXT.AnchoredTexts
     * @private
     *
     * @constructor
     */
    m2t.AnchoredTexts = function() {
      var me = this;

      /**
       * Contains the information of all anchored texts from the MEI document
       * in objects with the properties:
       *
       * -  `text`: The text content of the anchored text
       * -  `container`: the container object, e.g. a VexFlow staff. Provides
       * the basis for the calculation of
       * absolute coordinates from the relative MEI attributes vo / ho.
       * Irrelevant
       * when both x and y are specified
       * -  `x`: the x coordinate
       * -  `y`: the y coordinate
       * -  `ho`: the horizontal offset
       * -  `vo`: the vertical offset
       */
      me.allAnchoredTexts = [];
    };

    m2t.AnchoredTexts.prototype = {

      // currently fixed
      HALF_LINE_DISTANCE : 5, // VF.Staff.spacing_between_lines_px / 2;

      // TODO: better attach to staff instead of writing an own array!?!?
      // TODO allow anchored text relative to other elements than <staff>
      /**
       *
       */
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

      /**
       *
       */
      processAnchoredLayerText : function() {
        // TODO
        return;
      },

      setContext : function(ctx) {
        this.ctx = ctx;
        return this;
      },

      // TODO make anchored texts staff modifiers (?)
      /**
       *
       */
      draw : function() {

        var me = this, x, y, staff, ctx = me.ctx;
        $.each(me.allAnchoredTexts, function() {
          staff = this.container;
          y = +this.y || staff.getYForLine(3) - 4 + (+this.vo * me.HALF_LINE_DISTANCE || 0);
          x = +this.x || staff.glyph_start_x + (+this.ho * me.HALF_LINE_DISTANCE || 0);
          ctx.font = this.font || '20px Times';
          if (this.align)
            ctx.textAlign = this.align;
          ctx.fillText(this.text, x, y);
        });
      }
    };

    return m2t;

  }(MEI2TEXT || {}, Vex.Flow, jQuery));
