import { b as get_store_value, o as onDestroy, c as create_ssr_component, d as compute_rest_props, f as each, v as validate_component, m as missing_component, e as escape, g as getContext, h as add_attribute, i as createEventDispatcher, s as setContext, a as subscribe } from "../../chunks/ssr.js";
import { d as derived, w as writable } from "../../chunks/index.js";
import { customAlphabet } from "nanoid/non-secure";
import { Howl } from "howler";
import { Slugger, Lexer } from "marked";
var P = Object.defineProperty;
var F = (r, e, t) => e in r ? P(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t;
var h = (r, e, t) => (F(r, typeof e != "symbol" ? e + "" : e, t), t);
var I = class {
  constructor() {
    h(this, "listeners", /* @__PURE__ */ new Map());
  }
  /**
   * Subscribes a given listener.
   */
  subscribe(e, t) {
    this.listeners.has(e) || this.listeners.set(e, []), !this.listeners.get(e).includes(t) && this.listeners.get(e).push(t);
  }
  /**
   * Unsubscribes the given listener.
   */
  unsubscribe(e, t) {
    this.listeners.has(e) && this.listeners.get(e).includes(t) && (this.listeners.get(e).splice(this.listeners.get(e).indexOf(t), 1), this.listeners.get(e).length === 0 && this.listeners.delete(e));
  }
  /**
   * Emits an event to all active listeners.
   */
  emit(e, t) {
    this.listeners.has(e) && this.listeners.get(e).forEach((s) => s(t));
  }
};
var L = {
  broadcast: false
};
var S = {
  broadcast: false
};
var O = class {
  /**
   * Creates the cache item given the data and expiration at.
   */
  constructor({ data: e, expiresAt: t = null }) {
    h(this, "data");
    h(this, "expiresAt");
    this.data = e, this.expiresAt = t;
  }
  /**
   * Determines if the current cache item is still being resolved.
   * This returns true if data is a promise, or false if type `D`.
   */
  isResolving() {
    return this.data instanceof Promise;
  }
  /**
   * Determines if the given cache item has expired.
   */
  hasExpired() {
    return this.expiresAt === null || this.expiresAt < /* @__PURE__ */ new Date();
  }
  /**
   * Set the expiration time of the given cache item relative to now.
   */
  expiresIn(e) {
    return this.expiresAt = /* @__PURE__ */ new Date(), this.expiresAt.setMilliseconds(this.expiresAt.getMilliseconds() + e), this;
  }
};
var q = class {
  constructor() {
    h(this, "elements", /* @__PURE__ */ new Map());
    h(this, "event", new I());
  }
  /**
   * Resolves the promise and replaces the Promise to the resolved data.
   * It also broadcasts the value change if needed or deletes the key if
   * the value resolves to undefined or null.
   */
  resolve(e, t) {
    Promise.resolve(t.data).then((s) => {
      if (s == null)
        return this.remove(e);
      t.data = s, this.broadcast(e, s);
    });
  }
  /**
   * Gets an element from the cache.
   *
   * It is assumed the item always exist when
   * you get it. Use the has method to check
   * for the existence of it.
   */
  get(e) {
    return this.elements.get(e);
  }
  /**
   * Sets an element to the cache.
   */
  set(e, t) {
    this.elements.set(e, t), this.resolve(e, t);
  }
  /**
   * Removes an key-value pair from the cache.
   */
  remove(e, t) {
    const { broadcast: s } = { ...L, ...t };
    s && this.broadcast(e, void 0), this.elements.delete(e);
  }
  /**
   * Removes all the key-value pairs from the cache.
   */
  clear(e) {
    const { broadcast: t } = { ...S, ...e };
    if (t)
      for (const s of this.elements.keys())
        this.broadcast(s, void 0);
    this.elements.clear();
  }
  /**
   * Determines if the given key exists
   * in the cache.
   */
  has(e) {
    return this.elements.has(e);
  }
  /**
   * Subscribes the callback to the given key.
   */
  subscribe(e, t) {
    this.event.subscribe(e, t);
  }
  /**
   * Unsubscribes to the given key events.
   */
  unsubscribe(e, t) {
    this.event.unsubscribe(e, t);
  }
  /**
   * Broadcasts a value change  on all subscribed instances.
   */
  broadcast(e, t) {
    this.event.emit(e, t);
  }
};
var x = {
  cache: new q(),
  errors: new I(),
  fetcher: async (r) => {
    const e = await fetch(r);
    if (!e.ok)
      throw Error("Not a 2XX response.");
    return e.json();
  },
  fallbackData: void 0,
  loadInitialCache: true,
  revalidateOnStart: true,
  dedupingInterval: 2e3,
  revalidateOnFocus: true,
  focusThrottleInterval: 5e3,
  revalidateOnReconnect: true,
  reconnectWhen: (r, { enabled: e }) => e && typeof window < "u" ? (window.addEventListener("online", r), () => window.removeEventListener("online", r)) : () => {
  },
  focusWhen: (r, { enabled: e, throttleInterval: t }) => {
    if (e && typeof window < "u") {
      let s = null;
      const i = () => {
        const a = Date.now();
        (s === null || a - s > t) && (s = a, r());
      };
      return window.addEventListener("focus", i), () => window.removeEventListener("focus", i);
    }
    return () => {
    };
  },
  revalidateFunction: void 0
};
var E = {
  ...x,
  force: false
};
var T = {
  revalidate: true,
  revalidateOptions: { ...E },
  revalidateFunction: void 0
};
var X = {
  broadcast: false
};
var H = class {
  /**
   * Creates a new instance of SWR.
   */
  constructor(e) {
    h(this, "options");
    this.options = { ...x, ...e };
  }
  /**
   * Gets the cache of the SWR.
   */
  get cache() {
    return this.options.cache;
  }
  /**
   * Gets the cache of the SWR.
   */
  get errors() {
    return this.options.errors;
  }
  /**
   * Requests the data using the provided fetcher.
   */
  async requestData(e, t) {
    return await Promise.resolve(t(e)).catch((s) => {
      throw this.errors.emit(e, s), s;
    });
  }
  /**
   * Resolves the given to a SWRKey or undefined.
   */
  resolveKey(e) {
    if (typeof e == "function")
      try {
        return e();
      } catch (e2) {
        return;
      }
    return e;
  }
  /**
   * Clear the specified keys from the cache. If no keys
   * are specified, it clears all the cache keys.
   */
  clear(e, t) {
    const s = { ...X, ...t };
    if (e == null)
      return this.cache.clear(s);
    if (!Array.isArray(e))
      return this.cache.remove(e, s);
    for (const i of e)
      this.cache.remove(i, s);
  }
  /**
   * Revalidates the key and mutates the cache if needed.
   */
  async revalidate(e, t) {
    if (!e)
      throw new Error("[Revalidate] Key issue: ${key}");
    const { fetcher: s, dedupingInterval: i } = this.options, { force: a, fetcher: o, dedupingInterval: n } = {
      ...E,
      fetcher: s,
      dedupingInterval: i,
      ...t
    };
    if (a || !this.cache.has(e) || this.cache.has(e) && this.cache.get(e).hasExpired()) {
      const c2 = this.requestData(e, o), l = c2.catch(() => {
      });
      return this.cache.set(e, new O({ data: l }).expiresIn(n)), await c2;
    }
    return this.getWait(e);
  }
  /**
   * Mutates the data of a given key with a new value.
   * This is used to replace the cache contents of the
   * given key manually.
   */
  async mutate(e, t, s) {
    var _a;
    if (!e)
      throw new Error("[Mutate] Key issue: ${key}");
    const {
      revalidate: i,
      revalidateOptions: a,
      revalidateFunction: o
    } = {
      ...T,
      ...s
    };
    let n;
    if (typeof t == "function") {
      let c2;
      if (this.cache.has(e)) {
        const l = this.cache.get(e);
        l.isResolving() || (c2 = l.data);
      }
      n = t(c2);
    } else
      n = t;
    return this.cache.set(e, new O({ data: n })), i ? await ((_a = o == null ? void 0 : o(e, a)) != null ? _a : this.revalidate(e, a)) : n;
  }
  /**
   * Gets the data of the given key. Keep in mind
   * this data will be stale and revalidate in the background
   * unless specified otherwise.
   */
  subscribeData(e, t) {
    if (e) {
      const s = (i) => t(i);
      return this.cache.subscribe(e, s), () => this.cache.unsubscribe(e, s);
    }
    return () => {
    };
  }
  /**
   * Subscribes to errors on the given key.
   */
  subscribeErrors(e, t) {
    if (e) {
      const s = (i) => t(i);
      return this.errors.subscribe(e, s), () => this.errors.unsubscribe(e, s);
    }
    return () => {
    };
  }
  /**
   * Gets the current cached data of the given key.
   * This does not trigger any revalidation nor mutation
   * of the data.
   * - If the data has never been validated
   * (there is no cache) it will return undefined.
   * - If the item is pending to resolve (there is a request
   * pending to resolve) it will return undefined.
   */
  get(e) {
    if (e && this.cache.has(e)) {
      const t = this.cache.get(e);
      if (!t.isResolving())
        return t.data;
    }
  }
  /**
   * Gets an element from the cache. The difference
   * with the get is that this method returns a promise
   * that will resolve the the value. If there's no item
   * in the cache, it will wait for it before resolving.
   */
  getWait(e) {
    return new Promise((t, s) => {
      const i = this.subscribeData(e, (n) => {
        if (i(), n !== void 0)
          return t(n);
      }), a = this.subscribeErrors(e, (n) => {
        if (a(), n !== void 0)
          return s(n);
      }), o = this.get(e);
      if (o !== void 0)
        return t(o);
    });
  }
  /**
   * Use a SWR value given the key and
   * subscribe to future changes.
   */
  subscribe(e, t, s, i) {
    const {
      fetcher: a,
      fallbackData: o,
      loadInitialCache: n,
      revalidateOnStart: c2,
      dedupingInterval: l,
      revalidateOnFocus: A2,
      focusThrottleInterval: C,
      revalidateOnReconnect: R,
      reconnectWhen: W2,
      focusWhen: D2,
      revalidateFunction: d
    } = {
      // Current instance options
      // (includes default options)
      ...this.options,
      // Current call options.
      ...i
    }, K2 = (m) => {
      var _a;
      return (_a = d == null ? void 0 : d(this.resolveKey(e), m)) != null ? _a : this.revalidate(this.resolveKey(e), m);
    }, f = () => K2({ fetcher: a, dedupingInterval: l }), u = n ? this.get(this.resolveKey(e)) : o != null ? o : void 0, g = c2 ? f() : Promise.resolve(void 0), M = u ? Promise.resolve(u) : g;
    u && (t == null || t(u));
    const v2 = t ? this.subscribeData(this.resolveKey(e), t) : void 0, b = s ? this.subscribeErrors(this.resolveKey(e), s) : void 0, p2 = D2(f, {
      throttleInterval: C,
      enabled: A2
    }), w2 = W2(f, {
      enabled: R
    });
    return { unsubscribe: () => {
      v2 == null || v2(), b == null || b(), p2 == null || p2(), w2 == null || w2();
    }, dataPromise: M, revalidatePromise: g };
  }
};
function p() {
}
function D(t) {
  return t();
}
function q2(t) {
  t.forEach(D);
}
function x2(t) {
  return typeof t == "function";
}
function K(t, e) {
  return t != t ? e == e : t !== e || t && typeof t == "object" || typeof t == "function";
}
function z(t, ...e) {
  if (t == null) {
    for (const r of e)
      r(void 0);
    return p;
  }
  const n = t.subscribe(...e);
  return n.unsubscribe ? () => n.unsubscribe() : n;
}
var v = [];
function A(t, e) {
  return {
    subscribe: y(t, e).subscribe
  };
}
function y(t, e = p) {
  let n;
  const r = /* @__PURE__ */ new Set();
  function i(u) {
    if (K(t, u) && (t = u, n)) {
      const f = !v.length;
      for (const s of r)
        s[1](), v.push(s, t);
      if (f) {
        for (let s = 0; s < v.length; s += 2)
          v[s][0](v[s + 1]);
        v.length = 0;
      }
    }
  }
  function a(u) {
    i(u(t));
  }
  function d(u, f = p) {
    const s = [u, f];
    return r.add(s), r.size === 1 && (n = e(i, a) || p), u(t), () => {
      r.delete(s), r.size === 0 && n && (n(), n = null);
    };
  }
  return { set: i, update: a, subscribe: d };
}
function S2(t, e, n) {
  const r = !Array.isArray(t), i = r ? [t] : t;
  if (!i.every(Boolean))
    throw new Error("derived() expects stores as input, got a falsy value");
  const a = e.length < 2;
  return A(n, (d, u) => {
    let f = false;
    const s = [];
    let h2 = 0, o = p;
    const l = () => {
      if (h2)
        return;
      o();
      const b = e(r ? s[0] : s, d, u);
      a ? d(b) : o = x2(b) ? b : p;
    }, g = i.map(
      (b, m) => z(
        b,
        (R) => {
          s[m] = R, h2 &= ~(1 << m), f && l();
        },
        () => {
          h2 |= 1 << m;
        }
      )
    );
    return f = true, l(), function() {
      q2(g), o(), f = false;
    };
  });
}
var O2 = class extends H {
  /**
   * Svelte specific use of SWR.
   */
  useSWR(e, n) {
    const i = y(void 0, () => () => void 0), a = y(void 0, () => () => void 0);
    onDestroy(() => void 0);
    const d = (o, l) => this.mutate(this.resolveKey(e), o, {
      revalidateOptions: n,
      ...l
    }), u = (o) => this.revalidate(this.resolveKey(e), { ...n, ...o }), f = (o) => this.clear(this.resolveKey(e), o), s = S2([i, a], ([o, l]) => o === void 0 && l === void 0), h2 = S2([i, a], ([o, l]) => o !== void 0 && l === void 0);
    return { data: i, error: a, mutate: d, revalidate: u, clear: f, isLoading: s, isValid: h2 };
  }
};
var W = (t) => new O2(t);
var c = W();
var F2 = (t, e) => c.useSWR(t, e);
var textStreamPart = {
  code: "0",
  name: "text",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"text" parts expect a string value.');
    }
    return { type: "text", value };
  }
};
var functionCallStreamPart = {
  code: "1",
  name: "function_call",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("function_call" in value) || typeof value.function_call !== "object" || value.function_call == null || !("name" in value.function_call) || !("arguments" in value.function_call) || typeof value.function_call.name !== "string" || typeof value.function_call.arguments !== "string") {
      throw new Error(
        '"function_call" parts expect an object with a "function_call" property.'
      );
    }
    return {
      type: "function_call",
      value
    };
  }
};
var dataStreamPart = {
  code: "2",
  name: "data",
  parse: (value) => {
    if (!Array.isArray(value)) {
      throw new Error('"data" parts expect an array value.');
    }
    return { type: "data", value };
  }
};
var errorStreamPart = {
  code: "3",
  name: "error",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"error" parts expect a string value.');
    }
    return { type: "error", value };
  }
};
var assistantMessageStreamPart = {
  code: "4",
  name: "assistant_message",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("id" in value) || !("role" in value) || !("content" in value) || typeof value.id !== "string" || typeof value.role !== "string" || value.role !== "assistant" || !Array.isArray(value.content) || !value.content.every(
      (item) => item != null && typeof item === "object" && "type" in item && item.type === "text" && "text" in item && item.text != null && typeof item.text === "object" && "value" in item.text && typeof item.text.value === "string"
    )) {
      throw new Error(
        '"assistant_message" parts expect an object with an "id", "role", and "content" property.'
      );
    }
    return {
      type: "assistant_message",
      value
    };
  }
};
var assistantControlDataStreamPart = {
  code: "5",
  name: "assistant_control_data",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("threadId" in value) || !("messageId" in value) || typeof value.threadId !== "string" || typeof value.messageId !== "string") {
      throw new Error(
        '"assistant_control_data" parts expect an object with a "threadId" and "messageId" property.'
      );
    }
    return {
      type: "assistant_control_data",
      value: {
        threadId: value.threadId,
        messageId: value.messageId
      }
    };
  }
};
var dataMessageStreamPart = {
  code: "6",
  name: "data_message",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("role" in value) || !("data" in value) || typeof value.role !== "string" || value.role !== "data") {
      throw new Error(
        '"data_message" parts expect an object with a "role" and "data" property.'
      );
    }
    return {
      type: "data_message",
      value
    };
  }
};
var toolCallStreamPart = {
  code: "7",
  name: "tool_calls",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("tool_calls" in value) || typeof value.tool_calls !== "object" || value.tool_calls == null || !Array.isArray(value.tool_calls) || value.tool_calls.some((tc) => {
      tc == null || typeof tc !== "object" || !("id" in tc) || typeof tc.id !== "string" || !("type" in tc) || typeof tc.type !== "string" || !("function" in tc) || tc.function == null || typeof tc.function !== "object" || !("arguments" in tc.function) || typeof tc.function.name !== "string" || typeof tc.function.arguments !== "string";
    })) {
      throw new Error(
        '"tool_calls" parts expect an object with a ToolCallPayload.'
      );
    }
    return {
      type: "tool_calls",
      value
    };
  }
};
var messageAnnotationsStreamPart = {
  code: "8",
  name: "message_annotations",
  parse: (value) => {
    if (!Array.isArray(value)) {
      throw new Error('"message_annotations" parts expect an array value.');
    }
    return { type: "message_annotations", value };
  }
};
var streamParts = [
  textStreamPart,
  functionCallStreamPart,
  dataStreamPart,
  errorStreamPart,
  assistantMessageStreamPart,
  assistantControlDataStreamPart,
  dataMessageStreamPart,
  toolCallStreamPart,
  messageAnnotationsStreamPart
];
var streamPartsByCode = {
  [textStreamPart.code]: textStreamPart,
  [functionCallStreamPart.code]: functionCallStreamPart,
  [dataStreamPart.code]: dataStreamPart,
  [errorStreamPart.code]: errorStreamPart,
  [assistantMessageStreamPart.code]: assistantMessageStreamPart,
  [assistantControlDataStreamPart.code]: assistantControlDataStreamPart,
  [dataMessageStreamPart.code]: dataMessageStreamPart,
  [toolCallStreamPart.code]: toolCallStreamPart,
  [messageAnnotationsStreamPart.code]: messageAnnotationsStreamPart
};
({
  [textStreamPart.name]: textStreamPart.code,
  [functionCallStreamPart.name]: functionCallStreamPart.code,
  [dataStreamPart.name]: dataStreamPart.code,
  [errorStreamPart.name]: errorStreamPart.code,
  [assistantMessageStreamPart.name]: assistantMessageStreamPart.code,
  [assistantControlDataStreamPart.name]: assistantControlDataStreamPart.code,
  [dataMessageStreamPart.name]: dataMessageStreamPart.code,
  [toolCallStreamPart.name]: toolCallStreamPart.code,
  [messageAnnotationsStreamPart.name]: messageAnnotationsStreamPart.code
});
var validCodes = streamParts.map((part) => part.code);
var parseStreamPart = (line) => {
  const firstSeparatorIndex = line.indexOf(":");
  if (firstSeparatorIndex === -1) {
    throw new Error("Failed to parse stream string. No separator found.");
  }
  const prefix = line.slice(0, firstSeparatorIndex);
  if (!validCodes.includes(prefix)) {
    throw new Error(`Failed to parse stream string. Invalid code ${prefix}.`);
  }
  const code = prefix;
  const textValue = line.slice(firstSeparatorIndex + 1);
  const jsonValue = JSON.parse(textValue);
  return streamPartsByCode[code].parse(jsonValue);
};
var NEWLINE = "\n".charCodeAt(0);
function concatChunks(chunks, totalLength) {
  const concatenatedChunks = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    concatenatedChunks.set(chunk, offset);
    offset += chunk.length;
  }
  chunks.length = 0;
  return concatenatedChunks;
}
async function* readDataStream(reader, {
  isAborted
} = {}) {
  const decoder = new TextDecoder();
  const chunks = [];
  let totalLength = 0;
  while (true) {
    const { value } = await reader.read();
    if (value) {
      chunks.push(value);
      totalLength += value.length;
      if (value[value.length - 1] !== NEWLINE) {
        continue;
      }
    }
    if (chunks.length === 0) {
      break;
    }
    const concatenatedChunks = concatChunks(chunks, totalLength);
    totalLength = 0;
    const streamParts2 = decoder.decode(concatenatedChunks, { stream: true }).split("\n").filter((line) => line !== "").map(parseStreamPart);
    for (const streamPart of streamParts2) {
      yield streamPart;
    }
    if (isAborted == null ? void 0 : isAborted()) {
      reader.cancel();
      break;
    }
  }
}
var nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
);
function createChunkDecoder(complex) {
  const decoder = new TextDecoder();
  if (!complex) {
    return function(chunk) {
      if (!chunk)
        return "";
      return decoder.decode(chunk, { stream: true });
    };
  }
  return function(chunk) {
    const decoded = decoder.decode(chunk, { stream: true }).split("\n").filter((line) => line !== "");
    return decoded.map(parseStreamPart).filter(Boolean);
  };
}
var COMPLEX_HEADER = "X-Experimental-Stream-Data";
function assignAnnotationsToMessage(message, annotations) {
  if (!message || !annotations || !annotations.length)
    return message;
  return { ...message, annotations: [...annotations] };
}
async function parseComplexResponse({
  reader,
  abortControllerRef,
  update,
  onFinish,
  generateId = nanoid,
  getCurrentDate = () => /* @__PURE__ */ new Date()
}) {
  const createdAt = getCurrentDate();
  const prefixMap = {
    data: []
  };
  let message_annotations = void 0;
  for await (const { type, value } of readDataStream(reader, {
    isAborted: () => (abortControllerRef == null ? void 0 : abortControllerRef.current) === null
  })) {
    if (type === "text") {
      if (prefixMap["text"]) {
        prefixMap["text"] = {
          ...prefixMap["text"],
          content: (prefixMap["text"].content || "") + value
        };
      } else {
        prefixMap["text"] = {
          id: generateId(),
          role: "assistant",
          content: value,
          createdAt
        };
      }
    }
    let functionCallMessage = null;
    if (type === "function_call") {
      prefixMap["function_call"] = {
        id: generateId(),
        role: "assistant",
        content: "",
        function_call: value.function_call,
        name: value.function_call.name,
        createdAt
      };
      functionCallMessage = prefixMap["function_call"];
    }
    let toolCallMessage = null;
    if (type === "tool_calls") {
      prefixMap["tool_calls"] = {
        id: generateId(),
        role: "assistant",
        content: "",
        tool_calls: value.tool_calls,
        createdAt
      };
      toolCallMessage = prefixMap["tool_calls"];
    }
    if (type === "data") {
      prefixMap["data"].push(...value);
    }
    let responseMessage = prefixMap["text"];
    if (type === "message_annotations") {
      if (!message_annotations) {
        message_annotations = [...value];
      } else {
        message_annotations.push(...value);
      }
      functionCallMessage = assignAnnotationsToMessage(
        prefixMap["function_call"],
        message_annotations
      );
      toolCallMessage = assignAnnotationsToMessage(
        prefixMap["tool_calls"],
        message_annotations
      );
      responseMessage = assignAnnotationsToMessage(
        prefixMap["text"],
        message_annotations
      );
    }
    if (message_annotations == null ? void 0 : message_annotations.length) {
      const messagePrefixKeys = [
        "text",
        "function_call",
        "tool_calls"
      ];
      messagePrefixKeys.forEach((key2) => {
        if (prefixMap[key2]) {
          prefixMap[key2].annotations = [...message_annotations];
        }
      });
    }
    const merged = [functionCallMessage, toolCallMessage, responseMessage].filter(Boolean).map((message) => ({
      ...assignAnnotationsToMessage(message, message_annotations)
    }));
    update(merged, [...prefixMap["data"]]);
  }
  onFinish == null ? void 0 : onFinish(prefixMap);
  return {
    messages: [
      prefixMap.text,
      prefixMap.function_call,
      prefixMap.tool_calls
    ].filter(Boolean),
    data: prefixMap.data
  };
}
async function callChatApi({
  api,
  messages,
  body,
  credentials,
  headers,
  abortController,
  appendMessage,
  restoreMessagesOnFailure,
  onResponse,
  onUpdate,
  onFinish,
  generateId
}) {
  var _a;
  const response = await fetch(api, {
    method: "POST",
    body: JSON.stringify({
      messages,
      ...body
    }),
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    signal: (_a = abortController == null ? void 0 : abortController()) == null ? void 0 : _a.signal,
    credentials
  }).catch((err) => {
    restoreMessagesOnFailure();
    throw err;
  });
  if (onResponse) {
    try {
      await onResponse(response);
    } catch (err) {
      throw err;
    }
  }
  if (!response.ok) {
    restoreMessagesOnFailure();
    throw new Error(
      await response.text() || "Failed to fetch the chat response."
    );
  }
  if (!response.body) {
    throw new Error("The response body is empty.");
  }
  const reader = response.body.getReader();
  const isComplexMode = response.headers.get(COMPLEX_HEADER) === "true";
  if (isComplexMode) {
    return await parseComplexResponse({
      reader,
      abortControllerRef: abortController != null ? { current: abortController() } : void 0,
      update: onUpdate,
      onFinish(prefixMap) {
        if (onFinish && prefixMap.text != null) {
          onFinish(prefixMap.text);
        }
      },
      generateId
    });
  } else {
    const createdAt = /* @__PURE__ */ new Date();
    const decode = createChunkDecoder(false);
    let streamedResponse = "";
    const replyId = generateId();
    let responseMessage = {
      id: replyId,
      createdAt,
      content: "",
      role: "assistant"
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      streamedResponse += decode(value);
      if (streamedResponse.startsWith('{"function_call":')) {
        responseMessage["function_call"] = streamedResponse;
      } else if (streamedResponse.startsWith('{"tool_calls":')) {
        responseMessage["tool_calls"] = streamedResponse;
      } else {
        responseMessage["content"] = streamedResponse;
      }
      appendMessage({ ...responseMessage });
      if ((abortController == null ? void 0 : abortController()) === null) {
        reader.cancel();
        break;
      }
    }
    if (streamedResponse.startsWith('{"function_call":')) {
      const parsedFunctionCall = JSON.parse(streamedResponse).function_call;
      responseMessage["function_call"] = parsedFunctionCall;
      appendMessage({ ...responseMessage });
    }
    if (streamedResponse.startsWith('{"tool_calls":')) {
      const parsedToolCalls = JSON.parse(streamedResponse).tool_calls;
      responseMessage["tool_calls"] = parsedToolCalls;
      appendMessage({ ...responseMessage });
    }
    if (onFinish) {
      onFinish(responseMessage);
    }
    return responseMessage;
  }
}
async function processChatStream({
  getStreamedResponse: getStreamedResponse2,
  experimental_onFunctionCall,
  experimental_onToolCall,
  updateChatRequest,
  getCurrentMessages
}) {
  while (true) {
    const messagesAndDataOrJustMessage = await getStreamedResponse2();
    if ("messages" in messagesAndDataOrJustMessage) {
      let hasFollowingResponse = false;
      for (const message of messagesAndDataOrJustMessage.messages) {
        if ((message.function_call === void 0 || typeof message.function_call === "string") && (message.tool_calls === void 0 || typeof message.tool_calls === "string")) {
          continue;
        }
        hasFollowingResponse = true;
        if (experimental_onFunctionCall) {
          const functionCall = message.function_call;
          if (typeof functionCall !== "object") {
            console.warn(
              "experimental_onFunctionCall should not be defined when using tools"
            );
            continue;
          }
          const functionCallResponse = await experimental_onFunctionCall(
            getCurrentMessages(),
            functionCall
          );
          if (functionCallResponse === void 0) {
            hasFollowingResponse = false;
            break;
          }
          updateChatRequest(functionCallResponse);
        }
        if (experimental_onToolCall) {
          const toolCalls = message.tool_calls;
          if (!Array.isArray(toolCalls) || toolCalls.some((toolCall) => typeof toolCall !== "object")) {
            console.warn(
              "experimental_onToolCall should not be defined when using tools"
            );
            continue;
          }
          const toolCallResponse = await experimental_onToolCall(getCurrentMessages(), toolCalls);
          if (toolCallResponse === void 0) {
            hasFollowingResponse = false;
            break;
          }
          updateChatRequest(toolCallResponse);
        }
      }
      if (!hasFollowingResponse) {
        break;
      }
    } else {
      let fixFunctionCallArguments2 = function(response) {
        for (const message of response.messages) {
          if (message.tool_calls !== void 0) {
            for (const toolCall of message.tool_calls) {
              if (typeof toolCall === "object") {
                if (toolCall.function.arguments && typeof toolCall.function.arguments !== "string") {
                  toolCall.function.arguments = JSON.stringify(
                    toolCall.function.arguments
                  );
                }
              }
            }
          }
          if (message.function_call !== void 0) {
            if (typeof message.function_call === "object") {
              if (message.function_call.arguments && typeof message.function_call.arguments !== "string") {
                message.function_call.arguments = JSON.stringify(
                  message.function_call.arguments
                );
              }
            }
          }
        }
      };
      const streamedResponseMessage = messagesAndDataOrJustMessage;
      if ((streamedResponseMessage.function_call === void 0 || typeof streamedResponseMessage.function_call === "string") && (streamedResponseMessage.tool_calls === void 0 || typeof streamedResponseMessage.tool_calls === "string")) {
        break;
      }
      if (experimental_onFunctionCall) {
        const functionCall = streamedResponseMessage.function_call;
        if (!(typeof functionCall === "object")) {
          console.warn(
            "experimental_onFunctionCall should not be defined when using tools"
          );
          continue;
        }
        const functionCallResponse = await experimental_onFunctionCall(getCurrentMessages(), functionCall);
        if (functionCallResponse === void 0)
          break;
        fixFunctionCallArguments2(functionCallResponse);
        updateChatRequest(functionCallResponse);
      }
      if (experimental_onToolCall) {
        const toolCalls = streamedResponseMessage.tool_calls;
        if (!(typeof toolCalls === "object")) {
          console.warn(
            "experimental_onToolCall should not be defined when using functions"
          );
          continue;
        }
        const toolCallResponse = await experimental_onToolCall(getCurrentMessages(), toolCalls);
        if (toolCallResponse === void 0)
          break;
        fixFunctionCallArguments2(toolCallResponse);
        updateChatRequest(toolCallResponse);
      }
    }
  }
}
var getStreamedResponse = async (api, chatRequest, mutate, mutateStreamData, existingData, extraMetadata, previousMessages, abortControllerRef, generateId, onFinish, onResponse, sendExtraMessageFields) => {
  var _a, _b;
  mutate(chatRequest.messages);
  const constructedMessagesPayload = sendExtraMessageFields ? chatRequest.messages : chatRequest.messages.map(
    ({ role, content, name, function_call, tool_calls, tool_call_id }) => ({
      role,
      content,
      tool_call_id,
      ...name !== void 0 && { name },
      ...function_call !== void 0 && {
        function_call
      },
      ...tool_calls !== void 0 && {
        tool_calls
      }
    })
  );
  return await callChatApi({
    api,
    messages: constructedMessagesPayload,
    body: {
      ...extraMetadata.body,
      ...(_a = chatRequest.options) == null ? void 0 : _a.body,
      ...chatRequest.functions !== void 0 && {
        functions: chatRequest.functions
      },
      ...chatRequest.function_call !== void 0 && {
        function_call: chatRequest.function_call
      },
      ...chatRequest.tools !== void 0 && {
        tools: chatRequest.tools
      },
      ...chatRequest.tool_choice !== void 0 && {
        tool_choice: chatRequest.tool_choice
      }
    },
    credentials: extraMetadata.credentials,
    headers: {
      ...extraMetadata.headers,
      ...(_b = chatRequest.options) == null ? void 0 : _b.headers
    },
    abortController: () => abortControllerRef,
    appendMessage(message) {
      mutate([...chatRequest.messages, message]);
    },
    restoreMessagesOnFailure() {
      mutate(previousMessages);
    },
    onResponse,
    onUpdate(merged, data) {
      mutate([...chatRequest.messages, ...merged]);
      mutateStreamData([...existingData || [], ...data || []]);
    },
    onFinish,
    generateId
  });
};
var uniqueId = 0;
var store = {};
function useChat({
  api = "/api/chat",
  id,
  initialMessages = [],
  initialInput = "",
  sendExtraMessageFields,
  experimental_onFunctionCall,
  experimental_onToolCall,
  onResponse,
  onFinish,
  onError,
  credentials,
  headers,
  body,
  generateId = nanoid
} = {}) {
  const chatId = id || `chat-${uniqueId++}`;
  const key2 = `${api}|${chatId}`;
  const {
    data,
    mutate: originalMutate,
    isLoading: isSWRLoading
  } = F2(key2, {
    fetcher: () => store[key2] || initialMessages,
    fallbackData: initialMessages
  });
  const streamData = writable(void 0);
  const loading = writable(false);
  data.set(initialMessages);
  const mutate = (data2) => {
    store[key2] = data2;
    return originalMutate(data2);
  };
  const messages = data;
  let abortController = null;
  const extraMetadata = {
    credentials,
    headers,
    body
  };
  const error = writable(void 0);
  async function triggerRequest(chatRequest) {
    try {
      error.set(void 0);
      loading.set(true);
      abortController = new AbortController();
      await processChatStream({
        getStreamedResponse: () => getStreamedResponse(
          api,
          chatRequest,
          mutate,
          (data2) => {
            streamData.set(data2);
          },
          get_store_value(streamData),
          extraMetadata,
          get_store_value(messages),
          abortController,
          generateId,
          onFinish,
          onResponse,
          sendExtraMessageFields
        ),
        experimental_onFunctionCall,
        experimental_onToolCall,
        updateChatRequest: (chatRequestParam) => {
          chatRequest = chatRequestParam;
        },
        getCurrentMessages: () => get_store_value(messages)
      });
      abortController = null;
      return null;
    } catch (err) {
      if (err.name === "AbortError") {
        abortController = null;
        return null;
      }
      if (onError && err instanceof Error) {
        onError(err);
      }
      error.set(err);
    } finally {
      loading.set(false);
    }
  }
  const append = async (message, {
    options,
    functions,
    function_call,
    tools,
    tool_choice
  } = {}) => {
    if (!message.id) {
      message.id = generateId();
    }
    const chatRequest = {
      messages: get_store_value(messages).concat(message),
      options,
      ...functions !== void 0 && { functions },
      ...function_call !== void 0 && { function_call },
      ...tools !== void 0 && { tools },
      ...tool_choice !== void 0 && { tool_choice }
    };
    return triggerRequest(chatRequest);
  };
  const reload = async ({
    options,
    functions,
    function_call,
    tools,
    tool_choice
  } = {}) => {
    const messagesSnapshot = get_store_value(messages);
    if (messagesSnapshot.length === 0)
      return null;
    const lastMessage = messagesSnapshot.at(-1);
    if ((lastMessage == null ? void 0 : lastMessage.role) === "assistant") {
      const chatRequest2 = {
        messages: messagesSnapshot.slice(0, -1),
        options,
        ...functions !== void 0 && { functions },
        ...function_call !== void 0 && { function_call },
        ...tools !== void 0 && { tools },
        ...tool_choice !== void 0 && { tool_choice }
      };
      return triggerRequest(chatRequest2);
    }
    const chatRequest = {
      messages: messagesSnapshot,
      options,
      ...functions !== void 0 && { functions },
      ...function_call !== void 0 && { function_call },
      ...tools !== void 0 && { tools },
      ...tool_choice !== void 0 && { tool_choice }
    };
    return triggerRequest(chatRequest);
  };
  const stop = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };
  const setMessages = (messages2) => {
    mutate(messages2);
  };
  const input = writable(initialInput);
  const handleSubmit = (e, options = {}) => {
    e.preventDefault();
    const inputValue = get_store_value(input);
    if (!inputValue)
      return;
    append(
      {
        content: inputValue,
        role: "user",
        createdAt: /* @__PURE__ */ new Date()
      },
      options
    );
    input.set("");
  };
  const isLoading = derived(
    [isSWRLoading, loading],
    ([$isSWRLoading, $loading]) => {
      return $isSWRLoading || $loading;
    }
  );
  return {
    messages,
    error,
    append,
    reload,
    stop,
    setMessages,
    input,
    handleSubmit,
    isLoading,
    data: streamData
  };
}
function supressWarnings() {
  const origWarn = console.warn;
  console.warn = (message) => {
    if (message.includes("unknown prop"))
      return;
    if (message.includes("unexpected slot"))
      return;
    origWarn(message);
  };
}
const Parser = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["type", "tokens", "header", "rows", "ordered", "renderers"]);
  let { type = void 0 } = $$props;
  let { tokens = void 0 } = $$props;
  let { header = void 0 } = $$props;
  let { rows = void 0 } = $$props;
  let { ordered = false } = $$props;
  let { renderers } = $$props;
  supressWarnings();
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.tokens === void 0 && $$bindings.tokens && tokens !== void 0)
    $$bindings.tokens(tokens);
  if ($$props.header === void 0 && $$bindings.header && header !== void 0)
    $$bindings.header(header);
  if ($$props.rows === void 0 && $$bindings.rows && rows !== void 0)
    $$bindings.rows(rows);
  if ($$props.ordered === void 0 && $$bindings.ordered && ordered !== void 0)
    $$bindings.ordered(ordered);
  if ($$props.renderers === void 0 && $$bindings.renderers && renderers !== void 0)
    $$bindings.renderers(renderers);
  return `${!type ? `${each(tokens, (token) => {
    return `${validate_component(Parser, "svelte:self").$$render($$result, Object.assign({}, token, { renderers }), {}, {})}`;
  })}` : `${renderers[type] ? `${type === "table" ? `${validate_component(renderers.table || missing_component, "svelte:component").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(renderers.tablehead || missing_component, "svelte:component").$$render($$result, {}, {}, {
        default: () => {
          return `${validate_component(renderers.tablerow || missing_component, "svelte:component").$$render($$result, {}, {}, {
            default: () => {
              return `${each(header, (headerItem, i) => {
                return `${validate_component(renderers.tablecell || missing_component, "svelte:component").$$render(
                  $$result,
                  {
                    header: true,
                    align: $$restProps.align[i] || "center"
                  },
                  {},
                  {
                    default: () => {
                      return `${validate_component(Parser, "svelte:self").$$render($$result, { tokens: headerItem.tokens, renderers }, {}, {})} `;
                    }
                  }
                )}`;
              })}`;
            }
          })}`;
        }
      })} ${validate_component(renderers.tablebody || missing_component, "svelte:component").$$render($$result, {}, {}, {
        default: () => {
          return `${each(rows, (row) => {
            return `${validate_component(renderers.tablerow || missing_component, "svelte:component").$$render($$result, {}, {}, {
              default: () => {
                return `${each(row, (cells, i) => {
                  return `${validate_component(renderers.tablecell || missing_component, "svelte:component").$$render(
                    $$result,
                    {
                      header: false,
                      align: $$restProps.align[i] || "center"
                    },
                    {},
                    {
                      default: () => {
                        return `${validate_component(Parser, "svelte:self").$$render($$result, { tokens: cells.tokens, renderers }, {}, {})} `;
                      }
                    }
                  )}`;
                })} `;
              }
            })}`;
          })}`;
        }
      })}`;
    }
  })}` : `${type === "list" ? `${ordered ? `${validate_component(renderers.list || missing_component, "svelte:component").$$render($$result, Object.assign({}, { ordered }, $$restProps), {}, {
    default: () => {
      return `${each($$restProps.items, (item) => {
        return `${validate_component(renderers.orderedlistitem || renderers.listitem || missing_component, "svelte:component").$$render($$result, Object.assign({}, item), {}, {
          default: () => {
            return `${validate_component(Parser, "svelte:self").$$render($$result, { tokens: item.tokens, renderers }, {}, {})} `;
          }
        })}`;
      })}`;
    }
  })}` : `${validate_component(renderers.list || missing_component, "svelte:component").$$render($$result, Object.assign({}, { ordered }, $$restProps), {}, {
    default: () => {
      return `${each($$restProps.items, (item) => {
        return `${validate_component(renderers.unorderedlistitem || renderers.listitem || missing_component, "svelte:component").$$render($$result, Object.assign({}, item), {}, {
          default: () => {
            return `${validate_component(Parser, "svelte:self").$$render($$result, { tokens: item.tokens, renderers }, {}, {})} `;
          }
        })}`;
      })}`;
    }
  })}`}` : `${validate_component(renderers[type] || missing_component, "svelte:component").$$render($$result, Object.assign({}, $$restProps), {}, {
    default: () => {
      return `${tokens ? `${validate_component(Parser, "svelte:self").$$render($$result, { tokens, renderers }, {}, {})}` : `${escape($$restProps.raw)}`}`;
    }
  })}`}`}` : ``}`}`;
});
const key = {};
const Heading = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let id;
  let { depth } = $$props;
  let { raw } = $$props;
  let { text } = $$props;
  const { slug, getOptions } = getContext(key);
  const options = getOptions();
  if ($$props.depth === void 0 && $$bindings.depth && depth !== void 0)
    $$bindings.depth(depth);
  if ($$props.raw === void 0 && $$bindings.raw && raw !== void 0)
    $$bindings.raw(raw);
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  id = options.headerIds ? options.headerPrefix + slug(text) : void 0;
  return `${depth === 1 ? `<h1${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h1>` : `${depth === 2 ? `<h2${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h2>` : `${depth === 3 ? `<h3${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h3>` : `${depth === 4 ? `<h4${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h4>` : `${depth === 5 ? `<h5${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h5>` : `${depth === 6 ? `<h6${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h6>` : `${escape(raw)}`}`}`}`}`}`}`;
});
const Paragraph = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<p>${slots.default ? slots.default({}) : ``}</p>`;
});
const Text = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { text } = $$props;
  let { raw } = $$props;
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  if ($$props.raw === void 0 && $$bindings.raw && raw !== void 0)
    $$bindings.raw(raw);
  return `${slots.default ? slots.default({}) : ``}`;
});
const Image = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { href = "" } = $$props;
  let { title = void 0 } = $$props;
  let { text = "" } = $$props;
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  return `<img${add_attribute("src", href, 0)}${add_attribute("title", title, 0)}${add_attribute("alt", text, 0)}>`;
});
const Link = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { href = "" } = $$props;
  let { title = void 0 } = $$props;
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  return `<a${add_attribute("href", href, 0)}${add_attribute("title", title, 0)}>${slots.default ? slots.default({}) : ``}</a>`;
});
const Em = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<em>${slots.default ? slots.default({}) : ``}</em>`;
});
const Del = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<del>${slots.default ? slots.default({}) : ``}</del>`;
});
const Codespan = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { raw } = $$props;
  if ($$props.raw === void 0 && $$bindings.raw && raw !== void 0)
    $$bindings.raw(raw);
  return `<code>${escape(raw.replace(/`/g, ""))}</code>`;
});
const Strong = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<strong>${slots.default ? slots.default({}) : ``}</strong>`;
});
const Table = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<table>${slots.default ? slots.default({}) : ``}</table>`;
});
const TableHead = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<thead>${slots.default ? slots.default({}) : ``}</thead>`;
});
const TableBody = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<tbody>${slots.default ? slots.default({}) : ``}</tbody>`;
});
const TableRow = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<tr>${slots.default ? slots.default({}) : ``}</tr>`;
});
const TableCell = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { header } = $$props;
  let { align } = $$props;
  if ($$props.header === void 0 && $$bindings.header && header !== void 0)
    $$bindings.header(header);
  if ($$props.align === void 0 && $$bindings.align && align !== void 0)
    $$bindings.align(align);
  return `${header ? `<th${add_attribute("align", align, 0)}>${slots.default ? slots.default({}) : ``}</th>` : `<td${add_attribute("align", align, 0)}>${slots.default ? slots.default({}) : ``}</td>`}`;
});
const List = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { ordered } = $$props;
  let { start } = $$props;
  if ($$props.ordered === void 0 && $$bindings.ordered && ordered !== void 0)
    $$bindings.ordered(ordered);
  if ($$props.start === void 0 && $$bindings.start && start !== void 0)
    $$bindings.start(start);
  return `${ordered ? `<ol${add_attribute("start", start, 0)}>${slots.default ? slots.default({}) : ``}</ol>` : `<ul>${slots.default ? slots.default({}) : ``}</ul>`}`;
});
const ListItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<li>${slots.default ? slots.default({}) : ``}</li>`;
});
const Hr = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<hr>`;
});
const Html = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { text } = $$props;
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  return `<!-- HTML_TAG_START -->${text}<!-- HTML_TAG_END -->`;
});
const Blockquote = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<blockquote>${slots.default ? slots.default({}) : ``}</blockquote>`;
});
const Code = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { lang } = $$props;
  let { text } = $$props;
  if ($$props.lang === void 0 && $$bindings.lang && lang !== void 0)
    $$bindings.lang(lang);
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  return `<pre${add_attribute("class", lang, 0)}><code>${escape(text)}</code></pre>`;
});
const Br = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<br>${slots.default ? slots.default({}) : ``}`;
});
const defaultRenderers = {
  heading: Heading,
  paragraph: Paragraph,
  text: Text,
  image: Image,
  link: Link,
  em: Em,
  strong: Strong,
  codespan: Codespan,
  del: Del,
  table: Table,
  tablehead: TableHead,
  tablebody: TableBody,
  tablerow: TableRow,
  tablecell: TableCell,
  list: List,
  orderedlistitem: null,
  unorderedlistitem: null,
  listitem: ListItem,
  hr: Hr,
  html: Html,
  blockquote: Blockquote,
  code: Code,
  br: Br
};
const defaultOptions = {
  baseUrl: null,
  breaks: false,
  gfm: true,
  headerIds: true,
  headerPrefix: "",
  highlight: null,
  langPrefix: "language-",
  mangle: true,
  pedantic: false,
  renderer: null,
  sanitize: false,
  sanitizer: null,
  silent: false,
  smartLists: false,
  smartypants: false,
  tokenizer: null,
  xhtml: false
};
const SvelteMarkdown = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let preprocessed;
  let slugger;
  let combinedOptions;
  let combinedRenderers;
  let { source = [] } = $$props;
  let { renderers = {} } = $$props;
  let { options = {} } = $$props;
  let { isInline = false } = $$props;
  const dispatch = createEventDispatcher();
  let tokens;
  let lexer;
  setContext(key, {
    slug: (val) => slugger ? slugger.slug(val) : "",
    getOptions: () => combinedOptions
  });
  if ($$props.source === void 0 && $$bindings.source && source !== void 0)
    $$bindings.source(source);
  if ($$props.renderers === void 0 && $$bindings.renderers && renderers !== void 0)
    $$bindings.renderers(renderers);
  if ($$props.options === void 0 && $$bindings.options && options !== void 0)
    $$bindings.options(options);
  if ($$props.isInline === void 0 && $$bindings.isInline && isInline !== void 0)
    $$bindings.isInline(isInline);
  preprocessed = Array.isArray(source);
  slugger = source ? new Slugger() : void 0;
  combinedOptions = { ...defaultOptions, ...options };
  {
    if (preprocessed) {
      tokens = source;
    } else {
      lexer = new Lexer(combinedOptions);
      tokens = isInline ? lexer.inlineTokens(source) : lexer.lex(source);
      dispatch("parsed", { tokens });
    }
  }
  combinedRenderers = { ...defaultRenderers, ...renderers };
  return `${validate_component(Parser, "Parser").$$render($$result, { tokens, renderers: combinedRenderers }, {}, {})}`;
});
const css = {
  code: "section.svelte-qusxqe{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0.6}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $messages, $$unsubscribe_messages;
  let $input, $$unsubscribe_input;
  const sound = new Howl({ src: ["/assets/typing.wav"] });
  const { input, handleSubmit, messages } = useChat({
    onFinish: () => {
      sound.play();
    }
  });
  $$unsubscribe_input = subscribe(input, (value) => $input = value);
  $$unsubscribe_messages = subscribe(messages, (value) => $messages = value);
  $$result.css.add(css);
  $$unsubscribe_messages();
  $$unsubscribe_input();
  return `${$$result.head += `<!-- HEAD_svelte-i58lgr_START -->${$$result.title = `<title>Chat</title>`, ""}<meta name="description" content="Chat"><!-- HEAD_svelte-i58lgr_END -->`, ""} <section class="svelte-qusxqe"><h1 data-svelte-h="svelte-irq1ok">Awesome Chat App</h1> <ul>${each($messages, (message) => {
    return `${message.role === "system" ? `// Don&#39;t show system messages` : `${message.role === "user" ? `<li>${escape(message.role)}: ${escape(message.content)}</li>` : `<li>${escape(message.role)}: ${validate_component(SvelteMarkdown, "SvelteMarkdown").$$render($$result, { source: message.content }, {}, {})}</li>`}`}`;
  })}</ul> <form><textarea>${escape($input || "")}</textarea> <button type="submit" data-svelte-h="svelte-ah9bu5">Send</button></form> </section>`;
});
export {
  Page as default
};
