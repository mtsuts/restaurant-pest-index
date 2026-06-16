const ARROW_RIGHT = `<svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M0.847213 15.6573C0.239731 15.0325 0.239731 14.0194 0.847213 13.3946L5.96949 8.12598L0.847213 2.85735C0.23973 2.23251 0.23973 1.21944 0.847213 0.594606C1.45469 -0.0302334 2.43962 -0.0302335 3.0471 0.594606L9.26932 6.9946C9.8768 7.61944 9.8768 8.63251 9.26932 9.25735L3.0471 15.6573C2.43962 16.2822 1.4547 16.2822 0.847213 15.6573Z" fill="#051C34"/>
</svg>`;
const ARROW_LEFT = `<svg width="11" height="17" viewBox="0 0 11 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.78416 0.93445C10.3916 1.55929 10.3916 2.57235 9.78416 3.19719L4.66189 8.46582L9.78416 13.7344C10.3916 14.3593 10.3916 15.3724 9.78416 15.9972C9.17668 16.622 8.19176 16.622 7.58428 15.9972L1.36206 9.59719C0.754572 8.97235 0.754573 7.95929 1.36206 7.33445L7.58428 0.934449C8.19176 0.30961 9.17668 0.30961 9.78416 0.93445Z" fill="#051C34"/>
</svg>`;
//----------- PROTOTYPE FUNCTIONS  ----------------------
d3.selection.prototype.patternify = function (params) {
  var container = this;
  var selector = params.selector;
  var elementTag = params.tag;
  var data = params.data || [selector];

  // Pattern in action
  var selection = container.selectAll("." + selector).data(data, (d, i) => {
    if (typeof d === "object") {
      if (d.id) {
        return d.id;
      }
    }
    return i;
  });
  selection.exit().remove();
  selection = selection.enter().append(elementTag).merge(selection);
  selection.attr("class", selector);
  return selection;
};

const isVisible = function (ele, container) {
  const eleTop = ele.offsetTop;
  const eleBottom = eleTop + ele.clientHeight;

  const containerTop = container.scrollTop;
  const containerBottom = containerTop + container.clientHeight;

  // The element is fully visible in the container
  return (
    (eleTop >= containerTop && eleBottom <= containerBottom)
    // ||
    // // Some part of the element is visible in the container
    // (eleTop < containerTop && containerTop < eleBottom) ||
    // (eleTop < containerBottom && containerBottom < eleBottom)
  );
};


function ordinal_suffix_of(i) {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

function triggerEvent(s, event) {
  if ("createEvent" in document) {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent(event, false, true);
    s.dispatchEvent(evt);
  } else {
    s.fireEvent("on" + event);
  }
}

function formatThousand(num) {
  if (typeof num === "number") {
    return d3.format(",")(num);
  }

  return num;
}

function formatK(num) {
  return d3.format("~s")(num);
}

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

const globals = {
  Android: function () {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function () {
    return navigator.userAgent.match(/BlackBerry/i);
  },
  iOS: function () {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function () {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Windows: function () {
    return navigator.userAgent.match(/IEMobile/i);
  },
  any: function () {
    if (window.innerWidth > 768) return false;

    return (
      globals.Android() ||
      globals.BlackBerry() ||
      globals.iOS() ||
      globals.Opera() ||
      globals.Windows() ||
      window.innerWidth <= 768
    );
  },
  get isMobile() {
    return window.innerWidth < 576;
  },
};

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function loadSvg(url) {
  const xhr = new XMLHttpRequest();

  xhr.open("GET", url, true);

  xhr.overrideMimeType("text/plain");

  return new Promise((res, rej) => {
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          res(xhr.responseText);
        } else {
          rej(new Error("Error"));
        }
      }
    };

    xhr.send();
  });
}

function fakePromise(content) {
  return new Promise((res) => res(content));
}

/**
 * Looks up a word based of buckets and value.
 * Example:
 *   - words: ['a', 'b', 'c']
 *   - buckets: [10, 20, 30]
 *   - value: 25
 *   will return 'c'
 * @param {Array} words list of words
 * @param {Array} buckets list of numbers
 * @param {Number} value score to lookup
 */
function lookupByBucket(words, buckets, value) {
  const index = buckets.findIndex((d) => value <= d);
  if (index === -1) {
    return words[words.length - 1];
  }
  return words[index];
}

function getRandomId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function initDropdown({ list, id, cb, placeholder }) {
  const select = document.querySelector(id);
  const options = list.slice();


  // if (placeholder) {
  //   options.unshift({ label: placeholder, value: '', selected: true })
  // }

  const choice = new Choices(select, {
    choices: options,
    position: "bottom",
    shouldSort: false,
    placeholder: 'Select State',
    itemSelectText: "",
    searchPlaceholderValue: 'Search',
    searchResultLimit: options.length,
  });

  select.addEventListener(
    "change",
    function (event) {
      const value = event.detail.value;
      cb(value);
    },
    false
  );

  return choice;
}

function updateCssVar(varName, value) {
  const root = document.documentElement;
  root.style.setProperty(varName, value);
}

function parseNumber(str) {
  return parseInt(
    String(str).trim().replaceAll("%", "").replaceAll(",", "").replaceAll("$", "")
  );
}

function sanitize(str) {
  str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, "");
  return str.trim().split(" ").join("");
}

function getRankValue(rank) {
  return `${rank < 10 ? '0' : ''}${rank}`;
}