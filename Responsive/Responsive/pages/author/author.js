(function () {
    "use strict";

    var nav = WinJS.Navigation;
    var ui = WinJS.UI;

    var _groups = {
        earlier: '3',
        weekAgo: '2',
        thisWeek: '1'
    }

    ui.Pages.define("/pages/author/author.html", {
        // This function is called to initialize the page.
        init: function (element, options) {
            if (options.author) {
                this.pastries = WinJS.xhr({
                    type: 'GET',
                    url: 'https://the-pastry-box-project.net/api/v1/consume/thoughts?baker=' + options.author,
                    responseType: 'json'
                });
            }
        },

        // This function is called whenever a user navigates to this page.
        ready: function (element, options) {
            this.element.querySelector(".titlearea .pagetitle").textContent = options.name;
            this.listView = document.querySelector('.groupeditemslist').winControl;
            this.listView.addEventListener('iteminvoked', this._itemInvoked.bind(this));

            this.pastries.done(function (resp) {
                this.stopProgress();
                if (resp && resp.response && resp.response.length) {
                    this.prepareList(resp.response);
                } else {
                    //none found
                }
            }.bind(this));
        },
        prepareList: function(response) {
            var articles = JSON.parse(response);
            for (var i = 0, length = articles.length; i < length; ++i) {
                var current = articles[i];
                current.group = 'allbyauthor';
                if (!current.title) {
                    current.title = current.nicedate;
                }
                if (current.photo) {
                    current.photoUrl = 'url(' + current.photo + ')';
                }
            }
            var articleList = new WinJS.Binding.List(articles);
            this.listView.itemDataSource = articleList.dataSource;
            this.groupedItems = articleList.createGrouped(this.getGroupKey, this.getGroupData);
            this.listView.groupDataSource = this.groupedItems.groups.dataSource;
        },
        unload: function() {

        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />
            document.querySelector('.groupeditemslist').winControl.recalculateItemPosition();
            // TODO: Respond to changes in layout.
        },

        _itemInvoked: function (args) {
            var item = this.groupedItems.getAt(args.detail.itemIndex);
            nav.navigate("/pages/itemDetail/itemDetail.html", { item: item });
        },
        stopProgress: function () {

        },
        getGroupKey: function (data) {
            return data.group;
        },
        getGroupData: function (data) {
            return {
                title: 'All Thoughts'
            };
        }
    });
})();
