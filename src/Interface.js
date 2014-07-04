/**
 * @class MEI2VF
 * @singleton
 */
var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {
    return {
      setLogging : m2v.setLogging,
      Converter : {
        initConfig : function(c) {
          return m2v.Converter.prototype.initConfig(c);
        },
        process : function(c) {
          return m2v.Converter.prototype.process(c);
        },
        draw : function(c) {
          return m2v.Converter.prototype.draw(c);
        },
        getAllVexMeasureStaffs : function() {
          return m2v.Converter.prototype.getAllVexMeasureStaffs();
        },
        getStaffArea : function() {
          return m2v.Converter.prototype.getStaffArea();
        }
      }
    };
  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));

/**
 * @property
 */
MEI2VF.rendered_measures = null;

/**
 * Basic rendering function. Uses the m2v.Converter's prototype as a
 * singleton. No scaling; page layout information in the MEI code is ignored.
 * @param {XMLDocument} xmlDoc The MEI XML Document
 * @param {XMLElement} target An svg or canvas element
 * @param {Number} width The width of the print space in pixels
 * @param {Number} height The height of the print space in pixels
 * @param {Number} backend Set to Vex.Flow.Renderer.Backends.RAPHAEL to
 * render to a Raphael context; if falsy, Vex.Flow.Renderer.Backends.CANVAS
 * is set
 * @param {Object} options The options passed to the converter. For a list, see
 * {@link MEI2VF.Converter MEI2VF.Converter}
 */
MEI2VF.render_notation = function(xmlDoc, target, width, height, backend, options) {
  var ctx;
  var cfg = options || {};

  ctx = new Vex.Flow.Renderer(target, backend || Vex.Flow.Renderer.Backends.CANVAS).getContext();

  width = width || 800;
  height = height || 350;

  if (+backend === Vex.Flow.Renderer.Backends.RAPHAEL) {
    ctx.paper.setSize(width, height);
  }

  cfg.page_width = width;

  this.Converter.initConfig(cfg);
  this.Converter.process(xmlDoc[0] || xmlDoc);
  this.Converter.draw(ctx);
  this.rendered_measures = this.Converter.getAllVexMeasureStaffs();

};

