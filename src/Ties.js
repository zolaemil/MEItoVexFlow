var MEI2VF = ( function(m2v, VF, $, undefined) {

    m2v.Ties = function(config) {
      this.init();
    };

    m2v.Ties.prototype = {
      init : function() {
        this.allVexTies = [];
        this.allTieInfos = [];
      },

      add : function(obj) {
        this.allTieInfos.push(obj);
      },

      getAll : function() {
        return this.allTieInfos;
      },

      start_tieslur : function(startid, linkCond) {
        var eventLink = new m2v.EventLink(startid, null);
        eventLink.setParams({
          linkCond : linkCond
        });
        this.allTieInfos.push(eventLink);
      },

      // TODO: separate tie & slur specific functions in separate objects!?
      terminate_tie : function(endid, linkCond) {
        var me = this, cmpLinkCond, found, i, tie, allTies;

        allTies = this.getAll();

        cmpLinkCond = function(lc1, lc2) {
          return (lc1 && lc2 && lc1.pname === lc2.pname && lc1.oct === lc2.oct && lc1.system === lc2.system);
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
        // pitch,
        // then create a tie that has only endid set.
        if (!found) {
          this.add(new m2v.EventLink(null, endid));
        }
      },

      terminate_slur : function(endid, linkCond) {
        var me = this, cmpLinkCond, found, i, slur;

        var allTieInfos = this.getAll();

        cmpLinkCond = function(lc1, lc2) {
          return lc1.nesting_level === lc2.nesting_level && lc1.system === lc2.system;
        };

        found = false;
        for ( i = 0; i < allTieInfos.length; ++i) {
          slur = allTieInfos[i];
          if (slur && !slur.getLastId() && cmpLinkCond(slur.params.linkCond, linkCond)) {
            slur.setLastId(endid);
            found = true;
            break;
          }
        }
        if (!found) {
          me.add(new m2v.EventLink(null, endid));
        }
      },

      createVexFromLinks : function(notes_by_id) {
        var me = this, f_note, l_note, ctx = this.ctx, vexTie, bezier, bezierArray, cps, xy;
        $.each(me.allTieInfos, function(ii, link) {

          f_note = notes_by_id[link.getFirstId()];
          l_note = notes_by_id[link.getLastId()];
          bezier = link.params.bezier;

          if (bezier) {
            cps = me.bezierStringToCps(bezier);
            vexTie = new VF.Curve((f_note) ? f_note.vexNote : undefined, (l_note) ? l_note.vexNote : undefined, {
              cps : cps,
              y_shift_start : +link.params.startvo,
              y_shift_end : +link.params.endvo
            });
          } else {
            vexTie = new VF.StaveTie({
              first_note : (f_note) ? f_note.vexNote : undefined,
              last_note : (l_note) ? l_note.vexNote : undefined
            });
            vexTie.setDir(link.params.curvedir);
          }
          me.allVexTies.push(vexTie);
        });
        return this;
      },

      bezierStringToCps : function(str) {
        var cps = [], bezierArray = str.split(' ');
        while (bezierArray[0]) {
          xy = bezierArray.splice(0, 2);
          cps.push({
            x : +xy[0],
            y : +xy[1]
          });
        }
        return cps;
      },

      setContext : function(ctx) {
        this.ctx = ctx;
        return this;
      },

      draw : function(notes_by_id) {
        var ctx = this.ctx;
        $.each(this.allVexTies, function(i, vexTie) {
          vexTie.setContext(ctx).draw();
        });
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
