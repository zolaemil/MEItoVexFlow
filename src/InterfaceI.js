var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * Basic rendering function. Uses the m2v.Converter's prototype as a
     * singleton. No scaling; page layout information in the MEI code is ignored.
     * @param {Object} xmlDoc
     * @param {Object} target
     * @param {number} width
     * @param {Object} unused (kept for compatibility)
     * @param {Object} backend
     * @param {Object} options
     */
    m2v.render_notation = function(xmlDoc, target, width, unused, backend, options) {

      var cfg = options || {};

      cfg.ctx = new VF.Renderer(target, backend || VF.Renderer.Backends.CANVAS).getContext();
      cfg.printSpaceTop = cfg.page_margin_top - 40 || 20;
      cfg.printSpaceLeft = 20;
      cfg.printSpaceRight = (width || 800) - 20;

      m2v.Converter.prototype.initConfig(cfg);
      m2v.Converter.prototype.process(xmlDoc[0] || xmlDoc);
      m2v.Converter.prototype.draw();

      MEI2VF.rendered_measures = m2v.Converter.prototype.allVexMeasureStaffs;
    };

    return {
      setLogging : m2v.setLogging,
      render_notation : m2v.render_notation
    };

  }(MEI2VF || {}, Vex.Flow, jQuery));
