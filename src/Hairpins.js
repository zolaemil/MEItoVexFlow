var MEI2VF = (function(m2v, VF, $, undefined) {

/**
 * @param {Object} config
 * @constructor
 */
  m2v.Hairpins = function(config) {
    this.init();
  };

  m2v.Hairpins.prototype = {
    init : function() {
      this.allVexHairpins = [];
      this.allHairpinInfos = [];
    },

    add : function(obj) {
      this.allHairpinInfos.push(obj);
    },

    createVexFromLinks : function(notes_by_id) {
      var me = this, f_note, l_note, place, type, vex_options, hairpin;
      vex_options = {
        height : 10,
        y_shift : 0,
        left_shift_px : 0,
        r_shift_px : 0
      };
      $.each(me.allHairpinInfos, function(i, link) {
            f_note = notes_by_id[link.getFirstId()];
            l_note = notes_by_id[link.getLastId()];
            place = m2v.tables.positions[link.params.place];
            type = m2v.tables.hairpins[link.params.form];

            hairpin = new VF.StaveHairpin({
                  first_note : (f_note)
                      ? f_note.vexNote
                      : undefined,
                  last_note : (l_note)
                      ? l_note.vexNote
                      : undefined
                }, type);

            hairpin.setRenderOptions(vex_options);
            hairpin.setPosition(place);

            me.allVexHairpins.push(hairpin);

          });
      return this;
    },

    setContext : function(ctx) {
      this.ctx = ctx;
      return this;
    },

    draw : function() {
      var ctx = this.ctx;
      $.each(this.allVexHairpins, function(i, vexHairpin) {
            vexHairpin.setContext(ctx).draw();
          });
    }
  };

  return m2v;

}(MEI2VF || {}, Vex.Flow, jQuery));