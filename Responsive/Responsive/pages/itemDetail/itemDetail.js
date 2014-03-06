(function () {
    "use strict";

    var nav = WinJS.Navigation;

    WinJS.UI.Pages.define("/pages/itemDetail/itemDetail.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        item: undefined,
        element: undefined,
        appbar: undefined,
        gesture: undefined,
        list: undefined,
        init: function(element, options) {
        },
        ready: function (element, options) {
            this.appbar = document.getElementById('appbar').winControl;
            this.item = options.item;
            this.element = element;
            this.element.querySelector(".titlearea .pagetitle").innerHTML = this.item.title;
            this.prepareArticle();
            this.prepareExtraDetails();

            this.appbar.disabled = true;
        },
        unload: function() {
            this.appbar.disabled = false;
        },
        updateLayout: function() {
            this.list.updateLayout();
        },
        selectAuthor: function (e) {
            e.preventDefault();
            nav.navigate("/pages/author/author.html", { author: this.item.slug, name: this.item.realname  });
        },
        keypressAuthor: function(e) {
            if (e.which === 13) {
                this.selectAuthor();
            }
        },
        prepareArticle: function () {
            var article = this.element.querySelector(".main-article article");
            var author;
            var name;
            var images;

            article.innerHTML = article.innerHTML + this.item.thought;
            author = article.querySelector('.author');
            name = author.querySelector('.name');
            name.innerText = this.item.realname;

            author.style.backgroundImage = 'url(' + this.item.photo + ')';
            author.addEventListener("click", this.selectAuthor.bind(this), false);

            images = article.querySelectorAll('img:not([src])');
            if (images && images.length) {
                for (var i = 0, length = images.length; i < length; ++i) {
                    var image = images[i];
                    image.parentNode.removeChild(image);
                }
            }
        },
        prepareExtraDetails: function() {
            var details = this.element.querySelector('.extra');
            var toggler = details.querySelector('.toggle');
            var articles = JSON.parse(localStorage.getItem("alternate"));

            this.gesture = new MSGesture();
            this.gesture.target = details;
            details.addEventListener("MSGestureEnd", this.toggleExtraDetails.bind(this), false);
            details.addEventListener("MSGestureChange", this.toggleExtraDetails.bind(this), false);
            //details.addEventListener("MSInertiaStart", this.toggleExtraDetails.bind(this), false);
            details.addEventListener("pointerdown", this.toggleExtraDetails.bind(this), false);
            //details.addEventListener('MSGestureTap', this.toggleExtraDetails.bind(this), false);
            toggler.addEventListener("click", this.toggleExtraDetails.bind(this), false);

            this.list = document.querySelector('.extra-list').winControl;

            //Semantic Zoom In Templates
            this.list.headerTemplate = document.querySelector("#groupHeaderTemplate");
            this.list.itemTemplate = document.querySelector("#zoomedInItemTemplate");

            this.list.isSemanticZoomable = false;
            //this.list.itemInvoked = this.itemInvoked.bind(this);
            this.list.isUpdateLayoutRequired = true;
            this.list.useItemDataAttachment = true;
            this.list.dataSource = articles;
            
            this.list.render();
        },
        itemInvoked: function (e, item) {
            var data = item.data();
            if (data) {
                nav.navigate('/pages/itemDetail/itemDetail.html', { item: data });
            }
        },
        toggleExtraDetails: function (e) {
            e.preventDefault();
            if (e.type === 'pointerdown') {
                this.gesture.addPointer(e.pointerId);
                this.gesture.startY = e.clientY;
                return;
            } else if (e.type === 'MSGestureChange') {
                this.gesture.endY = e.clientY;
                if (Math.abs(this.gesture.endY - this.gesture.startY) < 40) {
                    return;
                }
                this.gesture.stop();
            } else if (e.type === 'MSGestureEnd') {
                this.gesture.stop();
                this.gesture.startY = 0;
                this.gesture.endY = 0;
                return;
            }
            var target = e.type === 'click' ? e.currentTarget.parentNode : e.currentTarget;

            if (target.getAttribute('data-state') === 'open') {
                target.setAttribute('data-state', 'closed');
            } else {
                target.setAttribute('data-state', 'open');
            }
        }
    });
})();
