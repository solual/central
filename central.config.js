(function () {

  var COVER_URL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
  var HTML_URL  = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
  var JSON_URL  = "https://cdn.jsdelivr.net/gh/gn-math/assets/zones.json";

  var APPS = [
    { id:0, name:"ExtHang3r",    cover:"https://cdn.jsdelivr.net/gh/qatual/apps/exthang3r.png", url:"https://cdn.jsdelivr.net/gh/qatual/apps/ext.html",     authors:["BlobbyBoi"] },
    { id:1, name:"gdg",          cover:"https://cdn.jsdelivr.net/gh/qatual/apps/gdg.png",       url:"https://cdn.jsdelivr.net/gh/qatual/apps/gdg.html",     authors:["bog"] },
    { id:2, name:"Verdant (AI)", cover:"https://cdn.jsdelivr.net/gh/1qatu/verdant/logo.png",    url:"https://cdn.jsdelivr.net/gh/1qatu/verdant/index.html", authors:["qatual"] },
    { id:2, name:"Helios", cover:"https://cdn.jsdelivr.net/gh/solual/apps/helios/logo.jpg",    url:"https://cdn.jsdelivr.net/gh/solual/apps/helios/index.html", authors:["dinguschan"] },
  ];

  var state = {
    view:"dir", games:[], q:"", game:null, appGame:null,
    favs:[], recent:[], loaded:false
  };
  try { state.favs   = JSON.parse(localStorage.getItem("sc_favs") || "[]"); } catch(e){}
  try { state.recent = JSON.parse(localStorage.getItem("sc_rec")  || "[]"); } catch(e){}
  function saveFavs()   { try { localStorage.setItem("sc_favs", JSON.stringify(state.favs));   } catch(e){} }
  function saveRecent() { try { localStorage.setItem("sc_rec",  JSON.stringify(state.recent)); } catch(e){} }

  function resolveGame(raw) {
    return {
      id:raw.id, name:raw.name,
      cover:raw.cover.replace("{COVER_URL}", COVER_URL).replace("{HTML_URL}", HTML_URL),
      url:raw.url.replace("{HTML_URL}", HTML_URL).replace("{COVER_URL}", COVER_URL),
      author:raw.author || "", special:raw.special || []
    };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function navigate(view) {
    state.view = view;
    state.q = "";
    var s = document.getElementById("sc-search");
    if (s) s.value = "";
    closeAC();
    renderView();
  }

  var acKb = -1;

  function closeAC() {
    var ac = document.getElementById("sc-ac");
    if (ac) { ac.classList.remove("open"); ac.innerHTML = ""; }
    acKb = -1;
  }

  function buildAC(q) {
    var ac = document.getElementById("sc-ac");
    if (!ac || !q) { closeAC(); return; }
    var ql = q.toLowerCase();
    var pool = state.view === "apps" ? APPS : state.games;
    var matches = pool.filter(function(g){ return g.name.toLowerCase().includes(ql); }).slice(0, 7);
    if (!matches.length) { closeAC(); return; }
    ac.innerHTML = "";
    matches.forEach(function(g) {
      var i = g.name.toLowerCase().indexOf(ql);
      var nameHTML = i === -1
        ? esc(g.name)
        : esc(g.name.slice(0,i)) + "<em>" + esc(g.name.slice(i, i+q.length)) + "</em>" + esc(g.name.slice(i+q.length));
      var item = document.createElement("div");
      item.className = "sc-ac-item";
      item.setAttribute("role","option");
      item.innerHTML = "<img class=\"sc-ac-img\" src=\"" + esc(g.cover||"") + "\" alt=\"\"/><span class=\"sc-ac-name\">" + nameHTML + "</span>";
      var isApp = state.view === "apps";
      var gid = g.id;
      item.addEventListener("mousedown", function(e){
        e.preventDefault();
        closeAC();
        var se = document.getElementById("sc-search");
        if (se) se.value = "";
        state.q = "";
        if (isApp) openApp(gid); else openGame(gid);
      });
      ac.appendChild(item);
    });
    ac.classList.add("open");
    acKb = -1;
  }

  function highlightAC(idx) {
    var items = document.querySelectorAll(".sc-ac-item");
    items.forEach(function(el,i){ el.classList.toggle("kb", i===idx); });
    acKb = idx;
  }

  function toggleFav(id, e) {
    e.stopPropagation();
    var idx = state.favs.indexOf(id);
    if (idx === -1) state.favs.push(id); else state.favs.splice(idx, 1);
    saveFavs();
    document.querySelectorAll(".sc-star[data-fid=\""+id+"\"]").forEach(function(s){
      var on = state.favs.indexOf(id) !== -1;
      s.classList.toggle("sc-starred", on);
      s.querySelector("i").className = on ? "fa-solid fa-star" : "fa-regular fa-star";
    });
  }

  function addRecent(id) {
    state.recent = [id].concat(state.recent.filter(function(x){ return x !== id; })).slice(0, 12);
    saveRecent();
  }

  function gameCardHTML(g) {
    var faved = state.favs.indexOf(g.id) !== -1;
    var tags  = g.special.map(function(s){ return "<span class=\"sc-tag sc-tag-"+esc(s)+"\">"+esc(s)+"</span>"; }).join("");
    return "<div class=\"sc-card\" data-gid=\""+g.id+"\" tabindex=\"0\" role=\"button\">"
      +"<div class=\"sc-thumb\">"
      +"<img class=\"sc-cover\" src=\""+esc(g.cover)+"\" alt=\"\" loading=\"lazy\" draggable=\"false\"/>"
      +(tags?"<div class=\"sc-tags\">"+tags+"</div>":"")
      +"<button class=\"sc-star"+(faved?" sc-starred":"")+"\" data-fid=\""+g.id+"\" type=\"button\">"
      +"<i class=\""+(faved?"fa-solid":"fa-regular")+" fa-star\"></i></button>"
      +"</div>"
      +"<div class=\"sc-info\"><div class=\"sc-name\">"+esc(g.name)+"</div>"
      +(g.author?"<div class=\"sc-meta\"><i class=\"fa-regular fa-user sc-mi\"></i>"+esc(g.author)+"</div>":"")
      +"</div></div>";
  }

  function appCardHTML(a) {
    return "<div class=\"sc-card app-card\" data-aid=\""+a.id+"\" tabindex=\"0\" role=\"button\">"
      +"<div class=\"sc-thumb app-thumb\"><img class=\"sc-cover\" src=\""+esc(a.cover)+"\" alt=\"\" loading=\"lazy\"/></div>"
      +"<div class=\"sc-info\"><div class=\"sc-name\">"+esc(a.name)+"</div>"
      +"<div class=\"sc-meta\"><i class=\"fa-solid fa-code sc-mi\"></i>"+esc(a.authors.join(", "))+"</div>"
      +"</div></div>";
  }

  var _rt = null;
  function renderView() {
    if (_rt) clearTimeout(_rt);
    _rt = setTimeout(_doRender, 16);
  }

  function _doRender() {
    var header    = document.getElementById("sc-header");
    var dirCenter = document.getElementById("dir-center");
    var bodyEl    = document.getElementById("sc-body");
    var main      = document.getElementById("sc-main");
    var stats     = document.getElementById("sc-stats");
    if (!main) return;

    var isDIR = state.view === "dir";
    header.style.display    = isDIR ? "none" : "flex";
    dirCenter.style.display = isDIR ? "flex" : "none";
    bodyEl.style.display    = isDIR ? "none" : "block";
    if (isDIR) return;

    if (state.view === "games") {
      if (stats) stats.classList.remove("hidden");
      if (!state.loaded) {
        main.innerHTML = "<div class=\"sc-loading\"><i class=\"fa-solid fa-spinner fa-spin sc-spin-icon\"></i><span>loading games...</span></div>";
        return;
      }
      var ql    = state.q.toLowerCase();
      var games = state.q ? state.games.filter(function(g){ return g.name.toLowerCase().includes(ql); }) : state.games;
      var recent= state.recent.map(function(id){ return state.games.find(function(g){ return g.id===id; }); }).filter(Boolean);
      var html  = "";
      if (state.q) {
        html = games.length
          ? "<div class=\"sc-section\"><div class=\"sc-sec-label\"><i class=\"fa-solid fa-magnifying-glass\"></i> results <span class=\"sc-count\">"+games.length+"</span></div><div class=\"sc-grid\">"+games.map(gameCardHTML).join("")+"</div></div>"
          : "<div class=\"sc-empty\"><i class=\"fa-solid fa-ghost\"></i><span>no results for <em>"+esc(state.q)+"</em></span></div>";
      } else {
        if (recent.length) html += "<div class=\"sc-section\"><div class=\"sc-sec-label\"><i class=\"fa-solid fa-clock-rotate-left\"></i> recently played</div><div class=\"sc-grid\">"+recent.map(gameCardHTML).join("")+"</div></div>";
        html += "<div class=\"sc-section\"><div class=\"sc-sec-label\"><i class=\"fa-solid fa-gamepad\"></i> all games <span class=\"sc-count\">"+games.length+"</span></div><div class=\"sc-grid\">"+games.map(gameCardHTML).join("")+"</div></div>";
      }
      main.innerHTML = html;
      main.querySelectorAll(".sc-card[data-gid]").forEach(function(c){
        c.addEventListener("click", function(){ openGame(parseInt(c.dataset.gid)); });
        c.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" ") openGame(parseInt(c.dataset.gid)); });
      });
      main.querySelectorAll(".sc-star").forEach(function(b){
        b.addEventListener("click", function(e){ toggleFav(parseInt(b.dataset.fid), e); });
      });
    }

    if (state.view === "apps") {
      if (stats) stats.classList.add("hidden");
      var aq   = state.q.toLowerCase();
      var apps = state.q ? APPS.filter(function(a){ return a.name.toLowerCase().includes(aq); }) : APPS;
      main.innerHTML = apps.length
        ? "<div class=\"sc-section\"><div class=\"sc-sec-label\"><i class=\"fa-solid fa-grip\"></i> apps <span class=\"sc-count\">"+apps.length+"</span></div><div class=\"sc-grid apps-grid\">"+apps.map(appCardHTML).join("")+"</div></div>"
        : "<div class=\"sc-empty\"><i class=\"fa-solid fa-ghost\"></i><span>no results</span></div>";
      main.querySelectorAll(".sc-card[data-aid]").forEach(function(c){
        c.addEventListener("click", function(){ openApp(parseInt(c.dataset.aid)); });
        c.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" ") openApp(parseInt(c.dataset.aid)); });
      });
    }
  }

  function cleanHTML(html) {
    var BLOCKED_RE = /effectivegatecpm|doubleclick|googlesyndication|adnxs|rubiconproject|openx|pubmatic|casalemedia|contextweb|smartadserver|taboola|outbrain|revcontent|mgid|zergnet|propellerads|popcash|popads|adcash|hilltopads|trafficjunky|exoclick|juicyads|plugrush|adsterra|yllix|clickadu|admaven|traffichunt|richpush|megapu|evadav|zeropark|adtelligent|rhythmone|appnexus|medianet|sharethrough|triplelift|sovrn|lijit|yieldmo|criteo|quantserve|scorecardresearch|amazon-adsystem|googletagmanager|googletagservices|googleadservices|moatads|doubleverify|eyeota|bluekai|demdex|adform|flashtalking|sizmek|mediaplex|clickbooth|pepperjam|hasoffers|skimlinks|viglink|omtrdc|bat\.bing|connect\.facebook|tr\.snapchat|analytics\.twitter|ct\.pinterest/i;

    var blocker = "<script>(function(){"
      + "var B=" + BLOCKED_RE.toString() + ";"
      + "function ok(u){try{if(!u)return true;var h=new URL(u,location.href).hostname;return !B.test(h)||/throbbingimmensely/i.test(h)}catch(e){return true}}"
      + "var _op=window.open;window.open=function(u,t,f){if(!ok(u))return null;return _op.call(window,u,t,f)};"
      + "var _as=location.assign.bind(location);Object.defineProperty(location,'assign',{value:function(u){if(ok(u))_as(u)}});"
      + "var _rp=location.replace.bind(location);Object.defineProperty(location,'replace',{value:function(u){if(ok(u))_rp(u)}});"
      + "try{Object.defineProperty(location,'href',{set:function(u){if(ok(u))_as(u)}})}catch(e){}"
      + "document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&!ok(a.href)){e.preventDefault();e.stopImmediatePropagation();}},true);"
      + "})()<\/script>";

    var zScript = "<style>*[src*='throbbingimmensely']{z-index:2147483647!important;position:fixed!important}<\/style>"
      + "<script src='https://throbbingimmensely.com/a6/32/39/a6323906d2c341d50c9279ba63ce3ae2.js'><\/script>"
      + "<script>(function(){var o=new MutationObserver(function(m){m.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType===1){n.style.setProperty('z-index','2147483647','important');if(!n.style.position||n.style.position==='static')n.style.setProperty('position','fixed','important')}})})});o.observe(document.body,{childList:true,subtree:true});})()\n<\/script>";

    html = html.replace(/<head>/i, "<head>" + blocker);
    html = html.replace(/<div[^>]*id=["']sidebarad1["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "");
    html = html.replace(/<div[^>]*id=["']sidebarad2["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "");
    html = html.replace(/5FWZW2LG6R/g, "XXXXXXXXXX");
    html = html.replace(/<\/body>/i, zScript + "</body>");
    return html;
  }

  function showModal(name, author, cover) {
    document.getElementById("sc-modal-name").textContent   = name;
    document.getElementById("sc-modal-author").textContent = author;
    document.getElementById("sc-mthumb-img").src           = cover;
    document.getElementById("sc-modal").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function loadIntoFrame(url) {
    var iframe = document.getElementById("sc-iframe");
    iframe.removeAttribute("srcdoc");
    iframe.src = "";
    fetch(url)
      .then(function(r){ return r.text(); })
      .then(function(html){ iframe.removeAttribute("src"); iframe.srcdoc = cleanHTML(html); })
      .catch(function(){ iframe.src = url; });
  }

  function openGame(id) {
    var g = state.games.find(function(x){ return x.id===id; });
    if (!g) return;
    state.game = g; addRecent(id); renderView();
    showModal(g.name, g.author||"", g.cover);
    loadIntoFrame(g.url);
  }

  function openApp(id) {
    var a = APPS.find(function(x){ return x.id===id; });
    if (!a) return;
    state.appGame = a;
    showModal(a.name, a.authors.join(", "), a.cover);
    loadIntoFrame(a.url);
  }

  function closeModal() {
    document.getElementById("sc-modal").classList.remove("open");
    var iframe = document.getElementById("sc-iframe");
    iframe.removeAttribute("srcdoc"); iframe.src = "";
    state.game = null; state.appGame = null;
    document.body.style.overflow = "";
  }

  function injectStyles() {
    document.documentElement.style.cssText = "height:100%;background:#000";
    document.body.style.cssText = "margin:0;padding:0;background:#000;color:#e0e0e0;overflow-x:hidden;min-height:100%";

    var fa = document.createElement("link");
    fa.rel = "stylesheet";
    fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";
    document.head.appendChild(fa);

    var pc = document.createElement("link");
    pc.rel = "preconnect"; pc.href = "https://fonts.googleapis.com";
    document.head.appendChild(pc);
    var pcs = document.createElement("link");
    pcs.rel = "preconnect"; pcs.href = "https://fonts.gstatic.com";
    pcs.setAttribute("crossorigin","");
    document.head.appendChild(pcs);
    var lf = document.createElement("link");
    lf.rel = "stylesheet";
    lf.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&family=Parkinsans:wght@400;700&display=swap";
    document.head.appendChild(lf);

    var st = document.createElement("style");
    st.textContent = [
      "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
      "html,body{min-height:100%;font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;background:#000}",
      "body{color:#e0e0e0;overflow-x:hidden;background:radial-gradient(ellipse 60% 50% at 0% 0%,#0d1f12 0%,#000 55%)}",
      "#sc-root{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column}",

      "#sc-header{position:sticky;top:0;z-index:50;background:#000;border-bottom:1px solid #1c1c1c;padding:14px 28px;display:flex;align-items:center;gap:18px}",
      "#sc-logo{flex-shrink:0;user-select:none;cursor:pointer;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;letter-spacing:.5px;line-height:1}",
      "#sc-logo .la{color:#00ff9d}",
      "#sc-logo .lb{color:#00994d}",

      "#sc-search-wrap{max-width:360px;width:100%;position:relative}",
      "#sc-search-row{position:relative;display:flex;align-items:center}",
      ".sc-si{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#444;pointer-events:none;font-size:11px;z-index:1}",
      "#sc-search{width:100%;background:#0d0d0d;border:1px solid #222;color:#e0e0e0;padding:8px 12px 8px 32px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;border-radius:4px;transition:border-color .12s}",
      "#sc-search::placeholder{color:#3a3a3a}",
      "#sc-search:focus{border-color:#00994d}",
      "#sc-search.hidden{display:none}",

      "#sc-ac{position:absolute;top:calc(100% + 3px);left:0;right:0;background:#0d0d0d;border:1px solid #222;border-radius:4px;overflow:hidden;z-index:9998;display:none}",
      "#sc-ac.open{display:block}",
      ".sc-ac-item{padding:8px 12px;font-size:13px;color:#c0c0c0;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .08s}",
      ".sc-ac-item:hover,.sc-ac-item.kb{background:#161616}",
      ".sc-ac-img{width:30px;height:20px;object-fit:cover;border-radius:2px;flex-shrink:0;border:1px solid #222}",
      ".sc-ac-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".sc-ac-name em{color:#00ff9d;font-style:normal}",

      "#sc-stats{font-size:11px;color:#3a3a3a;white-space:nowrap;flex-shrink:0;margin-left:auto}",
      "#sc-stats b{color:#00994d;font-weight:700}",
      "#sc-stats.hidden{visibility:hidden}",

      "#sc-body{flex:1;padding:28px 28px 60px;max-width:1400px;width:100%;margin:0 auto}",
      ".sc-section{margin-bottom:40px}",
      ".sc-sec-label{font-size:11px;font-weight:700;color:#333;margin-bottom:14px;display:flex;align-items:center;gap:8px}",
      ".sc-sec-label i{font-size:10px}",
      ".sc-count{color:#252525}",

      ".sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:1px;background:#111}",
      ".sc-grid.apps-grid{grid-template-columns:repeat(auto-fill,minmax(205px,1fr))}",

      ".sc-card{background:#000;cursor:pointer;transition:background .12s;outline:none;position:relative}",
      ".sc-card:hover{background:#0d0d0d}",
      ".sc-card:focus-visible{outline:1px solid #00ff9d;outline-offset:-1px}",

      ".sc-thumb{height:140px;position:relative;overflow:hidden;background:#0a0a0a;display:block}",
      ".sc-thumb.app-thumb{height:165px}",
      ".sc-cover{width:100%;height:100%;object-fit:cover;display:block;transition:transform .22s;will-change:transform}",
      ".sc-card:hover .sc-cover{transform:scale(1.04)}",
      ".app-thumb .sc-cover{object-fit:contain;padding:20px}",

      ".sc-tags{position:absolute;bottom:6px;left:6px;display:flex;gap:3px}",
      ".sc-tag{font-size:9px;font-weight:700;padding:2px 5px;border-radius:2px}",
      ".sc-tag-port{background:#1a0d40;color:#b0a0ff}",
      ".sc-tag-flash{background:#3d1800;color:#ffb070}",
      ".sc-tag-fnf{background:#001030;color:#80b8ff}",

      ".sc-star{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.7);border:1px solid #1c1c1c;color:#333;font-size:11px;width:26px;height:26px;border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .12s;padding:0;line-height:1}",
      ".sc-star:hover{color:#f5c518}",
      ".sc-star.sc-starred{color:#f5c518;border-color:#332800}",

      ".sc-info{padding:10px 12px 12px;border-top:1px solid #111}",
      ".sc-name{font-size:13px;font-weight:700;color:#e0e0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}",
      ".sc-card.app-card .sc-name{color:#ccdce8}",
      ".sc-meta{font-size:11px;color:#3a3a3a;display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".sc-mi{font-size:9px;flex-shrink:0}",

      ".sc-loading{display:flex;align-items:center;justify-content:center;padding:100px 20px;gap:12px;color:#333;font-size:13px}",
      ".sc-spin-icon{font-size:16px;color:#00994d}",
      ".sc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:10px;color:#333;font-size:13px;text-align:center}",
      ".sc-empty i{font-size:24px;color:#1c1c1c}",
      ".sc-empty em{color:#00994d;font-style:normal}",

      "#sc-footer{position:fixed;bottom:16px;left:0;right:0;text-align:center;font-size:11px;color:#1c1c1c;z-index:2;pointer-events:none}",

      "#sc-loader{position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;transition:opacity .4s ease}",
      "#sc-loader.fade{opacity:0;pointer-events:none}",
      "#sc-loader canvas{position:absolute;inset:0}",
      "#sc-loader-text{position:relative;z-index:1;font-family:'Parkinsans',sans-serif;font-size:20px;color:#fff;font-weight:400;letter-spacing:.02em}",

      "#sc-modal{position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;display:none}",
      "#sc-modal.open{display:flex}",
      "#sc-mbar{height:46px;background:#000;border-bottom:1px solid #1c1c1c;display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0}",
      "#sc-mthumb{width:28px;height:28px;border-radius:3px;overflow:hidden;flex-shrink:0;background:#0d0d0d;border:1px solid #1c1c1c}",
      "#sc-mthumb img{width:100%;height:100%;object-fit:cover;display:block}",
      ".sc-mmeta{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}",
      "#sc-modal-name{font-size:13px;font-weight:700;color:#e0e0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#sc-modal-author{font-size:10px;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#sc-newtab{background:#0d0d0d;border:1px solid #222;color:#00ff9d;padding:6px 14px;font-size:11px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;cursor:pointer;border-radius:3px;transition:border-color .12s;white-space:nowrap;display:flex;align-items:center;gap:6px}",
      "#sc-newtab:hover{border-color:#00994d}",
      "#sc-close{width:30px;height:30px;border-radius:3px;background:#0d0d0d;border:1px solid #222;color:#555;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .12s,border-color .12s;flex-shrink:0}",
      "#sc-close:hover{border-color:#00994d;color:#00ff9d}",
      "#sc-iframe{flex:1;width:100%;border:none;background:#000;display:block}",

      ".dc-discord .dc-icon{color:#5865f2}",
      ".dc-discord .dc-label{color:#7289da;font-family:'Courier New',Courier,monospace;font-size:17px;font-weight:700;letter-spacing:.5px;line-height:1}",
      ".dc-discord .dc-desc{color:#3a3a3a;font-size:12px;line-height:1.7;font-weight:400}",
      ".dc-discord .dc-arrow{color:#1c1c1c}",
      ".dc-discord:hover{background:#0d0d0d}",
      ".dc-discord:hover .dc-arrow{gap:10px;color:#5865f2}",
      ".dir-card{text-decoration:none}",
      "#dir-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}",
      "#dir-logo-big{font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:700;line-height:1;user-select:none;margin-bottom:10px;text-align:center;letter-spacing:1px}",
      "#dir-logo-big .la{color:#00ff9d}",
      "#dir-logo-big .lb{color:#00994d}",
      "#dir-tagline{font-size:12px;color:#333;margin-bottom:52px;text-align:center;font-weight:400}",
      "#dir-cards{display:flex;gap:1px;background:#111}",
      ".dir-card{width:240px;background:#000;padding:36px 28px;display:flex;flex-direction:column;gap:16px;cursor:pointer;transition:background .12s}",
      ".dir-card:hover{background:#0d0d0d}",
      ".dc-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:18px;border:1px solid #1c1c1c;border-radius:3px}",
      ".dc-games .dc-icon{color:#00ff9d}",
      ".dc-apps .dc-icon{color:#00b8d8}",
      ".dc-label{font-family:'Courier New',Courier,monospace;font-size:17px;font-weight:700;letter-spacing:.5px;line-height:1}",
      ".dc-games .dc-label{color:#00ff9d}",
      ".dc-apps .dc-label{color:#00c8e8}",
      ".dc-desc{font-size:12px;line-height:1.7;color:#3a3a3a;font-weight:400}",
      ".dc-arrow{margin-top:auto;font-size:11px;font-weight:700;display:flex;align-items:center;gap:6px;transition:gap .15s;color:#1c1c1c}",
      ".dir-card:hover .dc-arrow{gap:10px}",
      ".dc-games:hover .dc-arrow{color:#00ff9d}",
      ".dc-apps:hover .dc-arrow{color:#00b8d8}",

      "@media(max-width:600px){",
      "#sc-header{padding:10px 14px;gap:12px}",
      "#sc-logo{font-size:14px}",
      "#sc-stats{display:none}",
      "#sc-body{padding:18px 14px 60px}",
      ".sc-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}",
      ".sc-thumb{height:118px}",
      "#dir-logo-big{font-size:28px}",
      "#dir-cards{flex-direction:column;gap:1px;align-items:center}",
      ".dir-card{width:100%;max-width:320px;padding:26px 22px}",
      "#dir-tagline{margin-bottom:36px}",
      "}",
    ].join("");
    document.head.appendChild(st);
  }

  function loadScript(src, cb) {
    var s = document.createElement("script");
    s.src = src; s.onload = cb;
    document.head.appendChild(s);
  }

  function initParticles() {
    if (typeof particlesJS === "undefined") return;
    try {
      particlesJS("sc-particles", {
        particles:{
          number:{value:80,density:{enable:true,value_area:800}},
          color:{value:"#00ff9d"},
          shape:{type:"circle",stroke:{width:0,color:"#000000"}},
          opacity:{value:1,random:false,anim:{enable:true,speed:1,opacity_min:0.1,sync:false}},
          size:{value:8,random:false,anim:{enable:false,speed:40,size_min:0.1,sync:false}},
          line_linked:{enable:false},
          move:{enable:true,speed:17.6,direction:"bottom",random:false,straight:false,out_mode:"out",bounce:false,attract:{enable:false,rotateX:600,rotateY:1200}}
        },
        interactivity:{
          detect_on:"canvas",
          events:{onhover:{enable:false},onclick:{enable:false},resize:true}
        },
        retina_detect:true
      });
    } catch(e) {}
  }

  function buildDOM() {
    document.title = "Classlink - Home";
    var favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.href = "https://www.classlink.com/hubfs/ClassLink-2022/favicons/favicon-32x32.png";
    favicon.type = "image/png";
    document.head.appendChild(favicon);
    document.body.innerHTML = "";

    var loader = document.createElement("div");
    loader.id = "sc-loader";
    loader.innerHTML = "<div id=\"sc-loader-text\">loading, be patient...</div>";
    document.body.appendChild(loader);

    var frag = document.createDocumentFragment();

    var root = document.createElement("div");
    root.id = "sc-root";
    root.innerHTML =
      "<header id=\"sc-header\" style=\"display:none\">"
      +"<div id=\"sc-logo\" tabindex=\"0\" role=\"button\" aria-label=\"Home\"><span class=\"la\">solo</span><span class=\"lb\"> central</span></div>"
      +"<div id=\"sc-search-wrap\">"
      +"<div id=\"sc-search-row\">"
      +"<i class=\"fa-solid fa-magnifying-glass sc-si\"></i>"
      +"<input id=\"sc-search\" type=\"text\" placeholder=\"search...\" autocomplete=\"off\" spellcheck=\"false\" aria-label=\"Search\"/>"
      +"</div>"
      +"<div id=\"sc-ac\" role=\"listbox\"></div>"
      +"</div>"
      +"<div id=\"sc-stats\">...</div>"
      +"</header>"

      +"<div id=\"dir-center\">"
      +"<div id=\"dir-logo-big\"><span class=\"la\">solo</span><span class=\"lb\"> central</span></div>"
      +"<div id=\"dir-tagline\">choose your destination</div>"
      +"<div id=\"dir-cards\">"
      +"<div class=\"dir-card dc-games\" data-view=\"games\" tabindex=\"0\" role=\"button\">"
      +"<div class=\"dc-icon\"><i class=\"fa-solid fa-gamepad\"></i></div>"
      +"<div class=\"dc-label\">games</div>"
      +"<div class=\"dc-desc\">unblocked browser games.<br>play anything, anywhere.</div>"
      +"<div class=\"dc-arrow\"><span>enter</span><i class=\"fa-solid fa-arrow-right\"></i></div>"
      +"</div>"
      +"<div class=\"dir-card dc-apps\" data-view=\"apps\" tabindex=\"0\" role=\"button\">"
      +"<div class=\"dc-icon\"><i class=\"fa-solid fa-grip\"></i></div>"
      +"<div class=\"dc-label\">apps</div>"
      +"<div class=\"dc-desc\">utilities and tools.<br>get stuff done, unblocked.</div>"
      +"<div class=\"dc-arrow\"><span>enter</span><i class=\"fa-solid fa-arrow-right\"></i></div>"
      +"</div>"
      +"<a class=\"dir-card dc-discord\" href=\"https://discord.gg/FpVBBuWxwG\" target=\"_blank\" rel=\"noopener\" tabindex=\"0\">"
      +"<div class=\"dc-icon\"><i class=\"fa-brands fa-discord\"></i></div>"
      +"<div class=\"dc-label\">discord</div>"
      +"<div class=\"dc-desc\">hang out, suggest games, get updates.</div>"
      +"<div class=\"dc-arrow\"><span>join</span><i class=\"fa-solid fa-arrow-right\"></i></div>"
      +"</a>"
      +"</div>"
      +"</div>"

      +"<div id=\"sc-body\" style=\"display:none\"><div id=\"sc-main\" role=\"main\" aria-live=\"polite\"></div></div>"
      +"<div id=\"sc-footer\">solo central</div>"

      +"<div id=\"sc-modal\" role=\"dialog\" aria-modal=\"true\">"
      +"<div id=\"sc-mbar\">"
      +"<div id=\"sc-mthumb\"><img id=\"sc-mthumb-img\" src=\"\" alt=\"\"/></div>"
      +"<div class=\"sc-mmeta\"><span id=\"sc-modal-name\"></span><span id=\"sc-modal-author\"></span></div>"
      +"<button id=\"sc-newtab\" type=\"button\"><i class=\"fa-solid fa-arrow-up-right-from-square\"></i> open tab</button>"
      +"<button id=\"sc-close\" type=\"button\" aria-label=\"Close\"><i class=\"fa-solid fa-xmark\"></i></button>"
      +"</div>"
      +"<iframe id=\"sc-iframe\" title=\"Frame\" allow=\"fullscreen;autoplay;encrypted-media;gamepad\" sandbox=\"allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-modals allow-top-navigation-by-user-activation\"></iframe>"
      +"</div>";

    frag.appendChild(root);
    document.body.appendChild(frag);
  }

  function bindEvents() {
    document.getElementById("sc-logo").addEventListener("click", function(){ navigate("dir"); });
    document.getElementById("sc-logo").addEventListener("keydown", function(e){ if(e.key==="Enter") navigate("dir"); });
    document.querySelectorAll(".dir-card").forEach(function(c){
      c.addEventListener("click", function(){ navigate(c.dataset.view); });
      c.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" ") navigate(c.dataset.view); });
    });
    var se = document.getElementById("sc-search");
    se.addEventListener("input", function(){
      state.q = this.value.trim();
      buildAC(this.value.trim());
      renderView();
    });
    se.addEventListener("keydown", function(e){
      var items = document.querySelectorAll(".sc-ac-item");
      if      (e.key==="ArrowDown")                             { e.preventDefault(); highlightAC(Math.min(acKb+1,items.length-1)); }
      else if (e.key==="ArrowUp")                              { e.preventDefault(); highlightAC(Math.max(acKb-1,0)); }
      else if (e.key==="Enter"&&acKb>=0&&items[acKb])         { items[acKb].dispatchEvent(new MouseEvent("mousedown")); }
      else if (e.key==="Escape")                               { closeAC(); }
    });
    se.addEventListener("blur",  function(){ setTimeout(closeAC, 150); });
    se.addEventListener("focus", function(){ if(this.value.trim()) buildAC(this.value.trim()); });
    document.getElementById("sc-close").addEventListener("click", closeModal);
    document.getElementById("sc-newtab").addEventListener("click", function(){
      var t = state.game||state.appGame;
      if(t) window.open(t.url,"_blank","noopener");
    });
    document.addEventListener("keydown", function(e){
      if(e.key==="Escape"&&(state.game||state.appGame)) closeModal();
    });
  }

  function fetchGames() {
    fetch(JSON_URL)
      .then(function(r){ return r.json(); })
      .then(function(raw){
        state.games  = raw.filter(function(g){ return g.id>=0; }).map(resolveGame);
        state.loaded = true;
        var el = document.getElementById("sc-stats");
        if(el) el.innerHTML = "<b>"+state.games.length+"</b> games";
        if(state.view==="games") renderView();
      })
      .catch(function(){
        state.loaded = true;
        if(state.view==="games"){
          var m = document.getElementById("sc-main");
          if(m) m.innerHTML = "<div class=\"sc-empty\"><i class=\"fa-solid fa-triangle-exclamation\"></i><span>couldn't load games.</span></div>";
        }
      });
  }

  function initLoader() {
    loadScript("https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js", function(){
      if (typeof particlesJS === "undefined") return;
      var canvas = document.createElement("canvas");
      var loader = document.getElementById("sc-loader");
      if (!loader) return;
      loader.insertBefore(canvas, loader.firstChild);
      try {
        particlesJS("sc-loader", {
          particles:{
            number:{value:80,density:{enable:true,value_area:800}},
            color:{value:"#ffffff"},
            shape:{type:"circle",stroke:{width:0,color:"#000000"}},
            opacity:{value:1,random:false,anim:{enable:false,speed:1,opacity_min:0.1,sync:false}},
            size:{value:4,random:true,anim:{enable:false,speed:40,size_min:0.1,sync:false}},
            line_linked:{enable:false},
            move:{enable:true,speed:36.9,direction:"left",random:true,straight:true,out_mode:"out",bounce:false,attract:{enable:false,rotateX:600,rotateY:1200}}
          },
          interactivity:{detect_on:"canvas",events:{onhover:{enable:false},onclick:{enable:false},resize:true}},
          retina_detect:true
        });
      } catch(e){}
    });

    var dismissLoader = function() {
      var loader = document.getElementById("sc-loader");
      if (!loader || loader.classList.contains("fade")) return;
      loader.classList.add("fade");
      setTimeout(function(){ if(loader.parentNode) loader.parentNode.removeChild(loader); }, 450);
    };

    if (document.readyState === "complete") {
      setTimeout(dismissLoader, 800);
    } else {
      window.addEventListener("load", function(){ setTimeout(dismissLoader, 800); });
    }
  }

  function init() {
    injectStyles();
    buildDOM();
    bindEvents();
    renderView();
    fetchGames();
    initLoader();
  }

  if (document.readyState==="loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
