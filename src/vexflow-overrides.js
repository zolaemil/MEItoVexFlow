


Vex.Flow.Curve.prototype.renderCurve = function(params) {
  var ctx = this.context;
  var cps = this.render_options.cps;

  var x_shift = this.render_options.x_shift;
  var y_shift = this.render_options.y_shift * params.direction;

  // TODO name variables according to staveTie
  // ################# MODIFICATION (allows to specify y_shift for start & end
  // note separately):
  var y_shift_start = this.render_options.y_shift_start || 0;
  var y_shift_end = this.render_options.y_shift_end || 0;
  var first_x = params.first_x + x_shift;
  var first_y = params.first_y + y_shift + y_shift_start;
  var last_x = params.last_x - x_shift;
  var last_y = params.last_y + y_shift + y_shift_end;
  var thickness = this.render_options.thickness;

  var cp_spacing = (last_x - first_x) / (cps.length + 2);

  ctx.beginPath();
  ctx.moveTo(first_x, first_y);
  ctx.bezierCurveTo(first_x + cp_spacing + cps[0].x, first_y + (cps[0].y * params.direction), last_x - cp_spacing + cps[1].x, last_y + (cps[1].y * params.direction), last_x, last_y);
  ctx.bezierCurveTo(last_x - cp_spacing + cps[1].x, last_y + ((cps[1].y + thickness) * params.direction), first_x + cp_spacing + cps[0].x, first_y + ((cps[0].y + thickness) * params.direction), first_x, first_y);
  ctx.stroke();
  ctx.closePath();
  ctx.fill();
};

// ################################ BARLINE ####################################

Vex.Flow.Barline = ( function() {
    function Barline(type, x) {
      if (arguments.length > 0)
        this.init(type, x);
    }


    Barline.type = {
      SINGLE : 1,
      DOUBLE : 2,
      END : 3,
      REPEAT_BEGIN : 4,
      REPEAT_END : 5,
      REPEAT_BOTH : 6,
      NONE : 7
    };

    var THICKNESS = Vex.Flow.STAVE_LINE_THICKNESS;

    Vex.Inherit(Barline, Vex.Flow.StaveModifier, {
      init : function(type, x) {
        Barline.superclass.init.call(this);
        this.barline = type;
        this.x = x;
        // Left most x for the stave
      },

      getCategory : function() {
        return "barlines";
      },
      setX : function(x) {
        this.x = x;
        return this;
      },

      // Draw barlines
      draw : function(stave, x_shift) {
        x_shift = typeof x_shift !== 'number' ? 0 : x_shift;

        switch (this.barline) {
          case Barline.type.SINGLE:
            this.drawVerticalBar(stave, this.x, false);
            break;
          case Barline.type.DOUBLE:
            this.drawVerticalBar(stave, this.x, true);
            break;
          case Barline.type.END:
            this.drawVerticalEndBar(stave, this.x);
            break;
          case Barline.type.REPEAT_BEGIN:
            // If the barline is shifted over (in front of clef/time/key)
            // Draw vertical bar at the beginning.
            if (x_shift > 0) {
              this.drawVerticalBar(stave, this.x);
            }
            this.drawRepeatBar(stave, this.x + x_shift, true);
            break;
          case Barline.type.REPEAT_END:
            this.drawRepeatBar(stave, this.x, false);
            break;
          case Barline.type.REPEAT_BOTH:
            this.drawRepeatBar(stave, this.x, false);
            this.drawRepeatBar(stave, this.x, true);
            break;
          default:
            // Default is NONE, so nothing to draw
            break;
        }
      },

      drawVerticalBar : function(stave, x, double_bar) {
        if (!stave.context)
          throw new Vex.RERR("NoCanvasContext", "Can't draw stave without canvas context.");
        var top_line = stave.getYForLine(0);

        // ################## ADDED -1 AT THE END OF THE LINE:
        // var bottom_line = stave.getYForLine(stave.options.num_lines - 1) +
        // (THICKNESS / 2);
        var bottom_line = stave.getYForLine(stave.options.num_lines - 1) + (THICKNESS / 2) - 1;

        if (double_bar)
          stave.context.fillRect(x - 3, top_line, 1, bottom_line - top_line + 1);
        stave.context.fillRect(x, top_line, 1, bottom_line - top_line + 1);
      },

      drawVerticalEndBar : function(stave, x) {
        if (!stave.context)
          throw new Vex.RERR("NoCanvasContext", "Can't draw stave without canvas context.");

        var top_line = stave.getYForLine(0);

        // ################## ADDED -1 AT THE END OF THE LINE:
        //var bottom_line = stave.getYForLine(stave.options.num_lines - 1) +
        // (THICKNESS / 2);
        var bottom_line = stave.getYForLine(stave.options.num_lines - 1) + (THICKNESS / 2) - 1;

        stave.context.fillRect(x - 5, top_line, 1, bottom_line - top_line + 1);
        stave.context.fillRect(x - 2, top_line, 3, bottom_line - top_line + 1);
      },

      drawRepeatBar : function(stave, x, begin) {
        if (!stave.context)
          throw new Vex.RERR("NoCanvasContext", "Can't draw stave without canvas context.");

        var top_line = stave.getYForLine(0);

        // ################## ADDED -1 AT THE END OF THE LINE:
        // var bottom_line = stave.getYForLine(stave.options.num_lines - 1) +
        // (THICKNESS / 2);
        var bottom_line = stave.getYForLine(stave.options.num_lines - 1) + (THICKNESS / 2) - 1;

        var x_shift = 3;

        if (!begin) {
          x_shift = -5;
        }

        stave.context.fillRect(x + x_shift, top_line, 1, bottom_line - top_line + 1);
        stave.context.fillRect(x - 2, top_line, 3, bottom_line - top_line + 1);

        var dot_radius = 2;

        // Shift dots left or right
        if (begin) {
          x_shift += 4;
        } else {
          x_shift -= 4;
        }

        var dot_x = (x + x_shift) + (dot_radius / 2);

        // calculate the y offset based on number of stave lines
        var y_offset = (stave.options.num_lines - 1) * stave.options.spacing_between_lines_px;
        y_offset = (y_offset / 2) - (stave.options.spacing_between_lines_px / 2);
        var dot_y = top_line + y_offset + (dot_radius / 2);

        // draw the top repeat dot
        stave.context.beginPath();
        stave.context.arc(dot_x, dot_y, dot_radius, 0, Math.PI * 2, false);
        stave.context.fill();

        //draw the bottom repeat dot
        dot_y += stave.options.spacing_between_lines_px;
        stave.context.beginPath();
        stave.context.arc(dot_x, dot_y, dot_radius, 0, Math.PI * 2, false);
        stave.context.fill();
      }
    });

    return Barline;
  }());


