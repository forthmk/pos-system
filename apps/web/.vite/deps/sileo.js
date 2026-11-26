"use client";
import {
  motion
} from "./chunk-7IEJ3WBO.js";
import {
  require_jsx_runtime
} from "./chunk-WE65ZARB.js";
import {
  require_react
} from "./chunk-7BGEIFR7.js";
import {
  __toESM
} from "./chunk-SNAQBZPT.js";

// ../../node_modules/.pnpm/sileo@0.1.5_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/sileo/dist/cc-B6peeNak.mjs
function _extends() {
  _extends = Object.assign || function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _object_without_properties_loose(source, excluded) {
  if (source == null) return {};
  var target = {}, sourceKeys = Object.getOwnPropertyNames(source), key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
    target[key] = source[key];
  }
  return target;
}

// ../../node_modules/.pnpm/sileo@0.1.5_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/sileo/dist/index.mjs
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var import_react = __toESM(require_react(), 1);

// ../../node_modules/.pnpm/motion@12.43.0_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/motion/dist/es/react.mjs
var motion2 = motion;

// ../../node_modules/.pnpm/sileo@0.1.5_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/sileo/dist/index.mjs
function __insertCSS(code) {
  if (!code || typeof document == "undefined") return;
  let head = document.head || document.getElementsByTagName("head")[0];
  let style = document.createElement("style");
  style.type = "text/css";
  head.appendChild(style);
  style.styleSheet ? style.styleSheet.cssText = code : style.appendChild(document.createTextNode(code));
}
__insertCSS(":root{--sileo-spring-easing:linear(\n		0,\n		0.002 0.6%,\n		0.007 1.2%,\n		0.015 1.8%,\n		0.026 2.4%,\n		0.041 3.1%,\n		0.06 3.8%,\n		0.108 5.3%,\n		0.157 6.6%,\n		0.214 8%,\n		0.467 13.7%,\n		0.577 16.3%,\n		0.631 17.7%,\n		0.682 19.1%,\n		0.73 20.5%,\n		0.771 21.8%,\n		0.808 23.1%,\n		0.844 24.5%,\n		0.874 25.8%,\n		0.903 27.2%,\n		0.928 28.6%,\n		0.952 30.1%,\n		0.972 31.6%,\n		0.988 33.1%,\n		1.01 35.7%,\n		1.025 38.5%,\n		1.034 41.6%,\n		1.038 45%,\n		1.035 50.1%,\n		1.012 64.2%,\n		1.003 73%,\n		0.999 83.7%,\n		1\n	);--sileo-duration:600ms;--sileo-height:40px;--sileo-width:350px;--sileo-state-success:oklch(0.723 0.219 142.136);--sileo-state-loading:oklch(0.556 0 0);--sileo-state-error:oklch(0.637 0.237 25.331);--sileo-state-warning:oklch(0.795 0.184 86.047);--sileo-state-info:oklch(0.685 0.169 237.323);--sileo-state-action:oklch(0.623 0.214 259.815)}[data-sileo-toast]{position:relative;cursor:pointer;pointer-events:auto;touch-action:none;border:0;background:0 0;padding:0;width:var(--sileo-width);height:var(--_h,var(--sileo-height));opacity:0;transform:translateZ(0) scale(.95);transform-origin:center;contain:layout style;overflow:visible}[data-sileo-toast][data-state=loading]{cursor:default}[data-sileo-toast][data-ready=true]{opacity:1;transform:translateZ(0) scale(1);transition:transform calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),opacity calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),margin-bottom calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),margin-top calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),height var(--sileo-duration) var(--sileo-spring-easing)}[data-sileo-viewport][data-position^=top] [data-sileo-toast]:not([data-ready=true]){transform:translateY(-6px) scale(.95)}[data-sileo-viewport][data-position^=bottom] [data-sileo-toast]:not([data-ready=true]){transform:translateY(6px) scale(.95)}[data-sileo-toast][data-ready=true][data-exiting=true]{opacity:0;pointer-events:none}[data-sileo-viewport][data-position^=top] [data-sileo-toast][data-ready=true][data-exiting=true]{transform:translateY(-6px) scale(.95)}[data-sileo-viewport][data-position^=bottom] [data-sileo-toast][data-ready=true][data-exiting=true]{transform:translateY(6px) scale(.95)}[data-sileo-canvas]{position:absolute;left:0;right:0;pointer-events:none;transform:translateZ(0);contain:layout style;overflow:visible}[data-sileo-canvas][data-edge=top]{bottom:0;transform:scaleY(-1) translateZ(0)}[data-sileo-canvas][data-edge=bottom]{top:0}[data-sileo-svg]{overflow:visible}[data-sileo-header]{position:absolute;z-index:20;display:flex;align-items:center;padding:.5rem;height:var(--sileo-height);overflow:hidden;left:var(--_px,0);transform:var(--_ht);max-width:var(--_pw)}[data-sileo-toast][data-ready=true] [data-sileo-header]{transition:transform var(--sileo-duration) var(--sileo-spring-easing),left var(--sileo-duration) var(--sileo-spring-easing),max-width var(--sileo-duration) var(--sileo-spring-easing)}[data-sileo-header][data-edge=top]{bottom:0}[data-sileo-header][data-edge=bottom]{top:0}[data-sileo-header-stack]{position:relative;display:inline-flex;align-items:center;height:100%}[data-sileo-header-inner]{display:flex;align-items:center;gap:.5rem;white-space:nowrap;opacity:1;filter:blur(0px);transform:translateZ(0)}[data-sileo-header-inner][data-layer=current]{position:relative;z-index:1;animation:sileo-header-enter var(--sileo-duration) var(--sileo-spring-easing) both}[data-sileo-header-inner][data-exiting=true],[data-sileo-header-inner][data-layer=current]:not(:only-child){will-change:opacity,filter}[data-sileo-header-inner][data-layer=prev]{position:absolute;left:0;top:0;z-index:0;pointer-events:none}[data-sileo-header-inner][data-exiting=true]{animation:sileo-header-exit calc(var(--sileo-duration) * .7) ease forwards}[data-sileo-badge]{display:flex;height:24px;width:24px;flex-shrink:0;align-items:center;justify-content:center;padding:2px;box-sizing:border-box;border-radius:9999px;color:var(--sileo-tone,currentColor);background-color:var(--sileo-tone-bg,transparent)}[data-sileo-title]{font-size:.825rem;line-height:1rem;font-weight:500;text-transform:capitalize;color:var(--sileo-tone,currentColor)}:is([data-sileo-badge],[data-sileo-title],[data-sileo-button])[data-state]{--_c:var(--sileo-state-success)}:is(\n[data-sileo-badge],[data-sileo-title],[data-sileo-button]\n)[data-state=loading]{--_c:var(--sileo-state-loading)}:is(\n[data-sileo-badge],[data-sileo-title],[data-sileo-button]\n)[data-state=error]{--_c:var(--sileo-state-error)}:is(\n[data-sileo-badge],[data-sileo-title],[data-sileo-button]\n)[data-state=warning]{--_c:var(--sileo-state-warning)}:is(\n[data-sileo-badge],[data-sileo-title],[data-sileo-button]\n)[data-state=info]{--_c:var(--sileo-state-info)}:is(\n[data-sileo-badge],[data-sileo-title],[data-sileo-button]\n)[data-state=action]{--_c:var(--sileo-state-action)}:is([data-sileo-badge],[data-sileo-title])[data-state]{--sileo-tone:var(--_c);--sileo-tone-bg:color-mix(in oklch, var(--_c) 20%, transparent)}[data-sileo-content]{position:absolute;left:0;z-index:10;width:100%;pointer-events:none;opacity:var(--_co, 0)}[data-sileo-content]:not([data-visible=true]){content-visibility:hidden}[data-sileo-toast][data-ready=true] [data-sileo-content]{transition:opacity calc(var(--sileo-duration) * .08) ease calc(var(--sileo-duration) * .04)}[data-sileo-content][data-edge=top]{top:0}[data-sileo-content][data-edge=bottom]{top:var(--sileo-height)}[data-sileo-content][data-visible=true]{pointer-events:auto}[data-sileo-toast][data-ready=true] [data-sileo-content][data-visible=true]{transition:opacity calc(var(--sileo-duration) * .6) ease calc(var(--sileo-duration) * .3)}[data-sileo-description]{width:100%;text-align:left;padding:1rem;font-size:.875rem;line-height:1.25rem;contain:layout style paint;content-visibility:auto}[data-sileo-button]{display:flex;align-items:center;justify-content:center;height:1.75rem;padding:0 .625rem;margin-top:.75rem;border-radius:9999px;border:0;font-size:.75rem;font-weight:500;cursor:pointer;color:var(--sileo-btn-color,currentColor);background-color:var(--sileo-btn-bg,transparent);transition:background-color 150ms ease}[data-sileo-button]:hover{background-color:var(--sileo-btn-bg-hover,transparent)}[data-sileo-button][data-state]{--sileo-btn-color:var(--_c);--sileo-btn-bg:color-mix(in oklch, var(--_c) 15%, transparent);--sileo-btn-bg-hover:color-mix(in oklch, var(--_c) 25%, transparent)}[data-sileo-icon=spin]{animation:sileo-spin 1s linear infinite}@keyframes sileo-spin{to{transform:rotate(360deg)}}@keyframes sileo-header-enter{from{opacity:0;filter:blur(6px)}to{opacity:1;filter:blur(0px)}}@keyframes sileo-header-exit{from{opacity:1;filter:blur(0px)}to{opacity:0;filter:blur(6px)}}[data-sileo-viewport]{position:fixed;z-index:50;display:flex;gap:.75rem;padding:.75rem;pointer-events:none;max-width:calc(100vw - 1.5rem);contain:layout style}[data-sileo-viewport][data-position^=top] [data-sileo-toast]:not([data-ready=true]){margin-bottom:calc(-1 * (var(--sileo-height) + .75rem))}[data-sileo-viewport][data-position^=bottom] [data-sileo-toast]:not([data-ready=true]){margin-top:calc(-1 * (var(--sileo-height) + .75rem))}[data-sileo-viewport][data-position^=top]{top:0;flex-direction:column-reverse}[data-sileo-viewport][data-position^=bottom]{bottom:0;flex-direction:column}[data-sileo-viewport][data-position$=left]{left:0;align-items:flex-start}[data-sileo-viewport][data-position$=right]{right:0;align-items:flex-end}[data-sileo-viewport][data-position$=center]{left:50%;transform:translateX(-50%);align-items:center}@media (prefers-reduced-motion:no-preference){[data-sileo-toast][data-ready=true]:hover,[data-sileo-toast][data-ready=true][data-exiting=true]{will-change:transform,opacity,height}}@media (prefers-reduced-motion:reduce){[data-sileo-viewport],[data-sileo-viewport] *,[data-sileo-viewport] ::after,[data-sileo-viewport] ::before{animation-duration:0s;animation-iteration-count:1;transition-duration:0s}}[data-sileo-viewport][data-theme=dark] [data-sileo-description]{color:rgba(0,0,0,.5)}[data-sileo-viewport][data-theme=light] [data-sileo-description]{color:rgba(255,255,255,.5)}");
var HEIGHT = 40;
var WIDTH = 350;
var DEFAULT_ROUNDNESS = 16;
var DURATION_MS = 600;
var DURATION_S = DURATION_MS / 1e3;
var DEFAULT_TOAST_DURATION = 6e3;
var EXIT_DURATION = DEFAULT_TOAST_DURATION * 0.1;
var AUTO_EXPAND_DELAY = DEFAULT_TOAST_DURATION * 0.025;
var AUTO_COLLAPSE_DELAY = DEFAULT_TOAST_DURATION - 2e3;
var SPRING = {
  type: "spring",
  bounce: 0.25,
  duration: DURATION_S
};
var BLUR_RATIO = 0.5;
var PILL_PADDING = 10;
var MIN_EXPAND_RATIO = 2.25;
var SWAP_COLLAPSE_MS = 200;
var HEADER_EXIT_MS = DURATION_MS * 0.7;
var Icon = (_0) => {
  let { title, children } = _0, props = _object_without_properties_loose(_0, [
    "title",
    "children"
  ]);
  return (0, import_jsx_runtime.jsxs)("svg", _extends({}, props, {
    xmlns: "http://www.w3.org/2000/svg",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    children: [
      (0, import_jsx_runtime.jsx)("title", {
        children: title
      }),
      children
    ]
  }));
};
var ArrowRight = () => (0, import_jsx_runtime.jsxs)(Icon, {
  title: "Arrow Right",
  children: [
    (0, import_jsx_runtime.jsx)("path", {
      d: "M5 12h14"
    }),
    (0, import_jsx_runtime.jsx)("path", {
      d: "m12 5 7 7-7 7"
    })
  ]
});
var LifeBuoy = () => (0, import_jsx_runtime.jsxs)(Icon, {
  title: "Life Buoy",
  children: [
    (0, import_jsx_runtime.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    (0, import_jsx_runtime.jsx)("path", {
      d: "m4.93 4.93 4.24 4.24"
    }),
    (0, import_jsx_runtime.jsx)("path", {
      d: "m14.83 9.17 4.24-4.24"
    }),
    (0, import_jsx_runtime.jsx)("path", {
      d: "m14.83 14.83 4.24 4.24"
    }),
    (0, import_jsx_runtime.jsx)("path", {
      d: "m9.17 14.83-4.24 4.24"
    }),
    (0, import_jsx_runtime.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "4"
    })
  ]
});
var LoaderCircle = (props) => (0, import_jsx_runtime.jsx)(Icon, _extends({
  title: "Loader Circle"
}, props, {
  children: (0, import_jsx_runtime.jsx)("path", {
    d: "M21 12a9 9 0 1 1-6.219-8.56"
  })
}));
var X = () => (0, import_jsx_runtime.jsxs)(Icon, {
  title: "X",
  children: [
    (0, import_jsx_runtime.jsx)("path", {
      d: "M18 6 6 18"
    }),
    (0, import_jsx_runtime.jsx)("path", {
      d: "m6 6 12 12"
    })
  ]
});
var CircleAlert = () => (0, import_jsx_runtime.jsxs)(Icon, {
  title: "Circle Alert",
  children: [
    (0, import_jsx_runtime.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    (0, import_jsx_runtime.jsx)("line", {
      x1: "12",
      x2: "12",
      y1: "8",
      y2: "12"
    }),
    (0, import_jsx_runtime.jsx)("line", {
      x1: "12",
      x2: "12.01",
      y1: "16",
      y2: "16"
    })
  ]
});
var Check = () => (0, import_jsx_runtime.jsx)(Icon, {
  title: "Check",
  children: (0, import_jsx_runtime.jsx)("path", {
    d: "M20 6 9 17l-5-5"
  })
});
var STATE_ICON = {
  success: (0, import_jsx_runtime.jsx)(Check, {}),
  loading: (0, import_jsx_runtime.jsx)(LoaderCircle, {
    "data-sileo-icon": "spin",
    "aria-hidden": "true"
  }),
  error: (0, import_jsx_runtime.jsx)(X, {}),
  warning: (0, import_jsx_runtime.jsx)(CircleAlert, {}),
  info: (0, import_jsx_runtime.jsx)(LifeBuoy, {}),
  action: (0, import_jsx_runtime.jsx)(ArrowRight, {})
};
var GooeyDefs = (0, import_react.memo)(function GooeyDefs2({ filterId, blur }) {
  return (0, import_jsx_runtime.jsx)("defs", {
    children: (0, import_jsx_runtime.jsxs)("filter", {
      id: filterId,
      x: "-20%",
      y: "-20%",
      width: "140%",
      height: "140%",
      colorInterpolationFilters: "sRGB",
      children: [
        (0, import_jsx_runtime.jsx)("feGaussianBlur", {
          in: "SourceGraphic",
          stdDeviation: blur,
          result: "blur"
        }),
        (0, import_jsx_runtime.jsx)("feColorMatrix", {
          in: "blur",
          mode: "matrix",
          values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10",
          result: "goo"
        }),
        (0, import_jsx_runtime.jsx)("feComposite", {
          in: "SourceGraphic",
          in2: "goo",
          operator: "atop"
        })
      ]
    })
  });
});
var Sileo = (0, import_react.memo)(function Sileo2({ id, fill = "#FFFFFF", state = "success", title = state, description, position = "left", expand = "bottom", className, icon, styles, button, roundness, exiting = false, autoExpandDelayMs, autoCollapseDelayMs, canExpand, interruptKey, refreshKey, onMouseEnter, onMouseLeave, onDismiss }) {
  var _headerLayer_current_view_icon, _headerLayer_prev_view_icon;
  var _headerLayer_current_view_styles, _headerLayer_current_view_styles1, _headerLayer_prev_view_styles, _headerLayer_prev_view_styles1, _view_styles, _view_styles1;
  const next = (0, import_react.useMemo)(() => ({
    title,
    description,
    state,
    icon,
    styles,
    button,
    fill
  }), [
    title,
    description,
    state,
    icon,
    styles,
    button,
    fill
  ]);
  const [view, setView] = (0, import_react.useState)(next);
  const [applied, setApplied] = (0, import_react.useState)(refreshKey);
  const [isExpanded, setIsExpanded] = (0, import_react.useState)(false);
  const [ready, setReady] = (0, import_react.useState)(false);
  const [pillWidth, setPillWidth] = (0, import_react.useState)(0);
  const [contentHeight, setContentHeight] = (0, import_react.useState)(0);
  const hasDesc = Boolean(view.description) || Boolean(view.button);
  const isLoading = view.state === "loading";
  const open = hasDesc && isExpanded && !isLoading;
  const allowExpand = isLoading ? false : canExpand != null ? canExpand : !interruptKey || interruptKey === id;
  const headerKey = `${view.state}-${view.title}`;
  const filterId = `sileo-gooey-${id}`;
  const resolvedRoundness = Math.max(0, roundness != null ? roundness : DEFAULT_ROUNDNESS);
  const blur = resolvedRoundness * BLUR_RATIO;
  const headerRef = (0, import_react.useRef)(null);
  const contentRef = (0, import_react.useRef)(null);
  const headerExitRef = (0, import_react.useRef)(null);
  const autoExpandRef = (0, import_react.useRef)(null);
  const autoCollapseRef = (0, import_react.useRef)(null);
  const swapTimerRef = (0, import_react.useRef)(null);
  const lastRefreshKeyRef = (0, import_react.useRef)(refreshKey);
  const pendingRef = (0, import_react.useRef)(null);
  const [headerLayer, setHeaderLayer] = (0, import_react.useState)({
    current: {
      key: headerKey,
      view
    },
    prev: null
  });
  const innerRef = (0, import_react.useRef)(null);
  const headerPadRef = (0, import_react.useRef)(null);
  const pillRoRef = (0, import_react.useRef)(null);
  const pillRafRef = (0, import_react.useRef)(0);
  const pillObservedRef = (0, import_react.useRef)(null);
  (0, import_react.useLayoutEffect)(() => {
    const el = innerRef.current;
    const header = headerRef.current;
    if (!el || !header) return;
    if (headerPadRef.current === null) {
      const cs = getComputedStyle(header);
      headerPadRef.current = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    }
    const px = headerPadRef.current;
    const measure = () => {
      const w = el.scrollWidth + px + PILL_PADDING;
      if (w > PILL_PADDING) {
        setPillWidth((prev) => prev === w ? prev : w);
      }
    };
    measure();
    if (!pillRoRef.current) {
      pillRoRef.current = new ResizeObserver(() => {
        cancelAnimationFrame(pillRafRef.current);
        pillRafRef.current = requestAnimationFrame(() => {
          var _headerPadRef_current;
          const inner = innerRef.current;
          const pad = (_headerPadRef_current = headerPadRef.current) != null ? _headerPadRef_current : 0;
          if (!inner) return;
          const w = inner.scrollWidth + pad + PILL_PADDING;
          if (w > PILL_PADDING) {
            setPillWidth((prev) => prev === w ? prev : w);
          }
        });
      });
    }
    if (pillObservedRef.current !== el) {
      if (pillObservedRef.current) {
        pillRoRef.current.unobserve(pillObservedRef.current);
      }
      pillRoRef.current.observe(el);
      pillObservedRef.current = el;
    }
  }, [
    headerLayer.current.key
  ]);
  (0, import_react.useEffect)(() => {
    return () => {
      var _pillRoRef_current;
      cancelAnimationFrame(pillRafRef.current);
      (_pillRoRef_current = pillRoRef.current) == null ? void 0 : _pillRoRef_current.disconnect();
    };
  }, []);
  (0, import_react.useLayoutEffect)(() => {
    if (!hasDesc) {
      setContentHeight(0);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight;
      setContentHeight((prev) => prev === h ? prev : h);
    };
    measure();
    let rafId = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [
    hasDesc
  ]);
  (0, import_react.useEffect)(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  (0, import_react.useLayoutEffect)(() => {
    setHeaderLayer((state2) => {
      if (state2.current.key === headerKey) {
        if (state2.current.view === view) return state2;
        return _extends({}, state2, {
          current: {
            key: headerKey,
            view
          }
        });
      }
      return {
        prev: state2.current,
        current: {
          key: headerKey,
          view
        }
      };
    });
  }, [
    headerKey,
    view
  ]);
  (0, import_react.useEffect)(() => {
    if (!headerLayer.prev) return;
    if (headerExitRef.current) {
      clearTimeout(headerExitRef.current);
    }
    headerExitRef.current = window.setTimeout(() => {
      headerExitRef.current = null;
      setHeaderLayer((state2) => _extends({}, state2, {
        prev: null
      }));
    }, HEADER_EXIT_MS);
    return () => {
      if (headerExitRef.current) {
        clearTimeout(headerExitRef.current);
        headerExitRef.current = null;
      }
    };
  }, [
    headerLayer.prev
  ]);
  (0, import_react.useEffect)(() => {
    setView((prev) => prev.fill === fill ? prev : _extends({}, prev, {
      fill
    }));
  }, [
    fill
  ]);
  (0, import_react.useEffect)(() => {
    if (refreshKey === void 0) {
      setView(next);
      setApplied(void 0);
      pendingRef.current = null;
      lastRefreshKeyRef.current = refreshKey;
      return;
    }
    if (lastRefreshKeyRef.current === refreshKey) return;
    lastRefreshKeyRef.current = refreshKey;
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
    if (open) {
      pendingRef.current = {
        key: refreshKey,
        payload: next
      };
      setIsExpanded(false);
      swapTimerRef.current = window.setTimeout(() => {
        swapTimerRef.current = null;
        const pending = pendingRef.current;
        if (!pending) return;
        setView(pending.payload);
        setApplied(pending.key);
        pendingRef.current = null;
      }, SWAP_COLLAPSE_MS);
    } else {
      pendingRef.current = null;
      setView(next);
      setApplied(refreshKey);
    }
  }, [
    open,
    refreshKey,
    next
  ]);
  (0, import_react.useEffect)(() => {
    if (!hasDesc) return;
    if (autoExpandRef.current) clearTimeout(autoExpandRef.current);
    if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    if (exiting || !allowExpand) {
      setIsExpanded(false);
      return;
    }
    if (autoExpandDelayMs == null && autoCollapseDelayMs == null) return;
    const expandDelay = autoExpandDelayMs != null ? autoExpandDelayMs : 0;
    const collapseDelay = autoCollapseDelayMs != null ? autoCollapseDelayMs : 0;
    if (expandDelay > 0) {
      autoExpandRef.current = window.setTimeout(() => setIsExpanded(true), expandDelay);
    } else {
      setIsExpanded(true);
    }
    if (collapseDelay > 0) {
      autoCollapseRef.current = window.setTimeout(() => setIsExpanded(false), collapseDelay);
    }
    return () => {
      if (autoExpandRef.current) clearTimeout(autoExpandRef.current);
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    };
  }, [
    autoCollapseDelayMs,
    autoExpandDelayMs,
    hasDesc,
    allowExpand,
    exiting,
    applied
  ]);
  const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
  const rawExpanded = hasDesc ? Math.max(minExpanded, HEIGHT + contentHeight) : minExpanded;
  const frozenExpandedRef = (0, import_react.useRef)(rawExpanded);
  if (open) {
    frozenExpandedRef.current = rawExpanded;
  }
  const expanded = open ? rawExpanded : frozenExpandedRef.current;
  const svgHeight = hasDesc ? Math.max(expanded, minExpanded) : HEIGHT;
  const expandedContent = Math.max(0, expanded - HEIGHT);
  const resolvedPillWidth = Math.max(pillWidth || HEIGHT, HEIGHT);
  const pillHeight = HEIGHT + blur * 3;
  const pillX = position === "right" ? WIDTH - resolvedPillWidth : position === "center" ? (WIDTH - resolvedPillWidth) / 2 : 0;
  const pillAnimate = (0, import_react.useMemo)(() => ({
    x: pillX,
    width: resolvedPillWidth,
    height: open ? pillHeight : HEIGHT
  }), [
    pillX,
    resolvedPillWidth,
    open,
    pillHeight
  ]);
  const bodyAnimate = (0, import_react.useMemo)(() => ({
    height: open ? expandedContent : 0,
    opacity: open ? 1 : 0
  }), [
    open,
    expandedContent
  ]);
  const bodyTransition = (0, import_react.useMemo)(() => open ? SPRING : _extends({}, SPRING, {
    bounce: 0
  }), [
    open
  ]);
  const pillTransition = (0, import_react.useMemo)(() => ready ? SPRING : {
    duration: 0
  }, [
    ready
  ]);
  const viewBox = `0 0 ${WIDTH} ${svgHeight}`;
  const canvasStyle = (0, import_react.useMemo)(() => ({
    filter: `url(#${filterId})`
  }), [
    filterId
  ]);
  const rootStyle = (0, import_react.useMemo)(() => ({
    "--_h": `${open ? expanded : HEIGHT}px`,
    "--_pw": `${resolvedPillWidth}px`,
    "--_px": `${pillX}px`,
    "--_ht": `translateY(${open ? expand === "bottom" ? 3 : -3 : 0}px) scale(${open ? 0.9 : 1})`,
    "--_co": `${open ? 1 : 0}`
  }), [
    open,
    expanded,
    resolvedPillWidth,
    pillX,
    expand
  ]);
  const handleEnter = (0, import_react.useCallback)((e) => {
    onMouseEnter == null ? void 0 : onMouseEnter(e);
    if (hasDesc) setIsExpanded(true);
  }, [
    hasDesc,
    onMouseEnter
  ]);
  const handleLeave = (0, import_react.useCallback)((e) => {
    onMouseLeave == null ? void 0 : onMouseLeave(e);
    setIsExpanded(false);
  }, [
    onMouseLeave
  ]);
  const handleTransitionEnd = (0, import_react.useCallback)((e) => {
    if (e.propertyName !== "height" && e.propertyName !== "transform") return;
    if (open) return;
    const pending = pendingRef.current;
    if (!pending) return;
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
    setView(pending.payload);
    setApplied(pending.key);
    pendingRef.current = null;
  }, [
    open
  ]);
  const SWIPE_DISMISS = 30;
  const SWIPE_MAX = 20;
  const buttonRef = (0, import_react.useRef)(null);
  const pointerStartRef = (0, import_react.useRef)(null);
  const onDismissRef = (0, import_react.useRef)(onDismiss);
  onDismissRef.current = onDismiss;
  const swipeHandlersRef = (0, import_react.useRef)(null);
  if (!swipeHandlersRef.current) {
    const handlers = {
      onMove: (e) => {
        const el = buttonRef.current;
        if (pointerStartRef.current === null || !el) return;
        const dy = e.clientY - pointerStartRef.current;
        const sign = dy > 0 ? 1 : -1;
        const clamped = Math.min(Math.abs(dy), SWIPE_MAX) * sign;
        el.style.transform = `translateY(${clamped}px)`;
      },
      onUp: (e) => {
        const el = buttonRef.current;
        if (pointerStartRef.current === null || !el) return;
        const dy = e.clientY - pointerStartRef.current;
        pointerStartRef.current = null;
        el.style.transform = "";
        el.removeEventListener("pointermove", handlers.onMove);
        el.removeEventListener("pointerup", handlers.onUp);
        if (Math.abs(dy) > SWIPE_DISMISS) {
          onDismissRef.current == null ? void 0 : onDismissRef.current.call(onDismissRef);
        }
      }
    };
    swipeHandlersRef.current = handlers;
  }
  const handleButtonClick = (0, import_react.useCallback)((e) => {
    var _view_button;
    e.preventDefault();
    e.stopPropagation();
    (_view_button = view.button) == null ? void 0 : _view_button.onClick();
  }, [
    view.button
  ]);
  const handlePointerDown = (0, import_react.useCallback)((e) => {
    if (exiting || !onDismiss) return;
    const target = e.target;
    if (target.closest("[data-sileo-button]")) return;
    pointerStartRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = buttonRef.current;
    const h = swipeHandlersRef.current;
    if (el && h) {
      el.addEventListener("pointermove", h.onMove, {
        passive: true
      });
      el.addEventListener("pointerup", h.onUp, {
        passive: true
      });
    }
  }, [
    exiting,
    onDismiss
  ]);
  return (0, import_jsx_runtime.jsxs)("button", {
    ref: buttonRef,
    type: "button",
    "data-sileo-toast": true,
    "data-ready": ready,
    "data-expanded": open,
    "data-exiting": exiting,
    "data-edge": expand,
    "data-position": position,
    "data-state": view.state,
    className,
    style: rootStyle,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onTransitionEnd: handleTransitionEnd,
    onPointerDown: handlePointerDown,
    children: [
      (0, import_jsx_runtime.jsx)("div", {
        "data-sileo-canvas": true,
        "data-edge": expand,
        style: canvasStyle,
        children: (0, import_jsx_runtime.jsxs)("svg", {
          "data-sileo-svg": true,
          width: WIDTH,
          height: svgHeight,
          viewBox,
          children: [
            (0, import_jsx_runtime.jsx)("title", {
              children: "Sileo Notification"
            }),
            (0, import_jsx_runtime.jsx)(GooeyDefs, {
              filterId,
              blur
            }),
            (0, import_jsx_runtime.jsx)(motion2.rect, {
              "data-sileo-pill": true,
              rx: resolvedRoundness,
              ry: resolvedRoundness,
              fill: view.fill,
              initial: false,
              animate: pillAnimate,
              transition: pillTransition
            }),
            (0, import_jsx_runtime.jsx)(motion2.rect, {
              "data-sileo-body": true,
              y: HEIGHT,
              width: WIDTH,
              rx: resolvedRoundness,
              ry: resolvedRoundness,
              fill: view.fill,
              initial: false,
              animate: bodyAnimate,
              transition: bodyTransition
            })
          ]
        })
      }),
      (0, import_jsx_runtime.jsx)("div", {
        ref: headerRef,
        "data-sileo-header": true,
        "data-edge": expand,
        children: (0, import_jsx_runtime.jsxs)("div", {
          "data-sileo-header-stack": true,
          children: [
            (0, import_jsx_runtime.jsxs)("div", {
              ref: innerRef,
              "data-sileo-header-inner": true,
              "data-layer": "current",
              children: [
                (0, import_jsx_runtime.jsx)("div", {
                  "data-sileo-badge": true,
                  "data-state": headerLayer.current.view.state,
                  className: (_headerLayer_current_view_styles = headerLayer.current.view.styles) == null ? void 0 : _headerLayer_current_view_styles.badge,
                  children: (_headerLayer_current_view_icon = headerLayer.current.view.icon) != null ? _headerLayer_current_view_icon : STATE_ICON[headerLayer.current.view.state]
                }),
                (0, import_jsx_runtime.jsx)("span", {
                  "data-sileo-title": true,
                  "data-state": headerLayer.current.view.state,
                  className: (_headerLayer_current_view_styles1 = headerLayer.current.view.styles) == null ? void 0 : _headerLayer_current_view_styles1.title,
                  children: headerLayer.current.view.title
                })
              ]
            }, headerLayer.current.key),
            headerLayer.prev && (0, import_jsx_runtime.jsxs)("div", {
              "data-sileo-header-inner": true,
              "data-layer": "prev",
              "data-exiting": "true",
              children: [
                (0, import_jsx_runtime.jsx)("div", {
                  "data-sileo-badge": true,
                  "data-state": headerLayer.prev.view.state,
                  className: (_headerLayer_prev_view_styles = headerLayer.prev.view.styles) == null ? void 0 : _headerLayer_prev_view_styles.badge,
                  children: (_headerLayer_prev_view_icon = headerLayer.prev.view.icon) != null ? _headerLayer_prev_view_icon : STATE_ICON[headerLayer.prev.view.state]
                }),
                (0, import_jsx_runtime.jsx)("span", {
                  "data-sileo-title": true,
                  "data-state": headerLayer.prev.view.state,
                  className: (_headerLayer_prev_view_styles1 = headerLayer.prev.view.styles) == null ? void 0 : _headerLayer_prev_view_styles1.title,
                  children: headerLayer.prev.view.title
                })
              ]
            }, headerLayer.prev.key)
          ]
        })
      }),
      hasDesc && (0, import_jsx_runtime.jsx)("div", {
        "data-sileo-content": true,
        "data-edge": expand,
        "data-visible": open,
        children: (0, import_jsx_runtime.jsxs)("div", {
          ref: contentRef,
          "data-sileo-description": true,
          className: (_view_styles = view.styles) == null ? void 0 : _view_styles.description,
          children: [
            view.description,
            view.button && // biome-ignore lint/a11y/useValidAnchor: cannot use button inside a button
            (0, import_jsx_runtime.jsx)("a", {
              href: "#",
              type: "button",
              "data-sileo-button": true,
              "data-state": view.state,
              className: (_view_styles1 = view.styles) == null ? void 0 : _view_styles1.button,
              onClick: handleButtonClick,
              children: view.button.title
            })
          ]
        })
      })
    ]
  });
});
var pillAlign = (pos) => pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";
var expandDir = (pos) => pos.startsWith("top") ? "bottom" : "top";
var store = {
  toasts: [],
  listeners: /* @__PURE__ */ new Set(),
  position: "top-right",
  options: void 0,
  emit() {
    for (const fn of this.listeners) fn(this.toasts);
  },
  update(fn) {
    this.toasts = fn(this.toasts);
    this.emit();
  }
};
var idCounter = 0;
var generateId = () => `${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
var timeoutKey = (t) => `${t.id}:${t.instanceId}`;
var dismissToast = (id) => {
  const item = store.toasts.find((t) => t.id === id);
  if (!item || item.exiting) return;
  store.update((prev) => prev.map((t) => t.id === id ? _extends({}, t, {
    exiting: true
  }) : t));
  setTimeout(() => store.update((prev) => prev.filter((t) => t.id !== id)), EXIT_DURATION);
};
var resolveAutopilot = (opts, duration) => {
  var _ref, _ref1;
  if (opts.autopilot === false || !duration || duration <= 0) return {};
  const cfg = typeof opts.autopilot === "object" ? opts.autopilot : void 0;
  const clamp = (v) => Math.min(duration, Math.max(0, v));
  return {
    expandDelayMs: clamp((_ref = cfg == null ? void 0 : cfg.expand) != null ? _ref : AUTO_EXPAND_DELAY),
    collapseDelayMs: clamp((_ref1 = cfg == null ? void 0 : cfg.collapse) != null ? _ref1 : AUTO_COLLAPSE_DELAY)
  };
};
var mergeOptions = (options) => {
  var _store_options;
  return _extends({}, store.options, options, {
    styles: _extends({}, (_store_options = store.options) == null ? void 0 : _store_options.styles, options.styles)
  });
};
var buildSileoItem = (merged, id, fallbackPosition) => {
  var _merged_duration, _ref, _merged_position;
  const duration = (_merged_duration = merged.duration) != null ? _merged_duration : DEFAULT_TOAST_DURATION;
  const auto = resolveAutopilot(merged, duration);
  return _extends({}, merged, {
    id,
    instanceId: generateId(),
    position: (_ref = (_merged_position = merged.position) != null ? _merged_position : fallbackPosition) != null ? _ref : store.position,
    autoExpandDelayMs: auto.expandDelayMs,
    autoCollapseDelayMs: auto.collapseDelayMs
  });
};
var createToast = (options) => {
  var _merged_id, _merged_duration;
  const live = store.toasts.filter((t) => !t.exiting);
  const merged = mergeOptions(options);
  const id = (_merged_id = merged.id) != null ? _merged_id : "sileo-default";
  const prev = live.find((t) => t.id === id);
  const item = buildSileoItem(merged, id, prev == null ? void 0 : prev.position);
  if (prev) {
    store.update((p) => p.map((t) => t.id === id ? item : t));
  } else {
    store.update((p) => [
      ...p.filter((t) => t.id !== id),
      item
    ]);
  }
  return {
    id,
    duration: (_merged_duration = merged.duration) != null ? _merged_duration : DEFAULT_TOAST_DURATION
  };
};
var updateToast = (id, options) => {
  const existing = store.toasts.find((t) => t.id === id);
  if (!existing) return;
  const item = buildSileoItem(mergeOptions(options), id, existing.position);
  store.update((prev) => prev.map((t) => t.id === id ? item : t));
};
var sileo = {
  show: (opts) => createToast(_extends({}, opts, {
    state: opts.type
  })).id,
  success: (opts) => createToast(_extends({}, opts, {
    state: "success"
  })).id,
  error: (opts) => createToast(_extends({}, opts, {
    state: "error"
  })).id,
  warning: (opts) => createToast(_extends({}, opts, {
    state: "warning"
  })).id,
  info: (opts) => createToast(_extends({}, opts, {
    state: "info"
  })).id,
  action: (opts) => createToast(_extends({}, opts, {
    state: "action"
  })).id,
  promise: (promise, opts) => {
    const { id } = createToast(_extends({}, opts.loading, {
      state: "loading",
      duration: null,
      position: opts.position
    }));
    const p = typeof promise === "function" ? promise() : promise;
    p.then((data) => {
      if (opts.action) {
        const actionOpts = typeof opts.action === "function" ? opts.action(data) : opts.action;
        updateToast(id, _extends({}, actionOpts, {
          state: "action",
          id
        }));
      } else {
        const successOpts = typeof opts.success === "function" ? opts.success(data) : opts.success;
        updateToast(id, _extends({}, successOpts, {
          state: "success",
          id
        }));
      }
    }).catch((err) => {
      const errorOpts = typeof opts.error === "function" ? opts.error(err) : opts.error;
      updateToast(id, _extends({}, errorOpts, {
        state: "error",
        id
      }));
    });
    return p;
  },
  dismiss: dismissToast,
  clear: (position) => store.update((prev) => position ? prev.filter((t) => t.position !== position) : [])
};
var THEME_FILLS = {
  light: "#1a1a1a",
  dark: "#f2f2f2"
};
function useResolvedTheme(theme) {
  const [resolved, setResolved] = (0, import_react.useState)(() => {
    if (theme === "light" || theme === "dark") return theme;
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  (0, import_react.useEffect)(() => {
    if (theme === "light" || theme === "dark") {
      setResolved(theme);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setResolved(e.matches ? "dark" : "light");
    setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [
    theme
  ]);
  return resolved;
}
function Toaster({ children, position = "top-right", offset, options, theme }) {
  const resolvedTheme = useResolvedTheme(theme);
  const [toasts, setToasts] = (0, import_react.useState)(store.toasts);
  const [activeId, setActiveId] = (0, import_react.useState)();
  const hoverRef = (0, import_react.useRef)(false);
  const timersRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  const listRef = (0, import_react.useRef)(toasts);
  const latestRef = (0, import_react.useRef)(void 0);
  const handlersCache = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  (0, import_react.useEffect)(() => {
    store.position = position;
    store.options = options;
  }, [
    position,
    options
  ]);
  const clearAllTimers = (0, import_react.useCallback)(() => {
    for (const t of timersRef.current.values()) clearTimeout(t);
    timersRef.current.clear();
  }, []);
  const schedule = (0, import_react.useCallback)((items) => {
    if (hoverRef.current) return;
    for (const item of items) {
      var _item_duration;
      if (item.exiting) continue;
      const key = timeoutKey(item);
      if (timersRef.current.has(key)) continue;
      if (item.duration === null) continue;
      const dur = (_item_duration = item.duration) != null ? _item_duration : DEFAULT_TOAST_DURATION;
      if (dur <= 0) continue;
      timersRef.current.set(key, window.setTimeout(() => dismissToast(item.id), dur));
    }
  }, []);
  (0, import_react.useEffect)(() => {
    const listener = (next) => setToasts(next);
    store.listeners.add(listener);
    return () => {
      store.listeners.delete(listener);
      clearAllTimers();
    };
  }, [
    clearAllTimers
  ]);
  (0, import_react.useEffect)(() => {
    listRef.current = toasts;
    const toastKeys = new Set(toasts.map(timeoutKey));
    const toastIds = new Set(toasts.map((t) => t.id));
    for (const [key, timer] of timersRef.current) {
      if (!toastKeys.has(key)) {
        clearTimeout(timer);
        timersRef.current.delete(key);
      }
    }
    for (const id of handlersCache.current.keys()) {
      if (!toastIds.has(id)) handlersCache.current.delete(id);
    }
    schedule(toasts);
  }, [
    toasts,
    schedule
  ]);
  const handleMouseEnterRef = (0, import_react.useRef)(null);
  const handleMouseLeaveRef = (0, import_react.useRef)(null);
  handleMouseEnterRef.current = (0, import_react.useCallback)(() => {
    if (hoverRef.current) return;
    hoverRef.current = true;
    clearAllTimers();
  }, [
    clearAllTimers
  ]);
  handleMouseLeaveRef.current = (0, import_react.useCallback)(() => {
    if (!hoverRef.current) return;
    hoverRef.current = false;
    schedule(listRef.current);
  }, [
    schedule
  ]);
  const latest = (0, import_react.useMemo)(() => {
    for (let i = toasts.length - 1; i >= 0; i--) {
      if (!toasts[i].exiting) return toasts[i].id;
    }
    return void 0;
  }, [
    toasts
  ]);
  (0, import_react.useEffect)(() => {
    latestRef.current = latest;
    setActiveId(latest);
  }, [
    latest
  ]);
  const getHandlers = (0, import_react.useCallback)((toastId) => {
    let cached = handlersCache.current.get(toastId);
    if (cached) return cached;
    cached = {
      enter: (e) => {
        setActiveId((prev) => prev === toastId ? prev : toastId);
        handleMouseEnterRef.current == null ? void 0 : handleMouseEnterRef.current.call(handleMouseEnterRef, e);
      },
      leave: (e) => {
        setActiveId((prev) => prev === latestRef.current ? prev : latestRef.current);
        handleMouseLeaveRef.current == null ? void 0 : handleMouseLeaveRef.current.call(handleMouseLeaveRef, e);
      },
      dismiss: () => dismissToast(toastId)
    };
    handlersCache.current.set(toastId, cached);
    return cached;
  }, []);
  const getViewportStyle = (0, import_react.useCallback)((pos) => {
    if (offset === void 0) return void 0;
    const o = typeof offset === "object" ? offset : {
      top: offset,
      right: offset,
      bottom: offset,
      left: offset
    };
    const s = {};
    const px = (v) => typeof v === "number" ? `${v}px` : v;
    if (pos.startsWith("top") && o.top) s.top = px(o.top);
    if (pos.startsWith("bottom") && o.bottom) s.bottom = px(o.bottom);
    if (pos.endsWith("left") && o.left) s.left = px(o.left);
    if (pos.endsWith("right") && o.right) s.right = px(o.right);
    return s;
  }, [
    offset
  ]);
  const activePositions = (0, import_react.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    for (const t of toasts) {
      var _t_position;
      const pos = (_t_position = t.position) != null ? _t_position : position;
      const arr = map.get(pos);
      if (arr) {
        arr.push(t);
      } else {
        map.set(pos, [
          t
        ]);
      }
    }
    return map;
  }, [
    toasts,
    position
  ]);
  return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, {
    children: [
      children,
      Array.from(activePositions, ([pos, items]) => {
        const pill = pillAlign(pos);
        const expand = expandDir(pos);
        return (0, import_jsx_runtime.jsx)("section", {
          "data-sileo-viewport": true,
          "data-position": pos,
          "data-theme": theme ? resolvedTheme : void 0,
          "aria-live": "polite",
          style: getViewportStyle(pos),
          children: items.map((item) => {
            var _item_fill;
            const h = getHandlers(item.id);
            return (0, import_jsx_runtime.jsx)(Sileo, {
              id: item.id,
              state: item.state,
              title: item.title,
              description: item.description,
              position: pill,
              expand,
              icon: item.icon,
              fill: (_item_fill = item.fill) != null ? _item_fill : theme ? THEME_FILLS[resolvedTheme] : void 0,
              styles: item.styles,
              button: item.button,
              roundness: item.roundness,
              exiting: item.exiting,
              autoExpandDelayMs: item.autoExpandDelayMs,
              autoCollapseDelayMs: item.autoCollapseDelayMs,
              refreshKey: item.instanceId,
              canExpand: activeId === void 0 || activeId === item.id,
              onMouseEnter: h.enter,
              onMouseLeave: h.leave,
              onDismiss: h.dismiss
            }, item.id);
          })
        }, pos);
      })
    ]
  });
}
export {
  Toaster,
  sileo
};
//# sourceMappingURL=sileo.js.map
