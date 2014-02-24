(function () {

    'use strict';

    var selectionMode = {
        none: 0,
        single: 1,
        multi: 2
    };

    var SwipeBehaviorState = {
        started: 0,
        dragging: 1,
        selecting: 2,
        selectSpeedBumping: 3,
        speedBumping: 4,
        rearranging: 5,
        completed: 6,
        selected: function (state) {
            return state === this.selecting || state === this.selectSpeedBumping;
        }
    };

    var SelectableList = WinJS.Class.mix(

        WinJS.Class.define(function (element) {
            //Follow WinJS.UI Object patterns
            this._element = element;
            this._$element = $(element);
            this._element.winControl = this;

            //Default property values
            //These must be set before render
            this.isSemanticZoomable = false;
            this.isZoomedOutSortable = false;
            this.isZoomedInSortable = false;
            this.useCrossSlide = true;
            //These can be set after render and will affect the List's behavior
            this.disableSemanticZoom = false;
            this.useGridLayout = true;
            this.useZoomedInForListLayout = true;
            this.isZoomedOut = false;
            this.isUpdateLayoutRequired = true;
            this.useItemDataAttachment = false;
            this.itemSelectionMode = selectionMode.none;
            this.groupSelectionMode = selectionMode.none;

            // Store Parent Container
            this._$elementParent = $(this._element.parentNode);

            //Default Styles
            this._element.style.position = "relative";

            // Initialize the gesture recognizer.
            this._gr = this._createGestureRecognizer();
            this._$selectedItem = $(null);

            // Initialize the ms gesture.
            this._msgesture = new MSGesture();


            return this;
        },
        {
            _listGroupClass: "list-group",
            _listGroupPrefix: "listGroup",
            _listGroupItemContainerClass: "list-group-items",
            _listGroupItemClass: "list-group-item",
            _selectedClass: "selected",
            _almostSelectedClass: "almost-selected",
            _semanticZoomClass: "semanticZoom",
            _noSemanticZoomClass: "noSemanticZoom",
            _zoomedInListClass: "zoomedInList",
            _zoomedOutListClass: "zoomedOutList",
            _semanticControlClass: "semantic-zoom-control",
            _zoomDisabledClass: "zoom-disabled",
            _selectableClass: "selectable",
            _sortingClass: "sorting",
            _hiddenClass: "hidden",
            _emptyClass: "empty",
            _renderedClass: "rendered",
            _listLayoutClass: "listLayout",
            _dataKeyAttribute: "data-key",
            _zoomFactor: 1,
            _thresholds: {
                rearrangeStart: WinJS.UI._VERTICAL_SWIPE_SELECTION_THRESHOLD + 301,
                selectionStart: WinJS.UI._VERTICAL_SWIPE_SELECTION_THRESHOLD,
                speedBumpStart: WinJS.UI._VERTICAL_SWIPE_SELECTION_THRESHOLD + 1,
                speedBumpEnd: WinJS.UI._VERTICAL_SWIPE_SELECTION_THRESHOLD + 240
            },
            _createGestureRecognizer: function () {
                var gr = new Windows.UI.Input.GestureRecognizer();

                // Turn off visual feedback for gestures.
                // Visual feedback for pointer input is still displayed. 
                gr.showGestureFeedback = false;
                gr.crossSlideHorizontally = false;
                gr.crossSlideThresholds = this._thresholds;
                gr.crossSlideExact = true;
                gr.inertiaExpansionDeceleration = 10;

                gr.gestureSettings =
                    Windows.UI.Input.GestureSettings.tap |
                    Windows.UI.Input.GestureSettings.hold |
                    Windows.UI.Input.GestureSettings.rightTap |
                    Windows.UI.Input.GestureSettings.crossSlide |
                    Windows.UI.Input.GestureSettings.manipulationScale;

                //Register event listeners for these gestures.
                gr.addEventListener("tapped", this._tappedHandler.bind(this));
                gr.addEventListener("righttapped", this._rightTappedHandler.bind(this));
                gr.addEventListener("crosssliding", this._crossSlide.bind(this));
                gr.addEventListener("holding", this._holding.bind(this));
                //gr.addEventListener("manipulationstarted", this._manipulation.bind(this));
                //gr.addEventListener("manipulationupdated", this._manipulation.bind(this));
                //gr.addEventListener("manipulationcompleted", this._manipulation.bind(this));

                //if (this.isSemanticZoomable) {
                this._createExtraSemanticZoomEvents();
                //}

                return gr;
            },
            createBaseGestureEvents: function() {

                // Fragment Wrapper
                var fragment = this._$element.closest(".fragment")[0] || this._$element[0];

                // MS Pointer Events
                fragment.addEventListener("MSPointerDown", this._pointerDown.bind(this), false);
                fragment.addEventListener("MSPointerMove", this._processMove.bind(this), false);
                fragment.addEventListener("MSPointerUp", this._processUp.bind(this), false);
                fragment.addEventListener("MSPointerCancel", this._processCancel.bind(this), false);
                fragment.addEventListener("contextmenu", this._preventContextMenu.bind(this), false);
                fragment.addEventListener("MSHoldVisual", function (e) { e.preventDefault(); }, false);

                // MsGesture Specific Events
                this._msgesture.target = fragment;
                fragment.addEventListener("MSGestureStart", this._gestureStart.bind(this), false);
                fragment.addEventListener("MSGestureChange", this._gestureChange.bind(this), false);
                fragment.addEventListener("MSGestureEnd", this._processOut.bind(this), false);
            },
            _getTileElmByChildSrc: function (element) {
                //FIXME make sure the sub element is clicked on - not padding/margin/unused space
                while (!WinJS.Utilities.hasClass(element, this.isZoomedOut ? this._listGroupClass : this._listGroupItemClass)) {
                    element = element.parentNode;
                    if (!element || WinJS.Utilities.hasClass(element, "fragment")) return null;
                }
                return element;
            },
            _pointerDown: function (evt) {
                // No need to support mutli-touch
                // Complete last pointer down event
                this._gr.completeGesture();
                this._processLost();

                // Get the current PointerPoint
                var pp = Windows.UI.Input.PointerPoint.getCurrentPoint(evt.pointerId);

                // Feed the PointerPoint to GestureRecognizer
                this._gr.processDownEvent(pp);
                this._msgesture.target = evt.currentTarget;
                this._msgesture.addPointer(evt.pointerId);

                //Gesture event locals
                this._originalY = evt.pageY;
                this._$selectedItem = $(this._getTileElmByChildSrc(evt.target));

                //On Touch Event, set flip distance based on pointer type (2 === mouse click)
                evt.pointerType == "touch" ? this._flipDistance = 4000 : this._flipDistance = 1;

                //We have to make sure that an element is `sortable` before we can call that method
                var sortableEl = $(this._zoomedOutList);
                if (sortableEl.hasClass("ui-sortable")) {
                    sortableEl.sortable("option", "distance", this._flipDistance);
                }

                if (this._$selectedItem.length != 0) {
                	//Tranform to down state
                	if (!this.isZoomedOut && this.itemInvoked) {
                		this._$selectedItem.css("transform", "scale3d(0.975, 0.975, 0.975)");
                	}
                    this._selectedIndex = this._$selectedItem.index();
                    this._selectionOccurred = false;
                }
                else { //gesture not needed
                    this._gr.completeGesture();
                }
                //Reset for Pinch/Zoom Gesture
                this._zoomFactor = 1;
                evt.stopImmediatePropagation();
            },
            _processMove: function (evt) {
                // Get intermediate PointerPoints
                var pps = Windows.UI.Input.PointerPoint.getIntermediatePoints(evt.pointerId);

                // processMoveEvents takes an array of intermediate PointerPoints
                this._gr.processMoveEvents(pps);
                evt.stopImmediatePropagation();
            },
            _processUp: function (evt) {
                // Get the current PointerPoint
                var pp = Windows.UI.Input.PointerPoint.getCurrentPoint(evt.pointerId);

                // Feed GestureRecognizer
                if (!pp.isInContact) {
                    this._gr.processUpEvent(pp);
                }
                this._processLost();
                evt.stopImmediatePropagation();
            },
            _processCancel: function (evt) {
                this._gr.completeGesture();
                this._processLost();
                evt.stopImmediatePropagation();
            },
            _processLost: function (evt) {
                //Tranform to Up state
                if (this._$selectedItem.length != 0) {
                    this._$selectedItem.css("transform", "scale3d(1,1,1)").removeClass(this._almostSelectedClass);
                    this._$selectedItem.children().css("transform", "translate3d(0,0,0)");
                }
            },
            _processOut: function (evt) {
                this._$selectedItem.css("transform", "scale3d(1,1,1)").removeClass(this._almostSelectedClass);
                this._$selectedItem.children().css("transform", "translate3d(0,0,0)");
                var GR = this._gr;
                setTimeout(function () {
                    GR.completeGesture()
                }, 200);
                evt.stopImmediatePropagation();
            },
            _preventContextMenu: function (evt) {
                var clickedOnListItem = this._$selectedItem.length == 1;
                if (this._isCurrentListSelectable() && clickedOnListItem) {
                    evt.preventDefault();
                }
            },
            _isCurrentListSelectable: function() {
                return (this.isZoomedOut && this.groupSelectionMode !== selectionMode.none)
                    || (!this.isZoomedOut && this.itemSelectionMode !== selectionMode.none);
            },
            _manipulation: function (e) {
                if (this.isSemanticZoomable && !this.disableSemanticZoom && e.type === "manipulationupdated") {
                    this._zoomFactor = e.cumulative.scale;// * this._zoomFactor;
                    //trigger logic for zoom in/out based on scale value
                    if (!this.isZoomedOut && this._zoomFactor < .75) {
                        this.semanticZoomOut();
                    } else if (this.isZoomedOut && this._zoomFactor > 1.25) {
                        this._tappedHandler(e, true);
                    } else {
                        //if we want... make it scale a little bit in or out
                    }
                } else if (e.type === "manipulationupdated") {
                    this._gr.completeGesture();
                }
                
            },
            _gestureStart: function (e) {
            },
            _gestureChange: function(e, continueZoom) {
                if (this.isSemanticZoomable && !this.disableSemanticZoom && e.scale !== 1) {
                    this._gr.completeGesture();
                    this._zoomFactor = e.scale * this._zoomFactor;

                    //trigger logic for zoom in/out based on scale value
                    if (!this.isZoomedOut) {
                        if (this._zoomFactor > .75 && this._zoomFactor < 1.1) {
                            //this._element.querySelector(".zoomedInList").style.transform = "scale(" + this._zoomFactor + ")";//"scale3d(" + this._zoomFactor + "," + this._zoomFactor + "," + this._zoomFactor + ")";
                        } else if (this._zoomFactor <= .75) {
                            this._msgesture.stop();
                            this.semanticZoomOut();
                        }
                    } else {
                        if (this._zoomFactor < 1.25 && this._zoomFactor > .9) {
                            //this._element.querySelector(".zoomedInList").style.transform = "scale(" + this._zoomFactor + ")";//"scale3d(" + this._zoomFactor + "," + this._zoomFactor + "," + this._zoomFactor + ")";
                        } else if (this._zoomFactor >= 1.25) {
                            this._msgesture.stop();
                            this._tappedHandler(e, true);
                        }
                    }
                }
            },
            _tappedHandler: function (e, continueZoom) {
                if ((this.isZoomedOut && this.groupSelectionMode !== UI.SelectionMode.none && !this.isSorting
                        && $(this._zoomedOutList).children("." + this._listGroupClass + "." + this._selectedClass).length)
                    || (this.isZoomedOut && this.groupSelectionMode !== UI.SelectionMode.none && !this.isSorting
                        && $(this._zoomedOutList).children("." + this._listGroupClass + "." + this._selectedClass).length)) {
                    this._itemSelected(this._$selectedItem);
                    return;
                }
                if (!this.disableSemanticZoom && this.isZoomedOut) {
                    if (this._selectedIndex > -1) {
                        this.invokeZoomedOutGroup(e, this._$selectedItem);
                        return;
                    }
                    //if (continueZoom) {
                    //    this.invokeZoomedOutGroup(e, target);
                    //}
                } else if ((!this.isSemanticZoomable || !this.isZoomedOut) && this.itemInvoked) {
                    if (this._selectedIndex > -1) {
                        this.itemInvoked(e, this._$selectedItem);
                        return false;
                    }
                }
            },
            _crossSlide: function (evt) {
                if (!(this.isZoomedOut && this.groupSelectionMode !== selectionMode.none) 
                    && !(!this.isZoomedOut && this.itemSelectionMode !== selectionMode.none)) {
                    return false;
                }
                var sortableEl;
                var self = this;
                //Animate child tile container to keep reordering position consistent
                if (evt.crossSlidingState !== SwipeBehaviorState.completed && evt.crossSlidingState !== SwipeBehaviorState.rearranging) {
                    var moveY = parseInt(Math.round(evt.position.y)) - parseInt(this._originalY);
                    this._$selectedItem.css({
                        "transform": "scale3d(1,1,1)",
                        "z-index": 1000
                    });
                    this._$selectedItem.children().css("transform", "translate3d(0," + moveY + "px,0)");
                }

                //Handle Cross Sliding States
                switch (evt.crossSlidingState) {
                    case SwipeBehaviorState.completed:
                        self._itemAlmostSelected(self._$selectedItem, false);
                        if (self._selectionOccurred) {
                            self._rightTappedHandler(evt);
                        }
                        var elementToAnimate = this._$selectedItem.children()[0],
                            elementToAnimatePrevStyle = elementToAnimate.style.transform;
                        this._$selectedItem.css("z-index", 0);
                        elementToAnimate.style.transform = "translate3d(0,0,0)";
                        WinJS.UI.executeAnimation(elementToAnimate, [{
                            property: "transform",
                            delay: 0,
                            duration: 450,
                            timing: "cubic-bezier(0.1, 0.99, 0.2, 1)",
                            from: elementToAnimatePrevStyle,
                            to: elementToAnimate.style.transform
                        }]).done(function () {
                            WinJS.Application.queueEvent({ type: "SelectableList.crossSlide.completed" });
                        });
                        break;

                    case SwipeBehaviorState.rearranging:
                        if (this._selectionOccurred) {
                            this._selectionOccurred = false;
                            this._itemAlmostSelected(this._$selectedItem, false);
                            this._$selectedItem.children().css({ "transform": "translate3d(0,0,0)" });

                            if (this.isZoomedOut && this.groupSelectionMode !== selectionMode.none) {
                                var sortableEl = $(this._zoomedOutList);
                            } else if (!this.isZoomedOut && this.itemSelectionMode !== selectionMode.none) {
                                var sortableEl = $(this._zoomedInList);
                            }

                            if ($(sortableEl).hasClass("ui-sortable")) {
                                sortableEl.sortable("option", "distance", 0);
                            }
                        }
                        break;

                    case SwipeBehaviorState.dragging:
                        if (this._selectionOccurred) {
                            this._selectionOccurred = false;
                            this._itemAlmostSelected(this._$selectedItem, false);
                        }
                        break;

                    case SwipeBehaviorState.selectSpeedBumping:
                        if (!this._selectionOccurred) {
                            this._selectionOccurred = true;
                            this._itemAlmostSelected(this._$selectedItem, true);
                        }
                        break;
                }
            },
            _holding: function (evt) {
                this._itemAlmostSelected(this._$selectedItem, true);
            },
            _rightTappedHandler: function (evt) {
                if ((this.isZoomedOut && this.groupSelectionMode !== selectionMode.none)
                        || (!this.isZoomedOut && this.itemSelectionMode !== selectionMode.none)) {
                    this._itemSelected(this._$selectedItem);
                }
            },
            _dispatchEvent: function (name, options) {
                this.dispatchEvent(name, options);
            },
            _itemAlmostSelected: function (element, isAlmostSelect) {
                if (isAlmostSelect) {
                    element.addClass(this._almostSelectedClass);
                } else {
                    element.removeClass(this._almostSelectedClass);
                }
            },
            _itemSelected: function (element) {
                var wasSelected = element.hasClass(this._selectedClass);
                if (this.isZoomedOut && this.groupSelectionMode === UI.SelectionMode.single) {
                    $(this._zoomedOutList).children("." + this._listGroupClass).removeClass(this._selectedClass + " " + this._almostSelectedClass);
                } else if (!this.isZoomedOut && this.itemSelectionMode === UI.SelectionMode.single) {
                    $(this._zoomedInList).find("." + this._listGroupItemClass).removeClass(this._selectedClass + " " + this._almostSelectedClass);
                }
                element.removeClass(this._almostSelectedClass);
                if (wasSelected) {
                    element.removeClass(this._selectedClass);
                } else {
                    element.addClass(this._selectedClass);
                }
                
                this.onSelection ? this.onSelection(this.isZoomedOut ? $(this._zoomedOutList).children("." + this._listGroupClass + "." + this._selectedClass) : $(this._zoomedInList).find("." + this._listGroupItemClass + "." + this._selectedClass)) : "";
            },
            selectAll: function () {
                if (this.isZoomedOut && this.groupSelectionMode === selectionMode.multi && !this.isSorting) {
                    $(this._zoomedOutList).children("." + this._listGroupClass).addClass(this._selectedClass).removeClass(this._almostSelectedClass);
                    this.onSelection ? this.onSelection($(this._zoomedOutList).children("." + this._listGroupClass + "." + this._selectedClass)) : null;
                } else if (!this.isZoomedOut && this.itemSelectionMode === selectionMode.multi && !this.isSorting) {
                    $(this._zoomedInList).find("." + this._listGroupItemClass).addClass(this._selectedClass).removeClass(this._almostSelectedClass);
                    this.onSelection ? this.onSelection($(this._zoomedInList).find("." + this._listGroupItemClass + "." + this._selectedClass)) : null;
                }
            },
            deselectAll: function () {
                if (this.isZoomedOut && this.groupSelectionMode !== selectionMode.none && !this.isSorting) {
                    $(this._zoomedOutList).children("." + this._listGroupClass).removeClass(this._selectedClass + " " + this._almostSelectedClass);
                    this.onSelection ? this.onSelection($(this._zoomedOutList).children("." + this._listGroupClass + "." + this._selectedClass)) : null;
                } else if (!this.isZoomedOut && this.itemSelectionMode !== selectionMode.none && !this.isSorting) {
                    $(this._zoomedInList).find("." + this._listGroupItemClass).removeClass(this._selectedClass + " " + this._almostSelectedClass);
                    this.onSelection ? this.onSelection($(this._zoomedInList).find("." + this._listGroupItemClass + "." + this._selectedClass)) : null;
                }
            },
            render: function () {
                var self = this;
                return new WinJS.Promise(function (complete) {

                    //self.createBaseGestureEvents();

                    var zoomedInList = document.createElement("div"),
                        zoomedOutList = undefined,
                        data = self.dataSource || [],
                        groupsCompleted = 0,
                        zoomedOutGroupsCompleted = 0;

                    //Add classes/styles to appropriate DOM Elements
                    zoomedInList.className = self._zoomedInListClass + " " + (self.itemSelectionMode !== selectionMode.none ? self._selectableClass : "");
                    zoomedInList.style.opacity = 1;
                    zoomedInList.style.transform = "scale3d(1,1,1)";
                    zoomedInList.style.zIndex = 1;

                    if (self.isSemanticZoomable) {
                        zoomedOutList = document.createElement("div")
                        zoomedOutList.className = self._zoomedOutListClass + " " + (self.groupSelectionMode !== selectionMode.none ? self._selectableClass : "");
                        zoomedOutList.style.opacity = 0;
                        zoomedOutList.style.transform = "scale3d(1.2,1.2,1.2)";
                        zoomedOutList.style.zIndex = 0;

                        //Container element clean up or initialize if render fnc invoked more than once
                        !self._element.classList.contains(self._semanticZoomClass) ? self._element.classList.add(self._semanticZoomClass) : self._element.innerHTML = "";
                    } else {
                        !self._element.classList.contains(self._noSemanticZoomClass) ? self._element.classList.add(self._noSemanticZoomClass) : self._element.innerHTML = "";
                    }
                    
                    //loop over group items
                    for (var g = 0 ; g < data.length ; g++) {
                        var items = data[g].Items || [],
                            hasContent = !!items.length,
                            hideZoomedInGroup = data[g].Hidden === true || (typeof data[g].Hidden === "object" && data[g].Hidden.zoomedIn === true),
                            hideZoomedOutGroup = zoomedOutList && (data[g].Hidden === true || (typeof data[g].Hidden === "object" && data[g].Hidden.zoomedOut === true)),
                            number = "" + g;

                        //Rendering Zoomed In ListView
                        if (hasContent) {
                            self.headerTemplate.winControl.render(data[g]).done(function (elm) {
                                elm.className = self._listGroupClass + " " + (hideZoomedInGroup ? self._hiddenClass : "");
                                elm.setAttribute(self._dataKeyAttribute, data[g].GroupKey || data[g].GroupName);
                                MSApp.execUnsafeLocalFunction(function () {
                                	elm.innerHTML += '<div id="' + self._listGroupPrefix + number + '" class="' + self._listGroupItemContainerClass + '"></div>';
                                });
                                zoomedInList.appendChild(elm);
                                var groupedItems = elm.querySelector("#" + self._listGroupPrefix + number);
                                var currentItem = null;
                                //if any of the properties of the item is an array inject a new div
                                //Loop over items in each group
                                if (items.length === 0) {
                                    groupsCompleted++;
                                    if (groupsCompleted === data.length && (!self._isSemanticZoomable || zoomedOutGroupsCompleted === data.length)) {
                                        self.createBaseGestureEvents();
                                        complete();
                                    }
                                }
                                var itemsCompleted = 0;
                                for (var i = 0 ; i < items.length ; i++) {
                                    self.itemTemplate.winControl.render(items[i]).done(function (itemsElm) {
                                        itemsElm.className = self._listGroupItemClass;
                                        groupedItems.appendChild(itemsElm);
                                        currentItem = $(groupedItems).find(itemsElm);
                                        
                                        if (self.useItemDataAttachment) {
                                            currentItem.data(items[i]);
                                        }
                                        itemsCompleted++;
                                        if (itemsCompleted === items.length) {
                                        	groupsCompleted++;
                                        	if (groupsCompleted === data.length && (!self._isSemanticZoomable || zoomedOutGroupsCompleted === data.length)) {
                                        		self.createBaseGestureEvents();
                                        		complete();
                                        	}
                                        }
                                    });
                                }
                            });
                        } else {
                            groupsCompleted++;
                            if (groupsCompleted === data.length && (!self._isSemanticZoomable || zoomedOutGroupsCompleted === data.length)) {
                                self.createBaseGestureEvents();
                                complete();
                            }
                        }

                        //Rendering Zoomed Out List View
                        if (self.isSemanticZoomable) {
                            self.groupTemplate.winControl.render(data[g]).done(function (elm) {
                                elm.className = self._listGroupClass;
                                if (!hasContent) {
                                    elm.classList.add(self._emptyClass);
                                }
                                if (hideZoomedOutGroup) {
                                    elm.classList.add(self._hiddenClass);
                                }
                                elm.setAttribute(self._dataKeyAttribute, data[g].GroupKey || data[g].GroupName);
                                zoomedOutList.appendChild(elm);
                                zoomedOutGroupsCompleted++;
                                if (groupsCompleted === data.length && (!self._isSemanticZoomable || zoomedOutGroupsCompleted === data.length)) {
                                    self.createBaseGestureEvents();
                                    complete();
                                }
                            });
                        }
                    }

                    self._element.appendChild(zoomedInList);
                    if (self.isSemanticZoomable) {
                    	var control = document.createElement("div");
                    	control.className = self._semanticControlClass;
                    	zoomedInList.appendChild(control);
                        self._element.appendChild(zoomedOutList);

                        if (self.isZoomedOutSortable) {
                            self._sortable(zoomedOutList);
                        }
                    }

                    if (self.isZoomedInSortable) {
                        $(zoomedInList).find("." + self._listGroupClass).each(function (i, item) {
                            self._sortableZoomedIn(item);
                        });
                    }

                    self._zoomedInList = zoomedInList;
                    self._zoomedOutList = zoomedOutList;

                    self.updateLayout();

                    //completed promise
                    if (!data.length) {
                        self.createBaseGestureEvents();
                        complete();
                    }
                });
            },
            _sortableZoomedIn: function (container) {
                var self = this;
                var $sortContainer = $(container);
                var $children = $sortContainer.find("."+self._listGroupItemClass);

                $sortContainer.sortable({
                    scroll: true,
                    scrollSensitivity: 40,
                    scrollSpeed: 40,
                    containment: $sortContainer.closest("."+self._semanticZoomClass+", ."+self._noSemanticZoomClass),
                    delay: 0,
                    distance: 0,
                    revert: 180,
                    tolerance: "pointer",
                    items: "." + self._listGroupItemClass,
                    zIndex: 2000,
                    forcePlaceholderSize: true,
                    //placeholder: self._listGroupItemClass + "-placeholder",
                    activate: function (ev, ui) {//activate all columns listening
                    },
                    deactivate: function (ev, ui) {//deactivate all columns listening
                        $children.css("transform", "scale3d(1,1,1)");
                    },
                    start: function (ev, ui) {
                        $children.removeClass(self._selectedClass).css("transform", "scale3d(0.975, 0.95, 0.95)");
                        ui.item.css({
                            "transform": "scale3d(1,1,1) translate3d(0,0,0)",
                            "transition": "transform",
                            "z-index": "3000",
                            //"animation": "optimizer 1s 0 infinite" //does this trick windows to use a different animation layer effectively?
                        });
                        self._sortableIndex = ui.item.index();
                        $(container).css({ "z-index": "3000" });
                        $(this).css("z-index", 3000);
                        self.isSorting = true;
                        document.querySelector("section[role]").classList.add(self._sortingClass);
                        self._updateData = false;
                    },
                    stop: function (ev, ui) {
                        var newIndex = ui.item.index();
                        if (self._sortableIndex !== newIndex) {
                            //performance could be improved here if peformance is a problem at all
                            self.reorder(self._sortableIndex, newIndex);
                        }
                        //reset column z-index
                        $(this).css("z-index", 0);
                        $(container).css({ "z-index": "0" });
                        ui.item.css({
                            "z-index": "0",
                            //"animation": "none"
                        });
                        typeof (self.onSortingComplete) === "function" ? self.onSortingComplete(self._sortableIndex !== newIndex) : null;
                        self.isSorting = false;
                        document.querySelector("section[role]").classList.remove(self._sortingClass);
                    },
                    change: function (ev, ui) {
                    },
                    over: function (ev, ui) {
                    },
                    out: function (ev, ui) {//outgoing item
                    },
                    receive: function (ev, ui) {
                    },
                    remove: function (ev, ui) {
                    },
                    update: function (ev, ui) {
                    }
                }).disableSelection();
            },
            _sortable: function (container) {
                var self = this;
                var $sortContainer = $(container);
                var $children = $sortContainer.find("> ." + self._listGroupClass);
                
                $sortContainer.sortable({
                    scroll: true,
                    scrollSensitivity: 40,
                    scrollSpeed: 40,
                    containment: $sortContainer.closest("." + self._semanticZoomClass),
                    delay: 0,
                    distance: 0,
                    revert: 180,
                    tolerance: "pointer",
                    items: "> ." + self._listGroupClass,
                    zIndex: 2000,
                    forcePlaceholderSize: true,
                    //placeholder: self._listGroupClass + "-placeholder",
                    activate: function (ev, ui) {//activate all columns listening
                    },
                    deactivate: function (ev, ui) {//deactivate all columns listening
                        $children.css("transform", "scale3d(1,1,1)");
                    },
                    start: function (ev, ui) {
                        $children.removeClass(self._selectedClass).css("transform", "scale3d(0.975, 0.95, 0.95)");
                        ui.item.css({
                            "transform": "scale3d(1,1,1) translate3d(0,0,0)",
                            "transition": "transform",
                            "z-index": "3000",
                            //"animation": "optimizer 1s 0 infinite" //does this trick windows to use a different animation layer effectively?
                        });
                        self._sortableIndex = ui.item.index();
                        $(container).css({"z-index":"3000"});
                        $(this).css("z-index", 3000);
                        self.isSorting = true;
                        document.querySelector("section[role]").classList.add(self._sortingClass);
                        self._updateData = false;
                    },
                    stop: function (ev, ui) {
                        var newIndex = ui.item.index();
                        if (self._sortableIndex !== newIndex) {
                            //performance could be improved here if peformance is a problem at all
                            self.reorder(self._sortableIndex, newIndex);
                        }
                        //reset column z-index
                        $(this).css("z-index", 0);
                        $(container).css({ "z-index": "0" });
                        ui.item.css({
                            "z-index": "0",
                            //"animation": "none"
                        });
                        typeof (self.onSortingComplete) === "function" ? self.onSortingComplete(self._sortableIndex !== newIndex) : null;
                        self.isSorting = false;
                        document.querySelector("section[role]").classList.remove(self._sortingClass);
                    },
                    change: function (ev, ui) {
                    },
                    over: function (ev, ui) { 
                    },
                    out: function (ev, ui) {//outgoing item
                    },
                    receive: function (ev, ui) {
                    },
                    remove: function (ev, ui) {
                    },
                    update: function (ev, ui) {
                    }
                }).disableSelection();
            },
            reorder: function(oldIndex, newIndex) {
                var self = this;
                var zoomedIn,
                    zoomedInKids,
                    mover;
                self.dataSource.splice(newIndex, 0, self.dataSource.splice(oldIndex, 1)[0]);

                if (self.isSemanticZoomable && self.isZoomedOut) {
                    zoomedIn = $(self._zoomedInList);
                    zoomedInKids = zoomedIn.children("." + self._listGroupClass);
                    mover = zoomedInKids[oldIndex];
                    mover = $(mover).detach();
                    if (newIndex === zoomedInKids.length - 1) {
                        mover.appendTo(zoomedIn);
                    } else if (newIndex > oldIndex) {
                        mover.insertAfter(zoomedInKids[newIndex]);
                    } else {
                        mover.insertBefore(zoomedInKids[newIndex]);
                    }
                }
            },
            updateLayout: function () {
                var self = this,
                    zoomedIn = $(self._zoomedInList),
                    listGroups = zoomedIn.find("." + self._listGroupClass),
                    zoomedInWidthOriginal = zoomedIn.width(),
                    zoomedInWidth;

                self._element.classList[self.disableSemanticZoom ? "add" : "remove"](self._zoomDisabledClass);

                if (self.useGridLayout && self.isUpdateLayoutRequired) {
                    self._$element.removeClass(self._listLayoutClass);
                    zoomedInWidth = parseInt(zoomedIn.css("padding-left")) + parseInt(zoomedIn.css("padding-right"));

                    listGroups.each(function (i, item) {
                        var itemsContainer = $(item).find("." + self._listGroupItemContainerClass),
                            items = itemsContainer.find("." + self._listGroupItemClass),
                            numRows,
                            numColumns,
                            newWidth;

                        if (items.length) {
                            numRows = Math.floor(itemsContainer.height() / items.height());
                            numColumns = Math.ceil(items.length / numRows);
                            newWidth = numColumns * (parseInt(itemsContainer.css("column-width")) + parseInt(itemsContainer.css("column-gap")));
                            itemsContainer.width(newWidth);
                            zoomedInWidth = zoomedInWidth + $(item).width();
                        }
                    });
                    zoomedIn.width((zoomedInWidthOriginal > zoomedInWidth) ? zoomedInWidthOriginal : zoomedInWidth);
                } else if (self.useGridLayout) {
                    self._$element.removeClass(self._listLayoutClass);
                } else if (!self.useGridLayout) {
                    self._$element.addClass(self._listLayoutClass);
                    if (self.useZoomedInForListLayout) {
                        self._$element.find("." + self._listGroupItemContainerClass).width("auto");
                        zoomedIn.width("auto");
                    }
                    if (self.isSemanticZoomable) {
                        self[self.useZoomedInForListLayout ? "semanticZoomIn" : "semanticZoomOut"]();
                    }
                }
                
                self._element.classList.add("rendered");
                WinJS.Application.queueEvent({ type: "SelectableList.rendered" });
            },
            _createExtraSemanticZoomEvents: function () {
                this._$element.on("click", "."+this._semanticControlClass, this.semanticZoomOut.bind(this));
                this._element.addEventListener("keydown", this.handleKeyboardEvents.bind(this), false);
                this._element.addEventListener("mousewheel", this.handleMouseWheelEvents.bind(this), false);
            },
            invokeZoomedOutGroup: function (e, target) {
                var index = target.index();
                this.semanticZoomIn(index, e.clientX || e.position.x, e.clientY || e.position.y);
                this.groupInvoked ? this.groupInvoked(e, target) : null;
            },
            semanticZoomOut: function (index) {
                if (this.isSemanticZoomable && !this.isSemanticallyZoomingOut && !this.isSorting) {
                    var $zoomedOut = $(this._zoomedOutList),
                        zoomedIn = this._zoomedInList,
                        zoomedOut = this._zoomedOutList,
                        self = this;

                    this.isSemanticallyZoomingOut = true;

                    if (index >= 0 && index < $zoomedOut.find("." + self._listGroupClass).length) {
                        $zoomedOut.scrollLeft($zoomedOut.find("." + self._listGroupClass)[index].offsetLeft);
                    }

                    this.performSemanticZoomAnimation(zoomedIn, {
                        "transform": "scale3d(.8,.8,.8)",
                        "opacity": 0
                    }, {
                        "z-index": 0
                    }, false);
                    this.performSemanticZoomAnimation(zoomedOut, {
                        "transform": "scale3d(1,1,1)",
                        "opacity": 1
                    }, {
                        "z-index": 1
                    }, false, 200);

                    this.isZoomedOut = true;
                }
            },
            semanticZoomIn: function (index, horizontalOffset, verticalOffset) {
                if (this.isSemanticZoomable && !this.isSemanticallyZoomingIn && !this.isSorting) {
                    var $zoomedIn = $(this._zoomedInList),
                        zoomedIn = this._zoomedInList,
                        zoomedOut = this._zoomedOutList,
                        self = this;
                    this.deselectAll();
                    this.isSemanticallyZoomingIn = true;

                    //If index is specifed, scroll zoomedInList to correct group
                    if (index >= 0 && index < $zoomedIn.find("." + self._listGroupClass).length) {
                        //If no horizontal offset specified or whole group would not be visible with it, simply left align with header
                        if (horizontalOffset && ($zoomedIn.find("." + self._listGroupClass)[index].scrollWidth <= ($(window).width() - horizontalOffset))) {
                            horizontalOffset = horizontalOffset - parseInt($zoomedIn.css("padding-left"));
                        } else {
                            horizontalOffset = parseInt($zoomedIn.css("padding-left"));
                        }
                        $zoomedIn.scrollLeft($zoomedIn.find("." + self._listGroupClass)[index].offsetLeft - horizontalOffset);
                    }

                    this.performSemanticZoomAnimation(zoomedIn, {
                        "transform": "scale3d(1,1,1)",
                        "opacity": 1
                    }, {
                        "z-index": 1
                    }, true);
                    this.performSemanticZoomAnimation(zoomedOut, {
                        "transform": "scale3d(1.2,1.2,1.2)",
                        "opacity": 0
                    }, {
                        "z-index": 0
                    }, true);

                    this.isZoomedOut = false;
                }
            },
            performSemanticZoomAnimation: function (element, options, postOptions, isIn) {
                var self = this;
                var animations = [];
                if (typeof postOptions === "boolean") {
                    isIn = postOptions;
                }

                for (var key in options) {
                    animations.push({
                        property: key,
                        delay: 5,
                        duration: 320,
                        timing: "ease-out",
                        from: element.style[key],
                        to: options[key]
                    });
                    element.style[key] = options[key];
                }

                WinJS.UI.executeAnimation(
                    element,
                    animations
                ).done(function () {
                    self['isSemanticallyZooming' + (isIn ? 'In' : 'Out')] = false;
                    if (postOptions) {
                        $(element).css(postOptions);
                    }
                });
            },
            handleKeyboardEvents: function (e) {
                if (!this.disableSemanticZoom && e.ctrlKey) {
                    if (e.which === 187) { //Ctrl + +
                        this.semanticZoomIn();
                    } else if (e.which === 189) { //Ctrl + -
                        this.semanticZoomOut();
                    }
                }
            },
            handleMouseWheelEvents: function(e) {
                if (!this.disableSemanticZoom && e.ctrlKey && !this.isSemanticallyZooming) {
                    if (e.wheelDelta > 0) { //Ctrl + Mousewheel scroll up
                        this.semanticZoomIn();
                    } else if (e.wheelDelta < 0) { //Ctrl + Mousewheel scroll down
                        this.semanticZoomOut();
                    }
                }
            },
            showAtIndex: function (index) {
                var self = this;
                if (index > -1 && index < self.dataSource.length) {
                    self.dataSource[index].Hidden = false;
                    $(self._zoomedOutList).children("." + self._listGroupClass)[index].classList.remove(self._hiddenClass);
                    $(self._zoomedInList).children("." + self._listGroupClass)[index].classList.remove(self._hiddenClass);
                }
            },
            hideAtIndex: function(index) {
                var self = this;
                if (index > -1 && index < self.dataSource.length) {
                    self.dataSource[index].Hidden = true;
                    $(self._zoomedOutList).children("." + self._listGroupClass)[index].classList.add(self._hiddenClass);
                    $(self._zoomedInList).children("." + self._listGroupClass)[index].classList.add(self._hiddenClass);
                }
            },
            dataSource: {
                get: function () {
                    return this._dataSource || [];
                },
                set: function (dataSource) {
                    if (typeof (dataSource) == "object")
                        this._dataSource = dataSource;
                }
            },
            headerTemplate: {
                get: function () {
                    return this._groupHeaderTemplate || {};
                },
                set: function (groupHeaderTemplate) {
                    this._groupHeaderTemplate = groupHeaderTemplate;
                }
            },
            groupTemplate: {
                get: function () {
                    return this._groupTemplate || {};
                },
                set: function (groupTemplate) {
                    this._groupTemplate = groupTemplate;
                }
            },
            itemTemplate: {
                get: function () {
                    return this._itemTemplate || {};
                },
                set: function (itemTemplate) {
                    this._itemTemplate = itemTemplate;
                }
            },
            itemSelectionMode: {
                get: function () {
                    return this._itemSelectionMode || 0;
                },
                set: function (itemSelectionMode) {
                    for (var p in selectionMode) {
                        if (selectionMode[p] === itemSelectionMode) {
                            this._itemSelectionMode = itemSelectionMode;
                            if (this._itemSelectionMode !== selectionMode.none && this._zoomedInList) {
                                this._zoomedInList.classList.add(self._selectableClass);
                            }
                            break;
                        }
                    }
                }
            },
            groupSelectionMode: {
                get: function () {
                    return this._groupSelectionMode || 0;
                },
                set: function (groupSelectionMode) {
                    for (var p in selectionMode) {
                        if (selectionMode[p] === groupSelectionMode) {
                            this._groupSelectionMode = groupSelectionMode;
                            if (this._groupSelectionMode !== selectionMode.none && this._zoomedOutList) {
                                this._zoomedOutList.classList.add(self._selectableClass);
                            }
                            break;
                        }
                    }
                }
            },
            isSemanticZoomable: {
                get: function () {
                    return this._isSemanticZoomable;
                },
                set: function (isSemanticZoomable) {
                    if (typeof (isSemanticZoomable) == "boolean")
                        this._isSemanticZoomable = isSemanticZoomable;
                }
            },
            disableSemanticZoom: {
                get: function () {
                    return this._disableSemanticZoom;
                },
                set: function (disableSemanticZoom) {
                    if (typeof (disableSemanticZoom) == "boolean")
                        this._disableSemanticZoom = disableSemanticZoom;
                }
            },
            useGridLayout: {
                get: function () {
                    return this._useGridLayout;
                },
                set: function (useGridLayout) {
                    if (typeof (useGridLayout) == "boolean")
                        this._useGridLayout = useGridLayout;
                }
            },
            useZoomedInForListLayout: {
                get: function () {
                    return this._useZoomedInForListLayout;
                },
                set: function (useZoomedInForListLayout) {
                    if (typeof (useZoomedInForListLayout) == "boolean")
                        this._useZoomedInForListLayout = useZoomedInForListLayout;
                }
            },
            useItemDataAttachment: {
                get: function () {
                    return this._useItemDataAttachment;
                },
                set: function (useItemDataAttachment) {
                    if (typeof (useItemDataAttachment) == "boolean")
                        this._useItemDataAttachment = useItemDataAttachment;
                }
            },
            isUpdateLayoutRequired: {
                get: function () {
                    return this._isUpdateLayoutRequired;
                },
                set: function (isUpdateLayoutRequired) {
                    if (typeof (isUpdateLayoutRequired) == "boolean")
                        this._isUpdateLayoutRequired = isUpdateLayoutRequired;
                }
            },
            useCrossSlide: {
                get: function () {
                    return this._isCrossSlidable;
                },
                set: function (isCrossSlidable) {
                    if (typeof (isCrossSlidable) == "boolean")
                        this._isCrossSlidable = isCrossSlidable;
                }
            },
            isRendered: {
                get: function () {
                    return !!this._isRendered;
                },
                set: function (isRendered) {
                    if (typeof (isRendered) == "boolean") {
                        this._isRendered = isRendered;
                        this._$element[isRendered ? "addClass" : "removeClass"](this._renderedClass);
                    }
                }
            }
        })
    );

    WinJS.Namespace.define("UI", {
        SelectableList: SelectableList,
        SelectionMode: selectionMode
    });
})();