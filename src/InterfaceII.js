var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @class MEI2VF.Viewer
     *
     * @constructor
     * @param {Object} config For a full list, see the config options of the
     * Viewer object as well as the converter options at {@link MEI2VF.Converter
     * MEI2VF.Converter}
     */
    m2v.Viewer = function(config) {
      this.init(config);
    };

    m2v.Viewer.prototype = {

      defaults : {
        /**
         * @cfg
         */
        page_scale : 1,
        /**
         * @cfg
         */
        page_height : 350,
        /**
         * @cfg
         */
        page_width : 800,
        /**
         * @cfg
         */
        staff : {
          fill_style : "#000000"
        }
      },

      init : function(config) {
        var me = this, xmlDoc, firstScoreDef, cfg, canvas, ctx;

        if (!config) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NoConfig', 'No config passed to Viewer.');
        }

        if (!config.xmlDoc) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingData', 'No XML document passed to Viewer.');
        }

        xmlDoc = me.initXmlDoc(config.xmlDoc);

        firstScoreDef = $(xmlDoc).find('scoreDef')[0];
        if (!firstScoreDef) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadMEIFile', 'No <scoreDef> found in config.data.');
        }

        cfg = $.extend(true, {}, me.defaults, me.getMEIPageConfig(firstScoreDef), config);

        canvas = me.createCanvas(cfg.target, cfg.backend, cfg);
        ctx = me.createContext(canvas, cfg.backend);
        me.scaleContext(ctx, cfg);

        me.converter = new m2v.Converter(cfg);
        me.texts = new MEI2TEXT.Texts();
        me.anchoredTexts = new MEI2TEXT.AnchoredTexts();


        me.converter.setPgHeadProcessor(function(element) {
          me.texts.addComplexText(element, {
            x : this.printSpace.left,
            y : 200,
            w : this.printSpace.width
          });
        });
        
        me.converter.setAnchoredTextProcessor(function(element, staff) {
          me.anchoredTexts.processAnchoredStaffText(element, staff);
        });
        

        // TODO für die texte etwas analoges zu der converter-klasse einrichten
        // (draw usw)


        me.converter.process(xmlDoc);
        me.converter.draw(ctx);
        me.texts.setContext(ctx).draw();
        me.anchoredTexts.setContext(ctx).draw();

        // console.log(me.converter.systems);

        // currently only supported with html5 canvas:
        // m2v.Util.drawBoundingBoxes(ctx, {
        // frame : false,
        // staffs : {
        // data : me.converter.allVexMeasureStaffs,
        // drawModifiers : true,
        // drawNoteArea : true
        // },
        // voices : {
        // data : me.converter.allStaffVoices,
        // drawTickables : true,
        // drawFrame : true
        // }
        // });

      },

      /**
       * initializes the xml document; if a string is passed, it gets parsed
       *
       * @param xmlDoc {String|Document} the input string or input document
       * @return {Document} the xml document to be rendered
       */
      initXmlDoc : function(xmlDoc) {
        if ( typeof xmlDoc === 'string') {
          // xmlDoc = m2v.Util.createXMLDoc(xmlDoc);
          xmlDoc = $.parseXML(xmlDoc);
        }
        return xmlDoc[0] || xmlDoc;
      },

      getMEIPageConfig : function(scoreDef) {
        var obj = m2v.Util.attsToObj(scoreDef);
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

      // TODO change canvas width and height when a target canvas/svg element is
      // passed!?
      // TODO handle jQuery target objects, too!?
      createCanvas : function(target, backend, cfg) {
        var h, w;
        if (target.localName === 'canvas' || target.localName === 'svg')
          return target;
        h = cfg.page_height * cfg.page_scale;
        w = cfg.page_width * cfg.page_scale;
        if (+backend === VF.Renderer.Backends.RAPHAEL) {
          return $('<svg width="' + w + '" height="' + h + '"></svg>').appendTo(target).get(0);
        }
        return $('<canvas width="' + w + '" height="' + h + '"></canvas>').appendTo(target).get(0);
      },

      createContext : function(canvas, backend) {
        return new VF.Renderer(canvas, backend || VF.Renderer.Backends.CANVAS).getContext();
      },

      scaleContext : function(ctx, cfg) {
        var paper, w, h, scale;
        scale = cfg.page_scale;
        if (+cfg.backend === VF.Renderer.Backends.RAPHAEL) {
          paper = ctx.paper;
          h = cfg.page_height;
          w = cfg.page_width;
          paper.setSize(w * scale, h * scale);
          paper.setViewBox(0, 0, w, h);
        } else {
          ctx.scale(scale, scale);
        }
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
