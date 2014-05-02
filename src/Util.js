var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @class MEI2VF.Util
     * @singleton
     * @private
     */
    m2v.Util = {

      /**
       *
       */
      attsToObj : function(element) {
        var i, obj;
        if (element.attributes) {
          obj = {};
          i = element.attributes.length;
          while (i--) {
            obj[element.attributes[i].nodeName] = element.attributes[i].nodeValue;
          }
        }
        return obj;
      },

      /**
       *
       */
      attsToString : function(element) {
        var result = '', i, j, atts, att;
        atts = element.attributes;
        for ( i = 0, j = atts.length; i < j; i += 1) {
          att = atts.item(i);
          result += ' ' + att.nodeName + '="' + att.nodeValue + '"';
        }
        return result;
      },

      /**
       *
       */
      drawBoundingBoxes : function(ctx, options) {
        var me = this, i, j, k, l, measure, m, coords;
        options = options || {};
        ctx.save();
        if (options.staffs && options.staffs.data) {
          for ( i = 0, j = options.staffs.data.length; i < j; i += 1) {
            measure = options.staffs.data[i];
            if (measure) {
              for ( k = 0, l = measure.length; k < l; k += 1) {
                if (measure[k]) {
                  m = measure[k];
                  measure[k].getBoundingBox().draw(ctx);
                  // ############### NOTEAREA ##############
                  coords = {
                    x : m.getNoteStartX(),
                    y : m.getYForLine(0) - 30,
                    w : m.getNoteEndX() - m.getNoteStartX(),
                    h : m.getYForLine(4) - m.getYForLine(0) + 60
                  };
                  me.drawRectangle(coords, '120, 80, 200', ctx, options.frame);
                  // ############### MODIFIERS ##############
                  coords = {
                    x : m.x,
                    y : m.getYForLine(0) - 30,
                    w : m.getModifierXShift(),
                    h : m.getYForLine(4) - m.getYForLine(0) + 60
                  };
                  me.drawRectangle(coords, '100, 100, 0', ctx, options.frame);
                }
              }
            }
          }
        }
        if (options.voices && options.voices.data) {
          $.each(options.voices.data, function() {
            if (this && this.staveVoices && this.staveVoices.all_voices) {
              $.each(this.staveVoices.all_voices, function() {
                if (this && this.voice) {
                  if (this.voice.boundingBox && options.voices.drawFrame) {
                    this.voice.getBoundingBox().draw(ctx);
                  }
                  if (options.voices.drawTickables) {
                    $.each(this.voice.tickables, function() {
                      this.getBoundingBox().draw(ctx);
                    });
                  }
                }
              });
            }
          });
        }
        ctx.restore();
      },

      /**
       *
       */
      drawRectangle : function(coords, color, ctx, frame) {
        if (frame) {
          ctx.strokeStyle = 'rgba(' + color + ', 0.5)';
          ctx.rect(coords.x, coords.y, coords.w, coords.h);
        }
        ctx.fillStyle = 'rgba(' + color + ', 0.1)';
        ctx.fillRect(coords.x, coords.y, coords.w, coords.h);
        ctx.stroke();
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
