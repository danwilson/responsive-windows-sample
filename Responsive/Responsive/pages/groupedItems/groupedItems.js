(function () {
    "use strict";

    var nav = WinJS.Navigation;
    var ui = WinJS.UI;

    ui.Pages.define("/pages/groupedItems/groupedItems.html", {
        // This function is called to initialize the page.
        init: function (element, options) {
        },

        // This function is called whenever a user navigates to this page.
        ready: function (element, options) {

            element.querySelector('.toggle-list-view').addEventListener('click', function (e) {
                nav.navigate('/pages/groupedItemsCustom/groupedItems.html', {});
            }, false);
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />
            document.querySelector('.groupeditemslist').winControl.recalculateItemPosition();
            // TODO: Respond to changes in layout.
        },

        _groupHeaderInvoked: function (args) {
            var group = Data.groups.getAt(args.detail.groupHeaderIndex);
            nav.navigate("/pages/groupDetail/groupDetail.html", { groupKey: group.key });
        },

        _itemInvoked: function (args) {
            var item = Data.items.getAt(args.detail.itemIndex);
            nav.navigate("/pages/itemDetail/itemDetail.html", { item: Data.getItemReference(item) });
        }
    });
})();
