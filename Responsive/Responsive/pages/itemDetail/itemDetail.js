(function () {
    "use strict";

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
        prepareArticle: function () {
            var article = this.element.querySelector(".main-article article");
            var author = document.createElement('div');
            var name = document.createElement('p');

            article.innerHTML = '<div class="author"></div>' + this.item.thought;
            author.classList.add('details');
            author.appendChild(name);

            name.classList.add('name');
            name.innerText = this.item.realname;

            article.querySelector('.author').appendChild(author);
            author.parentNode.style.backgroundImage = 'url(' + this.item.photo + ')';
        }
    });
})();
