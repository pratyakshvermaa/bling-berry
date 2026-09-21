(function (global) {
    var MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function daysInMonth(month, year) {
        if (!month) return 31;
        return new Date(year || 2000, month, 0).getDate();
    }

    global.bbInitDob = function (root) {
        if (!root) return { read: function () { return ""; } };

        var state = { day: "", month: "", year: "" };
        var panel = root.querySelector(".dob-panel");
        var list = root.querySelector(".dob-list");
        var segs = {
            day: root.querySelector('[data-part="day"]'),
            month: root.querySelector('[data-part="month"]'),
            year: root.querySelector('[data-part="year"]')
        };
        var openPart = null;
        var closeTimer = 0;

        function setLabel(part, text, empty) {
            var val = segs[part].querySelector("[data-value]");
            val.textContent = text;
            val.classList.toggle("is-empty", !!empty);
        }

        function clampDay() {
            var max = daysInMonth(parseInt(state.month, 10), parseInt(state.year, 10));
            if (state.day && parseInt(state.day, 10) > max) {
                state.day = "";
                setLabel("day", "Day", true);
            }
        }

        function close() {
            if (!openPart) return;
            segs[openPart].setAttribute("aria-expanded", "false");
            segs[openPart].classList.remove("is-open");
            root.classList.remove("has-open");
            panel.classList.remove("is-on");
            openPart = null;
            window.clearTimeout(closeTimer);
            closeTimer = window.setTimeout(function () {
                if (!openPart) panel.hidden = true;
            }, 320);
        }

        function optionsFor(part) {
            if (part === "month") {
                return MONTHS.map(function (name, i) {
                    return { value: pad(i + 1), label: name };
                });
            }
            if (part === "year") {
                var now = new Date().getFullYear();
                var out = [];
                for (var y = now - 16; y >= now - 90; y--) {
                    out.push({ value: String(y), label: String(y) });
                }
                return out;
            }
            var max = daysInMonth(parseInt(state.month, 10), parseInt(state.year, 10));
            var days = [];
            for (var d = 1; d <= max; d++) {
                days.push({ value: pad(d), label: pad(d) });
            }
            return days;
        }

        function placePanel(part) {
            var btn = segs[part];
            var minW = part === "month" ? 168 : part === "year" ? 112 : 92;
            var width = Math.max(btn.offsetWidth, minW);
            var left = btn.offsetLeft;
            var maxLeft = root.clientWidth - width;
            if (left > maxLeft) left = Math.max(0, maxLeft);
            panel.style.width = width + "px";
            panel.style.left = left + "px";
            panel.style.right = "auto";
        }

        function open(part) {
            if (openPart === part) {
                close();
                return;
            }
            close();
            openPart = part;
            window.clearTimeout(closeTimer);
            segs[part].setAttribute("aria-expanded", "true");
            segs[part].classList.add("is-open");
            root.classList.add("has-open");
            list.innerHTML = "";
            optionsFor(part).forEach(function (opt) {
                var li = document.createElement("li");
                li.setAttribute("role", "option");
                li.className = "dob-opt" + (state[part] === opt.value ? " is-on" : "");
                li.dataset.value = opt.value;
                li.textContent = opt.label;
                list.appendChild(li);
            });
            panel.hidden = false;
            placePanel(part);
            requestAnimationFrame(function () {
                panel.classList.add("is-on");
                var on = list.querySelector(".is-on");
                if (on) on.scrollIntoView({ block: "nearest" });
            });
        }

        root.addEventListener("click", function (e) {
            var opt = e.target.closest(".dob-opt");
            if (opt && openPart) {
                var part = openPart;
                state[part] = opt.dataset.value;
                setLabel(part, opt.textContent, false);
                if (part !== "day") clampDay();
                close();
                return;
            }
            var btn = e.target.closest(".dob-seg");
            if (btn && root.contains(btn)) {
                e.preventDefault();
                open(btn.getAttribute("data-part"));
            }
        });

        document.addEventListener("click", function (e) {
            if (!root.contains(e.target)) close();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") close();
        });

        return {
            read: function () {
                if (!state.day || !state.month || !state.year) return "";
                return state.year + "-" + state.month + "-" + state.day;
            }
        };
    };
}(window));
