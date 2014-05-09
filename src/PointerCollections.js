var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @class MEI2VF.PointerCollection
     * @private
     *
     * @constructor
     */
    m2v.PointerCollection = function(systemInfo, font) {
      this.init(systemInfo, font);
    };

    m2v.PointerCollection.prototype = {

      BOTTOM : VF.Annotation.VerticalJustify.BOTTOM,

      /**
       * initializes the PointerCollection
       */
      init : function(systemInfo, font) {
        /**
         * @property
         */
        this.allVexObjects = [];
        /**
         * @property
         */
        this.allModels = [];
        /**
         * @property
         */
        this.systemInfo = systemInfo;
        /**
         * @property
         */
        this.font = font;
      },

      createVexFromInfos : function() {
        throw new m2v.RUNTIME_ERROR('MEI2VF.DEVELOPMENT_ERROR.createVexFromInfos', 'You have to prodide a createVexFromInfos method when inheriting MEI2VF.PointerCollection.');
      },

      createInfos : function(elements, measureElement) {
        var me = this;

        var link_staffInfo = function(lnkelem) {
          return {
            staff_n : $(lnkelem).attr('staff') || '1',
            layer_n : $(lnkelem).attr('layer') || '1'
          };
        };

        // convert tstamp into startid in current measure
        var local_tstamp2id = function(tstamp, lnkelem, measureElement) {
          var stffinf = link_staffInfo(lnkelem);
          var staff = $(measureElement).find('staff[n="' + stffinf.staff_n + '"]');
          var layer = $(staff).find('layer[n="' + stffinf.layer_n + '"]').get(0);
          if (!layer) {
            var layer_candid = $(staff).find('layer');
            if (layer_candid && !layer_candid.attr('n'))
              layer = layer_candid;
            if (!layer)
              throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createInfos:E01', 'Cannot find layer');
          }
          var staffdef = me.systemInfo.getStaffInfo(stffinf.staff_n);
          if (!staffdef)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createInfos:E02', 'Cannot determine staff definition.');
          var meter = staffdef.meter;
          if (!meter.count || !meter.unit)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createInfos:E03', "Cannot determine meter; missing or incorrect @meter.count or @meter.unit.");
          return MeiLib.tstamp2id(tstamp, layer, meter);
        };

        $.each(elements, function() {
          var atts, startid, tstamp;

          atts = m2v.Util.attsToObj(this);

          startid = atts.startid;
          if (!startid) {
            tstamp = atts.tstamp;
            if (tstamp) {
              startid = local_tstamp2id(tstamp, this, measureElement);
            } else {
              throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createInfos', "Neither @startid nor @tstamp are specified");
            }
          }
          me.allModels.push({
            element : this,
            atts : atts,
            startid : startid
          });
        });
      },

      /**
       * adds a new model to {@link #allModels}
       * @param {Object} obj the object to add
       */
      addModel : function(obj) {
        this.allModels.push(obj);
      },

      /**
       * gets all models
       * @return {Object[]} all models in {@link #allModels}
       */
      getModels : function() {
        return this.allModels;
      }
    };

    /**
     * @class MEI2VF.Directives
     * @extend MEI2VF.PointerCollection
     * @private
     *
     * @constructor
     */
    m2v.Directives = function(systemInfo, font) {
      this.init(systemInfo, font);
    };

    Vex.Inherit(m2v.Directives, m2v.PointerCollection, {

      init : function(systemInfo, font) {
        m2v.Dynamics.superclass.init.call(this, systemInfo, font);
      },

      createVexFromInfos : function(notes_by_id) {
        var me = this, i, model, note, annot;
        i = me.allModels.length;
        while (i--) {
          model = me.allModels[i];
          note = notes_by_id[model.startid];
          if (note) {
            annot = (new VF.Annotation($(model.element).text().trim())).setFont(me.font.family, me.font.size, me.font.weight);
            if (model.atts.place === 'below') {
              note.vexNote.addAnnotation(0, annot.setVerticalJustification(me.BOTTOM));
            } else {
              note.vexNote.addAnnotation(0, annot);
            }
          } else {
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createVexFromInfos', "The reference in the directive could not be resolved.");
          }
        }
      }
    });

    /**
     * @class MEI2VF.Dynamics
     * @extend MEI2VF.PointerCollection
     * @private
     *
     * @constructor
     */
    m2v.Dynamics = function(systemInfo, font) {
      this.init(systemInfo, font);
    };

    Vex.Inherit(m2v.Dynamics, m2v.PointerCollection, {

      init : function(systemInfo, font) {
        m2v.Dynamics.superclass.init.call(this, systemInfo, font);
      },

      // TODO use Vex.Flow.Textnote instead of VF.Annotation!?
      createVexFromInfos : function(notes_by_id) {
        var me = this, i, model, note;
        i = me.allModels.length;
        while (i--) {
          model = me.allModels[i];
          note = notes_by_id[model.startid];
          if (note) {
            annot = (new VF.Annotation($(model.element).text().trim())).setFont(me.font.family, me.font.size, me.font.weight);
            if (model.atts.place === 'above') {
              note.vexNote.addAnnotation(0, annot);
            } else {
              note.vexNote.addAnnotation(0, annot.setVerticalJustification(me.BOTTOM));
            }
          } else {
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createVexFromInfos', "The reference in the directive could not be resolved.");
          }
        }

      }
    });

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
