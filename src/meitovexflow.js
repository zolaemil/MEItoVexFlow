var MEI2VF = ( function(m2v, VF, $, undefined) {

/**
 * @constructor 
 */
    m2v.Viewer = function(config) {
      this.init(config);
    };

    m2v.Viewer.prototype = {

      defaults : {
        page_scale : 1,
        page_height : 350,
        page_width : 800,
        page_margin_top : 60,
        page_margin_left : 20,
        page_margin_right : 20
      },

      // TODO: add interface documentation!!!
      // TODO extract Viewer!

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
        cfg.ctx = ctx;

        // substract four line distances from page_margin_top in order to
        // compensate VexFlow's default top spacing / allow specifying absolute
        // values
        cfg.printSpaceTop = cfg.page_margin_top - 40;
        cfg.printSpaceRight = cfg.page_width - cfg.page_margin_right;
        cfg.printSpaceLeft = cfg.page_margin_left;

        me.converter = new m2v.Converter(cfg);
        me.converter.process(xmlDoc);
        me.converter.draw();

        // currently only supported with html5 canvas:
        // m2v.util.drawBoundingBoxes(ctx, {
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

      getAllVexMeasureStaffs : function() {
        return this.converter.allVexMeasureStaffs;
      },

      /**
       * initializes the xml document; if a string is passed, it gets parsed
       *
       * @param xmlDoc
       *            {string|document} the input string or input document
       * @return {document} the xml document to be rendered
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

      // TODO change canvas width and height when a target canvas/svg element is
      // passed!?
      // TODO handle jQuery target objects, too!?
      createCanvas : function(target, backend, cfg) {
        var me = this, h, w;
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

    return {
      setLogging : m2v.setLogging,
      Viewer : m2v.Viewer,
      LABEL : m2v.LABEL
    };

    // return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));


MEI2VF.render_notation = function(xmlDoc, target, width, height, backend, options) {
  var cfg = $.extend(true, {}, {
    page_height : height,
    page_width : width,
    xmlDoc : xmlDoc,
    target : target,
    backend : backend
  }, options);
  var v = new MEI2VF.Viewer(cfg);

  MEI2VF.rendered_measures = v.getAllVexMeasureStaffs();
};