// VexFlow - Music Engraving for HTML5
// Copyright Mohit Muthanna 2010
//
// This class implements text annotations.

/**
 * @constructor
 */
Vex.Flow.Annotation = (function() {
  function Annotation(text) {
    if (arguments.length > 0) this.init(text);
  }

  Annotation.Justify = {
    LEFT: 1,
    CENTER: 2,
    RIGHT: 3,
    CENTER_STEM: 4
  };

  Annotation.VerticalJustify = {
    TOP: 1,
    CENTER: 2,
    BOTTOM: 3,
    CENTER_STEM: 4
  };

  var Modifier = Vex.Flow.Modifier;
  Vex.Inherit(Annotation, Modifier, {
    init: function(text) {
      Annotation.superclass.init.call(this);

      this.note = null;
      this.index = null;
      this.text_line = 0;
      this.text = text;
      this.justification = Annotation.Justify.CENTER;
      this.vert_justification = Annotation.VerticalJustify.TOP;
      this.font = {
        family: "Arial",
        size: 10,
        weight: ""
      };

      this.setWidth(Vex.Flow.textWidth(text));
    },

    getCategory: function() { return "annotations"; },

    setTextLine: function(line) { this.text_line = line; return this; },

    setFont: function(family, size, weight) {
      this.font = { family: family, size: size, weight: weight };
      return this;
    },

    setBottom: function(bottom) {
      if (bottom) {
        this.vert_justification = Annotation.VerticalJustify.BOTTOM;
      } else {
        this.vert_justification = Annotation.VerticalJustify.TOP;
      }
      return this;
    },

    setVerticalJustification: function(vert_justification) {
      this.vert_justification = vert_justification;
      return this;
    },

    getJustification: function() { return this.justification; },

    setJustification: function(justification) {
      this.justification = justification; return this; },

    draw: function() {
      if (!this.context) throw new Vex.RERR("NoContext",
        "Can't draw text annotation without a context.");
      if (!this.note) throw new Vex.RERR("NoNoteForAnnotation",
        "Can't draw text annotation without an attached note.");

      var start = this.note.getModifierStartXY(Modifier.Position.ABOVE,
          this.index);

      this.context.save();
      this.context.setFont(this.font.family, this.font.size, this.font.weight);
      var text_width = this.context.measureText(this.text).width;

      // Estimate text height to be the same as the width of an 'm'.
      //
      // This is a hack to work around the inability to measure text height
      // in HTML5 Canvas.
      var text_height = this.context.measureText("m").width;
      var x, y;

      if (this.justification == Annotation.Justify.LEFT) {
        x = start.x;
      } else if (this.justification == Annotation.Justify.RIGHT) {
        x = start.x - text_width;
      } else if (this.justification == Annotation.Justify.CENTER) {
        x = start.x - text_width / 2;
      } else /* CENTER_STEM */ {
        x = this.note.getStemX() - text_width / 2;
      }

      var stem_ext, spacing;
      var stemless = !this.note.hasStem();
      var has_stem = !stemless;

      if (has_stem) {
        stem_ext = this.note.getStemExtents();
        spacing = this.note.getStave().options.spacing_between_lines_px;
      }

      if (this.vert_justification == Annotation.VerticalJustify.BOTTOM) {
        y = this.note.stave.getYForBottomText(this.text_line);
        if (has_stem) {
          var stem_base = (this.note.stem_direction === 1 ? stem_ext.baseY : stem_ext.topY);
          y = Vex.Max(y, stem_base + (spacing * (this.text_line + 2)));
        }
      } else if (this.vert_justification ==
                 Annotation.VerticalJustify.CENTER) {
        var yt = this.note.getYForTopText(this.text_line) - 1;
        var yb = this.note.stave.getYForBottomText(this.text_line);
        y = yt + ( yb - yt ) / 2 + text_height / 2;
      } else if (this.vert_justification ==
                 Annotation.VerticalJustify.TOP) {
        y = Vex.Min(this.note.stave.getYForTopText(this.text_line), this.note.ys[0] - 10);
        if (has_stem) {
          y = Vex.Min(y, (stem_ext.topY - 5) - (spacing * this.text_line));
        }
      } else /* CENTER_STEM */{
        var extents = this.note.getStemExtents();
        y = extents.topY + ( extents.baseY - extents.topY ) / 2 +
          text_height / 2;
      }

      // ADD AL
      this.x = x;
      this.y = y;

      this.context.fillText(this.text, x, y);
      this.context.restore();
    }
  });

  return Annotation;
}());


