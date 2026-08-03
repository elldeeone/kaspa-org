import { resolveBuildExampleReturnPath } from './return-path.mjs';

document.body.innerHTML =
`<a id="back-link" href="/build#try-live"><- Back</a> | Network: <span id="menu"></span><span id="actions"></span><br>
`
//<div class="banner">
//    <img src="resources/ferris.svg" height="44px" />
//    <img src="resources/wasm.svg" height="44px" />
//    <img src="resources/kaspa.svg" height="44px" />
//</div>
+ document.body.innerHTML;

// @ts-ignore
String.prototype.color = function(color) {
    console.log(this,color);
    return `<span style="color: ${color}">${this}</span>`;
}

// @ts-ignore
String.prototype.class = function(className) {
    return `<span class="${className}">${this}</span>`;
}

function currentNetwork() {
    return window.location.hash.replace(/^#/,'') || 'mainnet';
}

// @ts-ignore
window.changeNetwork = (network) => {
    console.log("network",network);
    window.location.hash = network;
    location.reload();
}

function createMenu() {
    let menu = document.getElementById('menu');
    [ 'mainnet', 'testnet-10', 'testnet-11' ].forEach((network) => {
        if (network === currentNetwork()) {
            let el = document.createElement('text');
            el.innerHTML = ` [${network}] `;
            menu.appendChild(el);
        } else {
            
            let el = document.createElement('a');
            el.id = network;
            el.href = `javascript: changeNetwork("${network}")`;
            el.innerHTML = ` ${network} `;
            menu.appendChild(el);
        }
    });
}

function setupBackLink() {
    let backLink = document.getElementById('back-link');
    if (!backLink) {
        return;
    }

    const returnTo = new URLSearchParams(window.location.search).get('returnTo');
    const returnPath = resolveBuildExampleReturnPath(
        returnTo,
        window.location.origin,
        '/build'
    );
    backLink.setAttribute('href', returnPath);

    if (window.top !== window.self) {
        backLink.setAttribute('target', '_top');
        return;
    }

    let referrer;
    try {
        referrer = document.referrer ? new URL(document.referrer) : null;
    } catch {
        referrer = null;
    }

    const cameFromBuild =
        referrer &&
        referrer.origin === window.location.origin &&
        referrer.pathname === '/build';

    if (cameFromBuild && !returnTo) {
        backLink.setAttribute('href', '/build#try-live');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupBackLink();
    createMenu();
});

function disconnectHandler(rpc) {
    // @ts-ignore
    window.$rpc = rpc;
    let actions = document.getElementById('actions');
    actions.innerHTML = ` | <a href="javascript: disconnect()">Disconnect</a>`;
}

// @ts-ignore
window.disconnect = async function() {
    // @ts-ignore
    await $rpc.disconnect();
    document.getElementById('actions').innerHTML = ` | <a href="javascript: reconnect()">Reconnect</a>`;
}

// @ts-ignore
window.reconnect = async function() {
    document.getElementById('actions').innerHTML = ` | Connecting...`;
    // @ts-ignore
    await $rpc.connect();
    document.getElementById('actions').innerHTML = ` | <a href="javascript: disconnect()">Disconnect</a>`;
}

// Generate a random id
function randomId() {
    return (Math.round(Math.random()*1e8)).toString(16);
}

// Log to an element by its id
function logToId(id, ...args) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('code');
        el.id = id;
        document.body.appendChild(el);
    }

    el.innerHTML = args.map((arg) => {
        return typeof arg === 'object' ? stringify(arg) : arg;
    }).join(' ') + "<br>";
}

// Clear the content of an element by its id
function clearId(id) {
    if (id) {
        let el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
        }
    }
}

function log(...args) {
    let el = document.createElement('code');
    el.innerHTML = args.map((arg) => {
        return typeof arg === 'object' ? stringify(arg) : arg;
    }).join(' ') + "<br>";
    document.body.appendChild(el);
}

function stringify(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, (k, v) => { return typeof v === "bigint" ? v.toString() + 'n' : v; }, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"(\d+)n"/g,"$1n");
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?n?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

export { log, logToId, clearId, randomId, stringify, currentNetwork, disconnectHandler };
