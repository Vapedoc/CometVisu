/* Slide.js 
 * 
 * copyright (c) 2010-2016, Christian Mayer and the CometVisu contributers.
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 */


/**
 * Adds a horizontal slider to the visu. This can be used, for example, to dim a light or change temperature values.
 *
 * @require(qx.module.Attribute,qx.module.Css,qx.module.Traversing,qx.module.Manipulating,qx.module.event.Keyboard)
 * @author Christian Mayer
 * @since 2012
 */
qx.Class.define('cv.structure.pure.Slide', {
  extend: cv.structure.AbstractWidget,
  include: [cv.role.Operate, cv.role.Update],

  /*
  ******************************************************
    CONSTRUCTOR
  ******************************************************
  */
  construct: function(props) {
    this.base(arguments, props);
    // check provided address-items for at least one address which has write-access
    var readonly = true;
    for (var addrIdx in this.getAddress()) {
      if (this.getAddress()[addrIdx][1] & 2) {
        // write-access detected --> no read-only mode
        readonly = false;
        break;
      }
    }
    this.__readonly = readonly;

    // initialize value with min value
    this.setValue(this.applyMapping(this.getMin()));
  },


  /*
  ******************************************************
    PROPERTIES
  ******************************************************
  */
  properties: {
    min: {
      check: "Number",
      init: 0
    },
    max: {
      check: "Number",
      init: 100
    },
    step: {
      check: "Number",
      init: 0.5
    },
    sendOnFinish: {
      check: "Boolean",
      init: false
    },
    inAction: {
      check: "Boolean",
      init: false
    }
  },

  /*
  ******************************************************
    MEMBERS
  ******************************************************
  */
  members: {
    __main: null,
    __timerId: null,
    __slider : null,
    __readonly: null,
    __initialized: null,
    __skipUpdatesFromSlider: null,

    // overridden
    _onDomReady: function() {
      this.base(arguments);
      if (!this.__initialized) {
        var actor = this.getActor();
        var slider = this.__slider = new cv.ui.website.Slider(actor);
        slider.setFormat(this.getFormat());
        slider.setConfig("step", this.getStep());
        slider.setConfig("minimum", this.getMin());
        slider.setConfig("maximum", this.getMax());
        // set initial value
        slider.setValue(parseFloat(this.getValue()));

        if (this.__readonly) {
          slider.setEnabled(false);
        }
        slider.init();

        // defer setting the listener to prevent sending values during initialization
        new qx.util.DeferredCall(function () {
          slider.on("changeValue", qx.util.Function.debounce(this._onChangeValue, 250, true), this);
        }, this).schedule();

        this.addListener("changeValue", function (ev) {
          slider.setValue(parseFloat(ev.getData()));
        }, this);

        // add CSS classes for compability with old sliders
        slider.addClasses(["ui-slider", "ui-slider-horizontal", "ui-widget", "ui-widget-content", "ui-corner-all"]);
        var knob = slider.find(".qx-slider-knob");
        knob.addClasses(["ui-slider-handle", "ui-state-default", "ui-corner-all"]);
        this.__initialized = true;

        this.addListener("changeVisible", function (ev) {
          if (ev.getData() === true) {
            this.__updateSlider();
          }
        }, this);
        if (this.isVisible()) {
          this.__updateSlider();
        }
      }
    },

    /**
     * Refresh the slider position
     */
    __updateSlider: function() {
      if (this.__slider) {
        this.__skipUpdatesFromSlider = true;
        this.__slider.updatePositions();
        this.__skipUpdatesFromSlider = false;
      }
    },

    // overridden
    _getInnerDomString: function () {
      return '<div class="actor"></div>';
    },

    _update: function (ga, d) {
      if (this.getInAction() || d === undefined) {
        return;
      }
      var value = this.applyTransform(ga, d);

      try {
        if (this.getValue() !== value) {
          this.setValue(value);
          this.__skipUpdatesFromSlider = true;
          if (this.__slider) {
            this.__slider.setValue(value);
          }
          this.__skipUpdatesFromSlider = false;
        }
      } catch(e) {
        this.error(e);
      }
    },

    /**
     * Handle incoming value changes send by the slider widget (e.g. triggered by user interaction)
     * @param value {Number}
     * @private
     */
    _onChangeValue: function(value) {
      if (!this.__initialized || this.__skipUpdatesFromSlider === true) { return; }
      if (this.isSendOnFinish() === false || this.__slider.isInPointerMove()) {
        var currentValue = this.getValue();
        this.sendToBackend(value, function(addr) {
          var newValue = cv.Transform.encode(addr[0], value);
          return !isNaN(newValue) && newValue !== cv.Transform.encode(addr[0], currentValue);
        });
      }
      this.setValue(value);
    },

    /**
     * Get the value that should be send to backend after the action has been triggered
     */
    getActionValue: function () {
      return "";
    }
  },

  defer: function(statics) {
    cv.structure.WidgetFactory.registerClass("slide", statics);
  }
});
