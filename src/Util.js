var MEI2VF = ( function(m2v, VF, $, undefined) {

    m2v.DO_LOG = false;

    m2v.setLogging = function(value) {
      m2v.DO_LOG = value;
    };

    m2v.L = function() {
      if (m2v.DO_LOG)
        Vex.L("MEItoVexFlow", arguments);
    };

    /**
     * @constructor
     */
    m2v.RUNTIME_ERROR = function(error_code, message) {
      this.error_code = error_code;
      this.message = message;
    };

    m2v.RUNTIME_ERROR.prototype.toString = function() {
      return "MEI2VF.RUNTIME_ERROR: " + this.error_code + ': ' + this.message;
    };

    m2v.attsToObj = function(element) {
      var i, obj;
      if (element.attributes) {
        obj = {};
        i = element.attributes.length;
        while (i--) {
          obj[element.attributes[i].nodeName] = element.attributes[i].nodeValue;
        }
      }
      return obj;
    };

    m2v.listAttrs = function(element) {
      var result = '', i, j, attrs, attr;
      attrs = element.attributes;
      for ( i = 0, j = attrs.length; i < j; i += 1) {
        attr = attrs.item(i);
        result += ' ' + attr.nodeName + '="' + attr.nodeValue + '"';
      }
      return result;
    };

    m2v.util = {

      drawBoundingBoxes : function(ctx, options) {
        var me = this, i, j, k, l, measure, m, inner, coords, y;
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
          $.each(options.voices.data, function(i, voices) {
            if (voices && voices.staveVoices && voices.staveVoices.all_voices) {
              $.each(voices.staveVoices.all_voices, function(i, voice) {
                if (voice && voice.voice) {
                  if (voice.voice.boundingBox && options.voices.drawFrame) {
                    voice.voice.getBoundingBox().draw(ctx);
                  }
                  if (options.voices.drawTickables) {
                    $.each(voice.voice.tickables, function(i, tickable) {
                      tickable.getBoundingBox().draw(ctx);
                    });
                  }
                }
              });
            }
          });
        }
        ctx.restore();
      },

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
