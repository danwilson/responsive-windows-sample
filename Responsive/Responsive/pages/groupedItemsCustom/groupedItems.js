(function () {
    "use strict";

    var nav = WinJS.Navigation;
    var ui = WinJS.UI;

    ui.Pages.define("/pages/groupedItemsCustom/groupedItems.html", {
        // This function is called to initialize the page.
        init: function (element, options) {

        },

        // This function is called whenever a user navigates to this page.
        ready: function (element, options) {
            element.querySelector('.toggle-list-view').addEventListener('click', function (e) {
                nav.navigate('/pages/groupedItems/groupedItems.html', {});
            }, false);

            this.list = document.querySelector('.groupeditemslist.custom').winControl;

            //Semantic Zoom In Templates
            this.list.headerTemplate = document.querySelector("#groupHeaderTemplate");
            this.list.itemTemplate = document.querySelector("#zoomedInItemTemplate");
            //Semantic Zoom Out Template
            this.list.groupTemplate = document.querySelector("#groupHeaderTemplate");

            this.list.isSemanticZoomable = true;
            this.list.dataSource = DataCustom.list;
            //this.list.itemInvoked = this.itemInvoked.bind(this);
            this.list.groupSelectionMode = UI.SelectionMode.multi;
            this.list.isZoomedOutSortable = true;
            this.list.isUpdateLayoutRequired = true; //probably better way to do this, need to research if 8.1 added anything for multi column layout widths
            this.list.useZoomedInForListLayout = false;
            //this.list.onSortingComplete = this.onRearrange.bind(this);
            //this.list.onSelection = this.onSelection.bind(this);

            this.list.render();
        },

        updateLayout: function (element) {

        },

    });
})();
