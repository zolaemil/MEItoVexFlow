/*
 * StaveVoices.js Author: Zoltan Komives (zolaemil@gmail.com) Created:
 * 25.07.2013
 *
 * Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
 * University of Maryland
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @class MEI2VF.StaffVoice
     * @private
     *
     * @constructor
     * @param {Object} voice
     * @param {Object} staff_n
     */
    m2v.StaffVoice = function(voice, staff_n) {
      this.voice = voice;
      this.staff_n = staff_n;
    };

    /**
     * @class MEI2VF.StaveVoices
     * Stores all voices in a given measure along with the respective staff id.
     * Passes all voices to Vex.Flow.Formatter and calls joinVoices, then draws
     * all voices.
     * @private
     *
     * @constructor
     */
    m2v.StaveVoices = function() {
      this.all_voices = [];
    };

    m2v.StaveVoices.prototype = {
      addStaffVoice : function(staffVoice) {
        this.all_voices.push(staffVoice);
      },

      addVoice : function(voice, staff_n) {
        this.addStaffVoice(new m2v.StaffVoice(voice, staff_n));
      },

      // no more in use
      reset : function() {
        this.all_voices = [];
      },

      // TODO store them staffwise instead of extracting information at this point!?
      /**
       *
       * @param {Object} staff a staff in the current measure used to set
       * the x dimensions of the voice
       */
      format : function(staff) {
        var all, vexVoices, vexVoicesStaffWise, staff_n, i, f;
        all = this.all_voices;
        vexVoices = [];
        vexVoicesStaffWise = {};
        i = all.length;
        while (i--) {
          vexVoices.push(all[i].voice);
          staff_n = all[i].staff_n;
          if (vexVoicesStaffWise[staff_n]) {
            vexVoicesStaffWise[staff_n].push(all[i].voice);
          } else {
            vexVoicesStaffWise[staff_n] = [all[i].voice];
          }
        }
        f = new VF.Formatter();
        for (i in vexVoicesStaffWise) {
          f.joinVoices(vexVoicesStaffWise[i]);
        }
        f.formatToStave(vexVoices, staff);
        // f.format(vexVoices, width);
        // new VF.Formatter().joinVoices(voices).format(voices, width,
        // {align_rests: true});
      },

      draw : function(context, staves) {
        var i, staffVoice, all_voices = this.all_voices;
        for ( i = 0; i < all_voices.length; ++i) {
          staffVoice = all_voices[i];
          staffVoice.voice.draw(context, staves[staffVoice.staff_n]);
        }
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
