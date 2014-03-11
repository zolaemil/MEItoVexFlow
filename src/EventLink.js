/* 
* EventLink.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 04.07.2013
* 
* Represents a link between two MEI events. The link is represented by two references: 
*  1. reference to start event, 
*  2. reference to end event.
* 
* 
* Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
* University of Maryland
* 
* Licensed under the Apache License, Version 2.0 (the "License"); you
* may not use this file except in compliance with the License.  You may
* obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
* implied.  See the License for the specific language governing
* permissions and limitations under the License.
*/

MEI2VF = (function(m2v) {
  
  m2v.EventLink = function(first_id, last_id) {
    this.init(first_id, last_id);
  }
  
  m2v.EventLink.prototype.init = function(first_id, last_id) {
    this.first_ref = new m2v.EventReference(first_id);
    this.last_ref = new m2v.EventReference(last_id);
    this.params = {};
  }
  /**
   * @param params is an object. for ties and slurs { linkCond } to indicate the linking condition when 
   *               parsing from attributes (pitch name for ties, nesting level for slurs); for hairpins
   *               params it is an object { place, form }
   */
  m2v.EventLink.prototype.setParams = function (params) {
    this.params = params;
  }
  
  m2v.EventLink.prototype.setFirstRef = function (first_ref) {
    this.first_ref = first_ref;
  }
  
  m2v.EventLink.prototype.setLastRef = function (last_ref) {
    this.last_ref = last_ref;
  }
  
  m2v.EventLink.prototype.setFirstId = function(id) {
    this.first_ref.setId(id);
  }
  
  m2v.EventLink.prototype.setLastId = function(id) {
    this.last_ref.setId(id);
  }
  
  m2v.EventLink.prototype.setFirstTStamp = function (tstamp) {
    this.first_ref.setTStamp(tstamp);
  }
  
  m2v.EventLink.prototype.setLastTStamp = function (tstamp2) {
    this.last_ref.setTStamp(tstamp2);
  }
  
  m2v.EventLink.prototype.setContext = function(meicontext) {
    this.meicontext = meicontext;
  }
  
  m2v.EventLink.prototype.getFirstId = function () {
      return this.first_ref.getId( { meicontext:this.meicontext } );  
  }
  
  m2v.EventLink.prototype.getLastId = function () {
      return this.last_ref.getId( { meicontext:this.meicontext } );
  }
  
  return m2v;

}(MEI2VF || {}));  

