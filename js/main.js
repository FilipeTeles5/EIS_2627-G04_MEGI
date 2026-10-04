// Keep the shared page interactions scoped to jQuery.
(function ($) {
    "use strict";
    
    // Dropdown on mouse hover
    // Initialize desktop hover behavior and keep it in sync with viewport changes.
    $(document).ready(function () {
        // Enable hover-driven dropdowns only above the desktop breakpoint.
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                // Open the dropdown when the pointer enters its menu.
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                // Close the dropdown and clear focus when the pointer leaves.
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        // Reapply the appropriate hover behavior whenever the viewport changes.
        $(window).resize(toggleNavbarMethod);
    });
    
    
    // Back to top button
    // Show or hide the shortcut according to the page's scroll position.
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    // Smoothly return to the document top and prevent the link's default jump.
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });
    
})(jQuery);
