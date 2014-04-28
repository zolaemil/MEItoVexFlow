/**
 * @class MEI2VF
 */
var MEI2VF = ( function(m2v, VF, $, undefined) {

    /**
     * @property {Boolean} DO_LOG specifies if logging is enabled or disabled.
     * Defaults to false. Use {@link MEI2VF#setLogging setLogging()} to change
     * the value.
     * @private
     */
    m2v.DO_LOG = false;

    /**
     * @method setLogging enables or disables MEI2VF logging
     * @param {Boolean} value
     */
    m2v.setLogging = function(value) {
      m2v.DO_LOG = value;
    };

    /**
     * @method L the internal MEI2VF logging function. Passes the function
     * arguments to VexFlow's Vex.L function if {@link #DO_LOG} is `true`
     * @private
     */
    m2v.L = function() {
      if (m2v.DO_LOG)
        Vex.L("MEItoVexFlow", arguments);
    };

    /**
     * @class MEI2VF.RUNTIME_ERROR
     * @private
     *
     * @constructor
     * @param {String} error_code
     * @param {String} message
     */
    m2v.RUNTIME_ERROR = function(error_code, message) {
      this.error_code = error_code;
      this.message = message;
    };

    /**
     * @method
     * @return {String} the string representation of the error
     */
    m2v.RUNTIME_ERROR.prototype.toString = function() {
      return "MEI2VF.RUNTIME_ERROR: " + this.error_code + ': ' + this.message;
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