Vex.Flow.StaveTie = (function() {
  function StaveTie(notes, text) {
    if (arguments.length > 0) this.init(notes, text);
  }

  StaveTie.prototype = {
    init: function(notes, text) {
      /**
       * Notes is a struct that has:
       *
       *  {
       *    first_note: Note,
       *    last_note: Note,
       *    first_indices: [n1, n2, n3],
       *    last_indices: [n1, n2, n3]
       *  }
       *
       **/
      this.notes = notes;
      this.context = null;
      this.text = text;

      this.render_options = {
          cp1: 8,      // Curve control point 1
          cp2: 12,      // Curve control point 2
          text_shift_x: 0,
          first_x_shift: 0,
          last_x_shift: 0,
          y_shift: 7,
          tie_spacing: 0,
          font: { family: "Arial", size: 10, style: "" }
        };

      this.font = this.render_options.font;
      this.setNotes(notes);
    },

    setContext: function(context) { this.context = context; return this; },
    setFont: function(font) { this.font = font; return this; },

    /**
     * Set the notes to attach this tie to.
     *
     * @param {!Object} notes The notes to tie up.
     */
    setNotes: function(notes) {
      if (!notes.first_note && !notes.last_note)
        throw new Vex.RuntimeError("BadArguments",
            "Tie needs to have either first_note or last_note set.");

      if (!notes.first_indices) notes.first_indices = [0];
      if (!notes.last_indices) notes.last_indices = [0];

      if (notes.first_indices.length != notes.last_indices.length)
        throw new Vex.RuntimeError("BadArguments", "Tied notes must have similar" +
          " index sizes");

      // Success. Lets grab 'em notes.
      this.first_note = notes.first_note;
      this.first_indices = notes.first_indices;
      this.last_note = notes.last_note;
      this.last_indices = notes.last_indices;
      return this;
    },

    /**
     * @return {boolean} Returns true if this is a partial bar.
     */
    isPartial: function() {
      return (!this.first_note || !this.last_note);
    },


    // ADDITION:
    setDir: function(dir) {
      this.curvedir = dir;
    },

    renderTie: function(params) {
      if (params.first_ys.length === 0 || params.last_ys.length === 0)
        throw new Vex.RERR("BadArguments", "No Y-values to render");

      // ADDITION:
      if (this.curvedir) {
        params.direction = (this.curvedir === 'above') ? -1 : 1;
        console.log(params.direction);
      }

      var ctx = this.context;
      var cp1 = this.render_options.cp1;
      var cp2 = this.render_options.cp2;

      if (Math.abs(params.last_x_px - params.first_x_px) < 10) {
        cp1 = 2; cp2 = 8;
      }

      var first_x_shift = this.render_options.first_x_shift;
      var last_x_shift = this.render_options.last_x_shift;
      var y_shift = this.render_options.y_shift * params.direction;

      for (var i = 0; i < this.first_indices.length; ++i) {
        var cp_x = ((params.last_x_px + last_x_shift) +
                    (params.first_x_px + first_x_shift)) / 2;
        var first_y_px = params.first_ys[this.first_indices[i]] + y_shift;
        var last_y_px = params.last_ys[this.last_indices[i]] + y_shift;

        if (isNaN(first_y_px) || isNaN(last_y_px))
          throw new Vex.RERR("BadArguments", "Bad indices for tie rendering.");

        var top_cp_y = ((first_y_px + last_y_px) / 2) + (cp1 * params.direction);
        var bottom_cp_y = ((first_y_px + last_y_px) / 2) + (cp2 * params.direction);

        ctx.beginPath();
        ctx.moveTo(params.first_x_px + first_x_shift, first_y_px);
        ctx.quadraticCurveTo(cp_x, top_cp_y,
                             params.last_x_px + last_x_shift, last_y_px);
        ctx.quadraticCurveTo(cp_x, bottom_cp_y,
                             params.first_x_px + first_x_shift, first_y_px);

        ctx.closePath();
        ctx.fill();
      }

    },

    renderText: function(first_x_px, last_x_px) {
      if (!this.text) return;
      var center_x = (first_x_px + last_x_px) / 2;
      center_x -= this.context.measureText(this.text).width / 2;

      this.context.save();
      this.context.setFont(this.font.family, this.font.size, this.font.style);
      this.context.fillText(
          this.text, center_x + this.render_options.text_shift_x,
          (this.first_note || this.last_note).getStave().getYForTopText() - 1);
      this.context.restore();
    },

    draw: function() {
      if (!this.context)
        throw new Vex.RERR("NoContext", "No context to render tie.");
      var first_note = this.first_note;
      var last_note = this.last_note;
      var first_x_px, last_x_px, first_ys, last_ys, stem_direction;

      if (first_note) {
        first_x_px = first_note.getTieRightX() + this.render_options.tie_spacing;
        stem_direction = first_note.getStemDirection();
        first_ys = first_note.getYs();
      } else {
        first_x_px = last_note.getStave().getTieStartX();
        first_ys = last_note.getYs();
        this.first_indices = this.last_indices;
      }

      if (last_note) {
        last_x_px = last_note.getTieLeftX() + this.render_options.tie_spacing;
        stem_direction = last_note.getStemDirection();
        last_ys = last_note.getYs();
      } else {
        last_x_px = first_note.getStave().getTieEndX();
        last_ys = first_note.getYs();
        this.last_indices = this.first_indices;
      }

      this.renderTie({
        first_x_px: first_x_px,
        last_x_px: last_x_px,
        first_ys: first_ys,
        last_ys: last_ys,
        direction: stem_direction
      });

      this.renderText(first_x_px, last_x_px);
      return true;
    }
  };

  return StaveTie;
}());
