var MEI2VF = ( function(m2v, VF, $, undefined) {

    m2v.render_notation = function(xmlDoc, target, width, height, backend, options) {

      if (!xmlDoc) {
        throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingData', 'No XML document passed to Renderer.');
      }

      var xmlDoc = m2v.util.initXmlDoc(xmlDoc);

      var firstScoreDef = $(xmlDoc).find('scoreDef')[0];
      if (!firstScoreDef) {
        throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadMEIFile', 'No <scoreDef> found in config.data.');
      }

      var cfg = $.extend(true, {
        page_scale : 1,
        page_margin_top : 60,
        page_margin_left : 20,
        page_margin_right : 20,
        defaultSystemSpacing : 50,
        defaultStaveHeight : 50,
        defaultStaveSpacing : 50
      }, m2v.util.getMEIPageConfig(firstScoreDef), {
        page_height : height,
        page_width : width,
        xmlDoc : xmlDoc,
        target : target,
        backend : backend
      }, options);

      var canvas = m2v.util.createCanvas(cfg.target, cfg.backend, cfg);

      var ctx = m2v.util.createContext(canvas, cfg.backend);

      if (+cfg.backend === VF.Renderer.Backends.RAPHAEL) {
        m2v.util.scaleContextRaphael(canvas, ctx, cfg.page_scale);
      } else {
        m2v.util.scaleContext(ctx, cfg.page_scale);
      }

      cfg.ctx = ctx;

      var r = new m2v.Renderer(cfg);

      m2v.rendered_measures = r.allVexMeasureStaffs;

    };

    m2v.RUNTIME_ERROR = function(error_code, message) {
      this.error_code = error_code;
      this.message = message;
    };

    m2v.RUNTIME_ERROR.prototype.toString = function() {
      return "MEI2VF.RUNTIME_ERROR: " + this.error_code + ': ' + this.message;
    };

    m2v.attsToObj = function(element) {
      var i, j, obj;
      if (element.attributes) {
        obj = {};
        for ( i = 0, j = element.attributes.length; i < j; i += 1) {
          obj[element.attributes[i].nodeName] = element.attributes[i].nodeValue;
        }
      }
      return obj;
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

      /**
       * initializes the xml document; if a string is passed, it gets parsed
       *
       * @param xmlDoc {string|document} the input string or input document
       * @return {document} the xml document ready to be transformed
       */
      initXmlDoc : function(xmlDoc) {
        if ( typeof xmlDoc === 'string') {
          // xmlDoc = m2v.util.createXMLDoc(xmlDoc);
          xmlDoc = $.parseXML(xmlDoc);
        }
        return xmlDoc[0] || xmlDoc;
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

      getMEIPageConfig : function(firstScoreDef) {
        var obj = m2v.attsToObj(firstScoreDef);
        return {
          page_scale : parseInt(obj['page.scale'], 10) / 100 || undefined,
          page_height : obj['page.height'],
          page_width : obj['page.width'],
          page_margin_top : (isNaN(+obj['page.topmar'])) ? undefined : +obj['page.topmar'],
          page_margin_left : (isNaN(+obj['page.leftmar'])) ? undefined : +obj['page.leftmar'],
          page_margin_right : (isNaN(+obj['page.rightmar'])) ? undefined : +obj['page.rightmar']
        };
      },

      // TODO change canvas width and height when a target canvas is passed!
      // TODO handle jQuery target objects, too!?
      createCanvas : function(target, backend, cfg) {
        var me = this, h, w;
        h = cfg.page_height;
        w = cfg.page_width;
        if (target.localName === 'canvas' || target.localName === 'svg') {
          return target;
        }
        if (+backend === VF.Renderer.Backends.RAPHAEL) {
          w /= cfg.page_scale;
          h /= cfg.page_scale;
          return $('<svg width="' + w + '" height="' + h + '"></svg>').appendTo(target).get(0);
        }
        return $('<canvas width="' + w + '" height="' + h + '"></canvas>').appendTo(target).get(0);
      },

      /**
       * creates the renderer context
       *
       * @param target {} the target element
       * @param backend {} the backend
       * @returns the canvas context
       */
      createContext : function(canvas, backend) {
        return new VF.Renderer(canvas, backend || VF.Renderer.Backends.CANVAS).getContext();
      },

      /**
       * scales the current context
       *
       * @param ctx {} the canvas context
       * @param scale {Number} the scale ratio. 1 means 100%
       */
      scaleContext : function(ctx, scale) {
        ctx.scale(scale, scale);
      },

      // FIXME display errors
      // TODO simplify raphael scaling
      scaleContextRaphael : function(canvas, ctx, scale) {
        var me = this, paper, h, w;
        // paper = ctx.paper;
        // h = me.cfg.page_height;
        // w = me.cfg.page_width;
        // paper.setViewBox(0, 0, w / scale, h / scale);
        // paper.canvas.setAttribute('preserveAspectRatio', 'none');
        // $(canvas).find('svg').attr('width', w).attr('height', h);
        // $(canvas).attr('width', w).attr('height', h);
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

    m2v.Viewer = function(opts) {

      if (!opts) {
        throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NoConfig', 'No config passed to Renderer.');
      }

      if (!opts.xmlDoc) {
        throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingData', 'No XML document passed to Renderer.');
      }

      opts.xmlDoc = m2v.util.initXmlDoc(opts.xmlDoc);

      var firstScoreDef = $(opts.xmlDoc).find('scoreDef')[0];
      if (!firstScoreDef) {
        throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadMEIFile', 'No <scoreDef> found in config.data.');
      }

      // TODO: hier noch die page config defaults einfügen!

      var cfg = $.extend(true, {}, this.defaults, m2v.util.getMEIPageConfig(firstScoreDef), opts);
      // var cfg = opts;

      var canvas = m2v.util.createCanvas(cfg.target, cfg.backend, cfg);

      var ctx = m2v.util.createContext(canvas, cfg.backend);

      if (+cfg.backend === VF.Renderer.Backends.RAPHAEL) {
        m2v.util.scaleContextRaphael(canvas, ctx, cfg.page_scale);
      } else {
        m2v.util.scaleContext(ctx, cfg.page_scale);
      }

      cfg.ctx = ctx;
      console.log(cfg);
      this.renderer = new m2v.Renderer(cfg);

      // window.ctx = ctx;
      // window.m = me;

      // m2v.util.drawBoundingBoxes(ctx, {
      // frame : false,
      // staffs : {
      // data : me.allVexMeasureStaffs,
      // // drawModifiers : true,
      // drawNoteArea : true
      // // },
      // // voices : {
      // // data : me.allStaffVoices,
      // // drawTickables : true,
      // // drawFrame : true
      // }
      // });

    };

    m2v.Viewer.prototype = {
      defaults : {
        page_scale : 0.6,
        // NB page_height and page_width are the only absolute (non-scaled)
        // values; all other measurements will be scaled; => change width and
        // height to relative values, too?
        page_height : 350,
        page_width : 800,
        page_margin_top : 60,
        page_margin_left : 20,
        page_margin_right : 20,
      }
    };

    return {
      render_notation : m2v.render_notation,
      getRenderedMeasures : m2v.getRenderedMeasures,
      Viewer : m2v.Viewer
    };

    // return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
