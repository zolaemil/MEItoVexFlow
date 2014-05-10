/*
 * StaveConnector.js Author: Zoltan Komives (zolaemil@gmail.com) Created:
 * 24.07.2013
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

var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {

    /**
     * @class MEI2VF.Connectors
     * Handles stave connectors
     * @private
     *
     * @constructor
     * @param {Object} config the config object
     */
    m2v.Connectors = function(config) {
      var me = this;
      me.allVexConnectors = [];
      if (config) {
        me.init(config);
      }
    };

    m2v.Connectors.prototype = {

      vexTypes : {
        'line' : VF.StaveConnector.type.SINGLE_LEFT,
        'brace' : VF.StaveConnector.type.BRACE,
        'bracket' : VF.StaveConnector.type.BRACKET,
        'none' : null,
        'singleright' : VF.StaveConnector.type.SINGLE_RIGHT
      },

      vexTypesBarlineRight : {
        'single' : VF.StaveConnector.type.SINGLE_RIGHT,
        'dbl' : VF.StaveConnector.type.THIN_DOUBLE,
        'end' : VF.StaveConnector.type.BOLD_DOUBLE_RIGHT,
        'rptend' : VF.StaveConnector.type.BOLD_DOUBLE_RIGHT,
        'invis' : null
      },

      vexTypesBarlineLeft : {
        'single' : VF.StaveConnector.type.SINGLE_LEFT,
        'dbl' : VF.StaveConnector.type.THIN_DOUBLE,
        'end' : VF.StaveConnector.type.BOLD_DOUBLE_LEFT,
        'rptstart' : VF.StaveConnector.type.BOLD_DOUBLE_LEFT,
        'invis' : null
      },

      init : function(config) {
        var me = this, vexType, top_staff, bottom_staff, vexConnector, label, labelMode;
        var models = config.models;
        var staffs = config.staffs;
        var barline_l = config.barline_l;
        var barline_r = config.barline_r;
        var system_n = config.system_n;
        labelMode = config.labelMode;

        $.each(models, function() {

          vexType = (barline_r) ? me.vexTypesBarlineRight[barline_r] : me.vexTypes[this.symbol];
          top_staff = staffs[this.top_staff_n];
          bottom_staff = staffs[this.bottom_staff_n];

          if ( typeof vexType === 'number' && top_staff && bottom_staff) {
            vexConnector = new VF.StaveConnector(top_staff, bottom_staff);
            vexConnector.setType(vexType);
            me.allVexConnectors.push(vexConnector);
            if (labelMode === 'full') {
              label = (system_n === 1) ? this.label : this.labelAbbr;
            } else if (labelMode === 'abbr') {
              label = this.labelAbbr;
            }
            if (label)
              vexConnector.setText(label);
          }

          if (barline_l) {
            vexType = me.vexTypesBarlineLeft[barline_l];
            if ( typeof vexType === 'number' && top_staff && bottom_staff) {
              vexConnector = new VF.StaveConnector(top_staff, bottom_staff);
              vexConnector.setType(vexType);
              if (vexType === VF.StaveConnector.type.BOLD_DOUBLE_LEFT) {
                vexConnector.checkShift = true;
              }
              me.allVexConnectors.push(vexConnector);
            }
          }

        });
      },

      getAll : function() {
        return this.allVexConnectors;
      },

      setContext : function(ctx) {
        this.ctx = ctx;
        return this;
      },

      draw : function() {
        var me = this, i, j, conn, shift;
        for ( i = 0, j = me.allVexConnectors.length; i < j; i += 1) {
          conn = me.allVexConnectors[i];
          if (conn.checkShift) {
            shift = conn.top_stave.getModifierXShift();
            if (shift > 0) {
              conn.setXShift(shift);
            }
          }
          conn.setContext(me.ctx).draw();
        }
      }
    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
