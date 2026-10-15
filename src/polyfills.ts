/**
 * Essential browser polyfills for iOS Safari (< 18), older mobile browsers,
 * and environments lacking modern ECMAScript / Web APIs.
 */

// 1. URL.parse (added in Safari 18.0, Chrome 126, Node 22.1)
// Required by pdfjs-dist v5 (e.g. PDFWorker._isSameOrigin)
if (typeof URL !== "undefined" && typeof (URL as any).parse !== "function") {
  (URL as any).parse = function (url: string | URL, base?: string | URL): URL | null {
    try {
      return new URL(url as string, base as string);
    } catch {
      return null;
    }
  };
}

// 2. URL.canParse (added in Safari 17.0, Chrome 120)
if (typeof URL !== "undefined" && typeof (URL as any).canParse !== "function") {
  (URL as any).canParse = function (url: string | URL, base?: string | URL): boolean {
    try {
      new URL(url as string, base as string);
      return true;
    } catch {
      return false;
    }
  };
}

// 3. Promise.withResolvers (added in Safari 17.4, Chrome 119)
// Required extensively by pdfjs-dist v5 (PDFDocumentLoadingTask, RenderTask, etc.)
if (typeof Promise !== "undefined" && typeof (Promise as any).withResolvers !== "function") {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// 4. Object.hasOwn (added in Safari 15.4)
if (typeof Object !== "undefined" && typeof (Object as any).hasOwn !== "function") {
  (Object as any).hasOwn = function (object: unknown, property: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(object, property);
  };
}

// 5. Array.prototype.at (added in Safari 15.4)
if (typeof Array !== "undefined" && !Array.prototype.at) {
  Array.prototype.at = function (index: number) {
    const n = Math.trunc(index) || 0;
    const k = n >= 0 ? n : this.length + n;
    if (k < 0 || k >= this.length) return undefined;
    return this[k];
  };
}

export {};
