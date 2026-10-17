(function () {
    var words = ['New York bridal...', 'Wedding venues...', 'Wedding photographers...', 'Wedding flowers...', 'Wedding catering...', 'Saratoga venue...'];

    function startTypewriter(el) {
        var wordIndex = 0, charIndex = 0, deleting = false;

        function type() {
            if (el === document.activeElement) {
                setTimeout(type, 400);
                return;
            }
            var current = words[wordIndex];
            el.placeholder = deleting ? current.substring(0, charIndex--) : current.substring(0, charIndex++);

            if (!deleting && charIndex > current.length) {
                deleting = true;
                setTimeout(type, 1800);
            } else if (deleting && charIndex < 0) {
                deleting = false;
                charIndex = 0;
                wordIndex = (wordIndex + 1) % words.length;
                setTimeout(type, 400);
            } else {
                setTimeout(type, deleting ? 60 : 100);
            }
        }

        type();
    }

    function init() {
        var inputs = document.querySelectorAll('[id="solr-typewriter-input"]');
        inputs.forEach(function (el) {
            startTypewriter(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());