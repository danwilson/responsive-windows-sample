(function () {
    "use strict";

    var nav = WinJS.Navigation;
    var ui = WinJS.UI;

    ui.Pages.define("/pages/groupedItemsCustom/groupedItems.html", {
        // This function is called to initialize the page.
        init: function (element, options) {
            var local = localStorage.getItem('alternate');
            if (local) {
                local = JSON.parse(local);
                this.pastries = new WinJS.Promise(function (complete) {
                    complete({ response: local });
                });
            }
        },

        // This function is called whenever a user navigates to this page.
        ready: function (element, options) {
            this.element = element;
            this.pastries.done(function (resp) {
                this.stopProgress();
                if (resp && resp.response && resp.response.length) {
                    this.prepareList(resp.response);
                    element.querySelector('.toggle-list-view').classList.add('enabled');
                } else {
                    //none found
                }
            }.bind(this));
        },
        updateLayout: function() {
            this.list.updateLayout();
        },
        itemInvoked: function(e, selectedItem) {
            nav.navigate('/pages/itemDetail/itemDetail.html', { item : selectedItem.data() });
        },
        prepareList: function(resp) {
            this.element.querySelector('.toggle-list-view').addEventListener('click', function (e) {
                nav.navigate('/pages/groupedItems/groupedItems.html', {});
            }, false);

            this.list = document.querySelector('.groupeditemslist.custom').winControl;

            //Semantic Zoom In Templates
            this.list.headerTemplate = document.querySelector("#groupHeaderCustomTemplate");
            this.list.itemTemplate = document.querySelector("#zoomedInItemCustomTemplate");
            //Semantic Zoom Out Template
            this.list.groupTemplate = document.querySelector("#groupHeaderCustomTemplate");

            this.list.isSemanticZoomable = true;
            this.list.dataSource = resp;
            this.list.itemInvoked = this.itemInvoked.bind(this);
            this.list.groupSelectionMode = UI.SelectionMode.multi;
            this.list.useItemDataAttachment = true;
            this.list.isZoomedOutSortable = true;
            this.list.isUpdateLayoutRequired = true; //probably better way to do this, need to research if 8.1 added anything for multi column layout widths
            this.list.useZoomedInForListLayout = false;
            //this.list.onSortingComplete = this.onRearrange.bind(this);
            //this.list.onSelection = this.onSelection.bind(this);

            this.list.render();
        },
        stopProgress: function() {

        },

    });
})();
