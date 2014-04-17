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
       * returns the next sibling element to an element
       * @param {Element} element the start element
       * @return {Element} the element found or undefined if there is none
       */
      getNextElement : function(element) {
        var n = element;
        do
          n = n.nextSibling;
        while (n && n.nodeType != 1);
        return n;
      },
      
      /**
       * gets the next sibling node or -- if it is undefined -- the first
       * element in the parent's following sibling
       * @param {Element} element the start element
       * @return {Element} the element found or undefined if there is none
       */
      getNext : function(element) {
        var me = this, parentElement, next, getNextElement = m2v.Util.getNextElement;
        next = getNextElement(element);
        if (next)
          return next;
        parentElement = element.parentNode;
        next = getNextElement(parentElement);
        if (next)
          return next.firstChild;
      },

      /**
       *
       */
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
