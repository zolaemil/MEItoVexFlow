var MEI2VF = ( function(m2v, VF, $, undefined) {

    // TODO add setters (and getters?) for single config items / groups

    m2v.CONST = {
      LABELS_NONE : 0,
      LABELS_FULL : 1,
      LABELS_ABBR : 2
    };

    // TODO handle auto left indent, auto labels
    // question: fallback when no attributes are specified!?!?

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

    m2v.render_notation = function(xmlDoc, target, width, height, backend, options) {
      var cfg = $.extend(true, {}, {
        page_height : height,
        page_width : width,
        xmlDoc : xmlDoc,
        target : target,
        backend : backend
      }, options);
      var v = new m2v.Viewer(cfg);
    };

    m2v.getRenderedMeasures = function() {
      return m2v.rendered_measures;
    };

    m2v.defaults = {
      page_scale : 1,
      // NB page_height and page_width are the only absolute (non-scaled)
      // values; all other measurements will be scaled; => change width
      // and
      // height to relative values, too?
      page_height : 350,
      page_width : 800,
      page_margin_top : 60,
      page_margin_left : 20,
      page_margin_right : 20,
      systemLeftMar : 0,
      systemSpacing : 100,
      staveSpacing : 60,
      measurePaddingRight : 10, // originally 20
      autoStaveConnectorLine : true,
      autoMeasureNumbers : false,
      labelScheme : m2v.CONST.LABELS_NONE,
      maxHyphenDistance : 75,
      //sectionsOnNewLine : false, // TODO: add feature
      // NB the weight properties can be used to specify style, weight or
      // both (space separated); some of the objects are passed directly to
      // vexFlow (which
      // requires the name 'weight'), so I didn't change the name
      lyricsFont : {
        family : 'Times',
        size : 15
      },
      annotFont : {
        family : 'Times',
        size : 15,
        weight : 'Italic'
      },
      staffFont : {
        family : 'Times',
        size : 14,
        weight : 'Italic'
      },
      tempoFont : {
        family : "Times",
        size : 17,
        weight : "bold"
      },
      // TODO: check if these constants can be changed in the prototype
      staff : {
        vertical_bar_width : 20, // 10 // Width around vertical bar end-marker
        fill_style : "#000000",
        spacing_between_lines_px : 10, // in pixels
        top_text_position : 1.5, // 1 // in staff lines
        bottom_text_position : 7.5
      }
    };

    m2v.Viewer = function(opts) {
      this.init(opts);
    };

    m2v.Viewer.prototype = {

      init : function(opts) {
        var me = this;
        if (!opts) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NoConfig', 'No config passed to Renderer.');
        }

        if (!opts.xmlDoc) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingData', 'No XML document passed to Renderer.');
        }

        opts.xmlDoc = me.initXmlDoc(opts.xmlDoc);

        var firstScoreDef = $(opts.xmlDoc).find('scoreDef')[0];
        if (!firstScoreDef) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadMEIFile', 'No <scoreDef> found in config.data.');
        }

        var cfg = $.extend(true, {}, m2v.defaults, me.getMEIPageConfig(firstScoreDef), opts);

        var canvas = me.createCanvas(cfg.target, cfg.backend, cfg);
        var ctx = me.createContext(canvas, cfg.backend);

        // substract four line distances from page_margin_top in order to
        // compensate VexFlow's default top spacing and allow specifying absolute
        // values
        cfg.page_margin_top -= 40;
        cfg.printSpaceRight = cfg.page_width/*/ cfg.page_scale*/ - cfg.page_margin_right;
        cfg.printSpaceWidth = Math.floor(cfg.printSpaceRight - cfg.page_margin_left) - 1;

        VF.STAVE_LINE_THICKNESS = 1;

        if (+cfg.backend === VF.Renderer.Backends.RAPHAEL) {
          me.scaleContextRaphael(canvas, ctx, cfg.page_scale);
        } else {
          me.scaleContext(ctx, cfg.page_scale);
        }

        cfg.ctx = ctx;
        me.renderer = new m2v.Renderer();

        me.renderer.initConfig(cfg);
        me.renderer.process();
        me.renderer.draw();

        m2v.rendered_measures = me.renderer.allVexMeasureStaffs;

        // window.ctx = ctx;
        // window.m = me;

        // m2v.util.drawBoundingBoxes(ctx, {
        // frame : false,
        // staffs : {
        // data : me.renderer.allVexMeasureStaffs,
        // drawModifiers : true,
        // drawNoteArea : true
        // },
        // // voices : {
        // // data : me.renderer.allStaffVoices,
        // // drawTickables : true,
        // // drawFrame : true
        // // }
        // });

      },

      /**
       * initializes the xml document; if a string is passed, it gets parsed
       *
       * @param xmlDoc
       *            {string|document} the input string or input document
       * @return {document} the xml document ready to be transformed
       */
      initXmlDoc : function(xmlDoc) {
        if ( typeof xmlDoc === 'string') {
          // xmlDoc = m2v.util.createXMLDoc(xmlDoc);
          xmlDoc = $.parseXML(xmlDoc);
        }
        return xmlDoc[0] || xmlDoc;
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

      removeNS : function(str) {
        return str.replace(/(<[\/]?)[\w]+:/g, '$1');
      },

      // TODO change canvas width and height when a target canvas is passed!
      // TODO handle jQuery target objects, too!?
      createCanvas : function(target, backend, cfg) {
        var me = this, h, w;
        h = cfg.page_height;
        w = cfg.page_width;
        if (target.localName === 'canvas' || target.localName === 'svg')
          return target;
        if (+backend === VF.Renderer.Backends.RAPHAEL) {
          // w /= cfg.page_scale;
          // h /= cfg.page_scale;
          return $('<svg width="' + w + '" height="' + h + '"></svg>').appendTo(target).get(0);
        }
        w *= cfg.page_scale;
        h *= cfg.page_scale;
        return $('<canvas width="' + w + '" height="' + h + '"></canvas>').appendTo(target).get(0);
      },

      createContext : function(canvas, backend) {
        return new VF.Renderer(canvas, backend || VF.Renderer.Backends.CANVAS).getContext();
      },

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
      }
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

    return {
      render_notation : m2v.render_notation,
      getRenderedMeasures : m2v.getRenderedMeasures,
      Renderer : m2v.Renderer,
      Viewer : m2v.Viewer,
      CONST : m2v.CONST,
      defaults : m2v.defaults
    };

    // return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
