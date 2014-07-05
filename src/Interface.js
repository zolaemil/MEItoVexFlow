/**
 * @class MEI2VF
 * @singleton
 */
var MEI2VF = (function(m2v, MeiLib, VF, $, undefined) {
    return {
      /**
       * enables or disables MEI2VF logging
       * @method setLogging
       * @param {Boolean} value True if logging should be enabled, false if not. Defaults to false.
       */
      setLogging : m2v.setLogging,
      /**
       * The methods in Converter can be used to manually address distinct
       * processing steps and retrieve the created data. Can be used in
       * addition or as a supplement to {@link render_notation} and
       * {@link rendered_measures}
       */
      Converter : {
        /**
         * initializes the converter
         * @method initConfig
         * @param {Object} config The options passed to the converter. For a list, see
         * {@link MEI2VF.Converter#defaults}
         */
        initConfig : function(config) {
          m2v.Converter.prototype.initConfig(config);
        },
        /**
         * Processes the specified MEI document or document fragment. The generated
         * objects can be processed further or drawn immediately to a canvas via
         * {@link #draw}.
         * @method process
         * @param {XMLDocument} xmlDoc the XML document
         */
        process : function(xmlDoc) {
          m2v.Converter.prototype.process(xmlDoc);
        },
        /**
         * Draws the processed data to a canvas
         * @method draw
         * @param ctx The canvas context
         */
        draw : function(ctx) {
          m2v.Converter.prototype.draw(ctx);
        },
        /**
         * returns a 2d array of all Vex.Flow.Stave objects, arranged by
         * [measure_n][staff_n]
         * @method getAllVexMeasureStaffs
         * @return {Vex.Flow.Stave[][]} see {@link MEI2VF.Converter#allVexMeasureStaffs}
         */
        getAllVexMeasureStaffs : function() {
          return m2v.Converter.prototype.getAllVexMeasureStaffs();
        },
        /**
         * Returns the width and the height of the area that contains all drawn
         * staves as per the last processing.
         *
         * @method getStaffArea
         * @return {Object} the width and height of the area that contains all staves.
         * Properties: width, height
         */
        getStaffArea : function() {
          return m2v.Converter.prototype.getStaffArea();
        }
      },
      /**
       * Contains all Vex.Flow.Stave objects created when calling {@link #render_notation}.
       * Addressing scheme: [measure_n][staff_n]
       * @property {Vex.Flow.Stave[][]} rendered_measures
       */
      rendered_measures: null,
      /**
       * Main rendering function.
       * @param {XMLDocument} xmlDoc The MEI XML Document
       * @param {Element} target An svg or canvas element
       * @param {Number} width The width of the print space in pixels. Defaults to 800 (optional)
       * @param {Number} height The height of the print space in pixels. Defaults to 350 (optional)
       * @param {Number} backend Set to Vex.Flow.Renderer.Backends.RAPHAEL to
       * render to a Raphael context; if falsy, Vex.Flow.Renderer.Backends.CANVAS
       * is set (optional)
       * @param {Object} options The options passed to the converter. For a list, see
       * {@link MEI2VF.Converter#defaults} (optional)
       */
      render_notation: function (xmlDoc, target, width, height, backend, options) {
        var ctx;
        var cfg = options || {};

        ctx = new VF.Renderer(target, backend || VF.Renderer.Backends.CANVAS).getContext();

        width = width || 800;
        height = height || 350;

        if (+backend === VF.Renderer.Backends.RAPHAEL) {
          ctx.paper.setSize(width, height);
        }

        cfg.page_width = width;

        this.Converter.initConfig(cfg);
        this.Converter.process(xmlDoc[0] || xmlDoc);
        this.Converter.draw(ctx);
        this.rendered_measures = this.Converter.getAllVexMeasureStaffs();

      }
    };

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
