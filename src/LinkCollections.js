var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {

    /**
     * @class MEI2VF.LinkCollection
     * @private
     *
     * @constructor
     */
    m2v.LinkCollection = function(systemInfo, unresolvedTStamp2) {
      this.init(systemInfo, unresolvedTStamp2);
    };

    m2v.LinkCollection.prototype = {

      /**
       * initializes the LinkCollection
       */
      init : function(systemInfo, unresolvedTStamp2) {
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
        this.unresolvedTStamp2 = unresolvedTStamp2;
      },

      validateAtts : function() {
        throw new m2v.RUNTIME_ERROR('MEI2VF.DEVELOPMENT_ERROR.validateAtts', 'Developers have to provide a validateAtts method when inheriting MEI2VF.LinkCollection.');
      },

      createVexFromInfos : function() {
        throw new m2v.RUNTIME_ERROR('MEI2VF.DEVELOPMENT_ERROR.createVexFromInfos', 'Developers have to provide a createVexFromInfos method when inheriting MEI2VF.LinkCollection.');
      },

      /**
       * create EventLink objects from  <b>tie</b>, <b>slur</b> or <b>hairpin</b>
       * elements
       */
      createInfos : function(link_elements, measureElement, systemInfo) {
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
          var staffdef = systemInfo.getStaffInfo(stffinf.staff_n);
          if (!staffdef)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createInfos:E02', 'Cannot determine staff definition.');
          var meter = staffdef.meter;
          if (!meter.count || !meter.unit)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.createInfos:E03', "Cannot determine meter; missing or incorrect @meter.count or @meter.unit.");
          return MeiLib.tstamp2id(tstamp, layer, meter);
        };

        var measure_partOf = function(tstamp2) {
          return tstamp2.substring(0, tstamp2.indexOf('m'));
        };

        var beat_partOf = function(tstamp2) {
          return tstamp2.substring(tstamp2.indexOf('+') + 1);
        };

        $.each(link_elements, function() {
          var eventLink, atts, startid, tstamp, endid, tstamp2, measures_ahead;

          eventLink = new m2v.EventLink(null, null);

          atts = m2v.Util.attsToObj(this);

          me.validateAtts(atts);

          eventLink.setParams(atts);

          // find startid for eventLink. if tstamp is provided in the
          // element, tstamp will be calculated.
          startid = atts.startid;
          if (startid) {
            eventLink.setFirstId(startid);
          } else {
            tstamp = atts.tstamp;
            if (tstamp) {
              startid = local_tstamp2id(tstamp, this, measureElement);
              eventLink.setFirstId(startid);
            }
            // else {
            // // no @startid, no @tstamp ==> eventLink.first_ref
            // remains empty.
            // }
          }

          // find end reference value (id/tstamp) of eventLink:
          endid = atts.endid;
          if (endid) {
            eventLink.setLastId(endid);
          } else {
            tstamp2 = atts.tstamp2;
            if (tstamp2) {
              measures_ahead = +measure_partOf(tstamp2);
              if (measures_ahead > 0) {
                eventLink.setLastTStamp(beat_partOf(tstamp2));
                // register that eventLink needs context;
                // need to save: measure.n, link.staff_n,
                // link.layer_n
                var staffinfo = link_staffInfo(this);
                var target_measure_n = +$(measureElement).attr('n') + measures_ahead;
                var refLocationIndex = target_measure_n.toString() + ':' + staffinfo.staff_n + ':' + staffinfo.layer_n;
                if (!me.unresolvedTStamp2[refLocationIndex])
                  me.unresolvedTStamp2[refLocationIndex] = [];
                me.unresolvedTStamp2[refLocationIndex].push(eventLink);
              } else {
                endid = local_tstamp2id(beat_partOf(tstamp2), this, measureElement);
                eventLink.setLastId(endid);
              }
            }
            // else {
            // // TODO no @endid, no @tstamp2 ==> eventLink.last_ref remains empty.
            // }
          }
          me.addModel(eventLink);
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
      },

      /**
       * sets the context for the link collection
       * @param {Object} ctx the canvas context
       */
      setContext : function(ctx) {
        this.ctx = ctx;
        return this;
      },

      /**
       * draws the link collection to the canvas set by {@link #setContext}
       */
      draw : function() {
        var ctx = this.ctx;
        $.each(this.allVexObjects, function() {
          this.setContext(ctx).draw();
        });
      }
    };

    /**
     * @class MEI2VF.Hairpins
     * @extend MEI2VF.LinkCollection
     * @private
     *
     * @constructor
     */
    m2v.Hairpins = function(systemInfo, unresolvedTStamp2) {
      this.init(systemInfo, unresolvedTStamp2);
    };

    Vex.Inherit(m2v.Hairpins, m2v.LinkCollection, {

      init : function(systemInfo, unresolvedTStamp2) {
        m2v.Ties.superclass.init.call(this, systemInfo, unresolvedTStamp2);
      },

      validateAtts : function(atts) {
        if (!atts.form) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:createInfos', '@form is mandatory in <hairpin> - make sure the xml is valid.');
        }
      },

      createVexFromInfos : function(notes_by_id) {
        var me = this, f_note, l_note, vex_options;
        vex_options = {
          height : 10,
          y_shift : 0,
          left_shift_px : 0,
          r_shift_px : 0
        };
        $.each(me.allModels, function() {
          f_note = notes_by_id[this.getFirstId()] || {};
          l_note = notes_by_id[this.getLastId()] || {};

          if (f_note.system !== undefined && l_note.system !== undefined && f_note.system !== l_note.system) {
          } else {
            me.createSingleHairpin(f_note, l_note, this.params, vex_options);
          }

        });
        return this;
      },

      createSingleHairpin : function(f_note, l_note, params, vex_options) {
        var me = this, place, type, hairpin;
        place = m2v.tables.positions[params.place];
        type = m2v.tables.hairpins[params.form];

        if (f_note.vexNote && l_note.vexNote) {
          hairpin = new VF.StaveHairpin({
            first_note : f_note.vexNote,
            last_note : l_note.vexNote
          }, type);

          hairpin.setRenderOptions(vex_options);
          hairpin.setPosition(place);

          me.allVexObjects.push(hairpin);
        } else {
          m2v.L('Hairpins', 'Hairpin cannot be rendered:');
          console.log(arguments);
        }

      }
    });

    /**
     * @class MEI2VF.Ties
     * @extend MEI2VF.LinkCollection
     * @private
     *
     * @constructor
     */

    m2v.Ties = function(systemInfo, unresolvedTStamp2) {
      this.init(systemInfo, unresolvedTStamp2);
    };

    Vex.Inherit(m2v.Ties, m2v.LinkCollection, {

      init : function(systemInfo, unresolvedTStamp2) {
        m2v.Ties.superclass.init.call(this, systemInfo, unresolvedTStamp2);
      },

      validateAtts : function() {
        return;
      },

      // NB called from tie/slur attributes elements
      start_tieslur : function(startid, linkCond) {
        var eventLink = new m2v.EventLink(startid, null);
        eventLink.setParams({
          linkCond : linkCond
        });
        this.allModels.push(eventLink);
      },

      terminate_tie : function(endid, linkCond) {
        var cmpLinkCond, found, i, tie, allTies;

        allTies = this.getModels();

        cmpLinkCond = function(lc1, lc2) {
          return (lc1 && lc2 && lc1.pname === lc2.pname && lc1.oct === lc2.oct 
            && lc1.staff_n === lc2.staff_n);
        };

        if (!linkCond.pname || !linkCond.oct)
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:TermTie01', 'no pitch or octave specified for the tie');
        found = false;
        for ( i = 0; !found && i < allTies.length; ++i) {
          tie = allTies[i];
          if (!tie.getLastId()) {
            if (cmpLinkCond(tie.params.linkCond, linkCond)) {
              found = true;
              tie.setLastId(endid);
            }
            // else {
            // // TODO in case there's no link condition set for the
            // link,
            // // we have to retreive the pitch of the referenced note.
            // // var note_id = tie.getFirstId();
            // // if (note_id) {
            // // var note = me.notes_by_id[note_id];
            // // if (note && cmpLinkCond(tie.params.linkCond,
            // // linkCond)) {
            // // found=true;
            // // tie.setLastId(endid);
            // // }
            // // }
            // }
          }
        }
        // if no tie object found that is uncomplete and with the same
        // pitch, then create a tie that has only endid set.
        if (!found)
          this.addModel(new m2v.EventLink(null, endid));
      },

      terminate_slur : function(endid, linkCond) {
        var me = this, cmpLinkCond, found, i, slur;

        var allModels = this.getModels();

        cmpLinkCond = function(lc1, lc2) {
          return lc1.nesting_level === lc2.nesting_level;
        };

        found = false;
        for ( i = 0; i < allModels.length; ++i) {
          slur = allModels[i];
          if (slur && !slur.getLastId() && cmpLinkCond(slur.params.linkCond, linkCond)) {
            slur.setLastId(endid);
            found = true;
            break;
          }
        }
        if (!found)
          me.addModel(new m2v.EventLink(null, endid));
      },

      createVexFromInfos : function(notes_by_id) {
        var me = this, f_note, l_note;
        $.each(me.allModels, function() {
          f_note = notes_by_id[this.getFirstId()] || {};
          l_note = notes_by_id[this.getLastId()] || {};
          if (f_note.system !== undefined && l_note.system !== undefined && f_note.system !== l_note.system) {
            me.createSingleStaveTie(f_note, {}, this.params);

            // temporary: set the same curve direction for the second note by
            // evaluating the stem direction of the first note; change this when
            // the curve dir of the first note is calculated differently in
            // VexFlow
            this.params.curvedir = (f_note.vexNote.getStemDirection() === -1) ? 'above' : 'below';
            me.createSingleStaveTie({}, l_note, this.params);
          } else {
            me.createSingleStaveTie(f_note, l_note, this.params);
          }
        });
        return this;
      },

      createSingleStaveTie : function(f_note, l_note, params) {
        var me = this, vexTie, bezier, cps;
        bezier = params.bezier;
        if (bezier) {
          cps = me.bezierStringToCps(bezier);
          vexTie = new VF.Curve(f_note.vexNote, l_note.vexNote, {
            cps : cps,
            y_shift_start : +params.startvo,
            y_shift_end : +params.endvo
          });
        } else {
          vexTie = new VF.StaveTie({
            first_note : f_note.vexNote,
            last_note : l_note.vexNote,
            first_indices : f_note.index,
            last_indices : l_note.index
          });
          vexTie.setDir(params.curvedir);
        }
        me.allVexObjects.push(vexTie);
      },

      bezierStringToCps : function(str) {
        var cps = [], xy, bezierArray = str.split(' ');
        while (bezierArray[0]) {
          xy = bezierArray.splice(0, 2);
          cps.push({
            x : +xy[0],
            y : +xy[1]
          });
        }
        return cps;
      }
    });

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
