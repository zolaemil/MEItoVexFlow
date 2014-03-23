var MEI2VF = ( function(m2v, VF, $, undefined) {

    m2v.render_notation = function(data, target, width, height, backend, options) {

      var opts = $.extend(true, {

        page_scale : 1,
        page_height : height,
        page_width : width,
        data : data,
        target : target,
        backend : backend,
        defaultSystemSpacing : 50,
        defaultStaveHeight : 50, // without spacing
        defaultStaveSpacing : 50
        // ,
        // staff : {
        // space_above_staff_ln : 4,
        // space_below_staff_ln : 4
        // }
      }, options);

      var r = new m2v.Renderer(opts);

    };

    m2v.getRenderedMeasures = function() {
      return m2v.rendered_measures;
    };

    m2v.util = {
      listAttrs : function(element) {
        var result = '', i, j, attrs, attr;
        attrs = element.attributes;
        for ( i = 0, j = attrs.length; i < j; i += 1) {
          attr = attrs.item(i);
          result += ' ' + attr.nodeName + '="' + attr.nodeValue + '"';
        }
        return result;
      },

      testNS : function() {
        var i, e, start, end, time, scoredef, xmlDoc = this.xmlDoc;
        // scoredef = $(xmlDoc).find('scoreDef')[0];
        // TODO check performance when used on all elements:
        e = 'note';
        start = new Date().getTime();
        for ( i = 0; i < 500; i += 1) {
          scoredef = xmlDoc.getElementsByTagName('http://www.music-encoding.org/ns/mei', e);
          // scoredef = xmlDoc.getElementsByTagNameNS('*', e);

          // scoredef = $(xmlDoc).find(e);

          a = scoredef;
        }
        end = new Date().getTime();
        time = end - start;
        console.log('Execution time: ' + time);
      },

      removeNS : function(str) {
        return str.replace(/(<[\/]?)[\w]+:/g, '$1');
      },

      createXMLDoc : function(str) {
        var xmlDoc, parser;
        str = this.removeNS(str);
        if (window.DOMParser) {
          parser = new DOMParser();
          xmlDoc = parser.parseFromString(txt, "text/xml");
        } else// Internet Explorer
        {
          xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
          xmlDoc.async = false;
          xmlDoc.loadXML(txt);
        }
        return XmlDoc;
      },

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
                  // console.log(measure[k]);
                  m = measure[k];
                  // measure[k].getBoundingBox().draw(ctx);
                  // inner = new
                  // Vex.Flow.BoundingBox(m.glyph_start_x,
                  // m.y,
                  // m.glyph_end_x - m.glyph_start_x, m.y +
                  // m.height);

                  // ############### NOTEAREA ##############
                  y = (y === m.getYForLine(0)) ? m.getYForLine(0) + 10 : m.getYForLine(0);
                  coords = {
                    x : m.getNoteStartX(),
                    y : y - 20,
                    w : m.getNoteEndX() - m.getNoteStartX(),
                    h : 70
                  };
                  // console.log('NoteStartEnd. ' + 'x:' +
                  // coords.x +
                  // ',
                  // y:'
                  // + coords.y + ', w:' + coords.w + ', h:'
                  // + coords.h);
                  me.drawRectangle(coords, '120, 80, 200', ctx, options.frame);

                  // ############### MODIFIERS ##############
                  coords = {
                    x : m.x,
                    y : m.getYForLine(0) - 30,
                    w : m.getModifierXShift(),
                    h : m.getYForLine(4) - m.getYForLine(0) + 60
                  };
                  // console.log('ModifierXShift. ' + 'x:' +
                  // coords.x
                  // + ', y:' + coords.y + ', w:' + coords.w
                  // + ', h:' + coords.h);
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

    // return {
    // render_notation : m2v.render_notation,
    // getRenderedMeasures : m2v.getRenderedMeasures,
    // util : util
    // };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
