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
            this.element.querySelector(".titlearea .pagetitle").textContent = this.item.title;
            this.prepareArticle();
        },
        selectAuthor: function() {
            nav.navigate("/pages/author/author.html", { author: this.item.slug, name: this.item.realname  });
        },
        prepareArticle: function () {
            var article = this.element.querySelector(".main-article article");
            var author = document.createElement('div');
            var name = document.createElement('p');
            var images;

            article.innerHTML = '<div class="author" role="link"></div>' + this.item.thought;
            author.classList.add('details');
            author.appendChild(name);

            name.classList.add('name');
            name.innerText = this.item.realname;

            article.querySelector('.author').appendChild(author);
            author.parentNode.style.backgroundImage = 'url(' + this.item.photo + ')';
            author.parentNode.addEventListener("click", this.selectAuthor.bind(this), false);

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
