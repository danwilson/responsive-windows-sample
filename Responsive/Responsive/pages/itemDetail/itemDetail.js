(function () {
    "use strict";

    var nav = WinJS.Navigation;

    WinJS.UI.Pages.define("/pages/itemDetail/itemDetail.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        item: undefined,
        element: undefined,
        ready: function (element, options) {
            this.item = options.item;
            this.element = element;
            this.element.querySelector(".titlearea .pagetitle").innerHTML = this.item.title;
            this.prepareArticle();
        },
        selectAuthor: function() {
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
            author.addEventListener("keypress", this.keypressAuthor.bind(this), false);

            images = article.querySelectorAll('img:not([src])');
            if (images && images.length) {
                for (var i = 0, length = images.length; i < length; ++i) {
                    var image = images[i];
                    image.parentNode.removeChild(image);
                }
            }
        }
    });
})();
