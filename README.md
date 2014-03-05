Responsive Windows 8.1 Sample App
=========================

A sample Windows 8.1 app using responsive web techniques, to accompany the workshop "Taking the Responsive Web to Windows 8" at SXSW 2014

The talk, and this sample project, will outline how to take advantage of the modern web developer's toolkit and best practices to make native Windows 8.1 apps that work elegantly regardless of device, orientation, snap view, or input method. This includes using media queries, CSS multi column layout, pointer events, and more.

This is not a large scale app.  It is kept simple for demonstration.  Many of the practices used in this app came from more than a year and a half working on a large scale health app for Windows 8.

This is a work in progress, and I am committing as I complete pieces that demonstrate bullet points in the corresponding talk.

There is also a 'grunt' branch using Grunt and Sass.  I'm keeping this separate since there is some additional setup for Node, npm, Grunt, and Sass.  Master only needs a typical Windows Store development environment.  

TODO: 
* Wrap up GestureRecognizer example (as alternate ListView)
* Add basic pointer example
* Semantic Zoom on WinJS ListView for entry screen
* Change to File API instead of localStorage



#Up and Running

Clone the repo to your Windows machine, and open `Responsive/Responsive.sln` with Visual Studio 2013 (Express version is free).
