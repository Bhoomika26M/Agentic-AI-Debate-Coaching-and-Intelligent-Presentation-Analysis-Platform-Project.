// Strips the backend's <<learner turn>> prompt wrapper from model output.

const CONTROL_MARKER = /<<\s*\/?\s*learner[\s_-]*turn\b[^<>]*>>/gi;
// A tail that could still become a marker once the next delta arrives.
const PARTIAL_MARKER =
  /^<{1,2}(?:\s*\/\s*)?l?e?a?r?n?e?r?(?:\s*t(?:u(?:r(?:n(?:\b[^<>]*>?>?)?)?)?)?)?$/i;
const DOUBLE_SPACE = /[ \t]{2,}/g;
const MAX_HOLD = 160; // a longer fragment is not the wrapper the backend writes

/** Remove any complete `<<learner turn>>` wrappers from finished text. */
export function stripControlMarkers(text: string): string {
  return text.includes("<<") ? text.replace(CONTROL_MARKER, "") : text;
}

/** A stateful filter for one streamed reply. */
export function createMarkerScrubber() {
  let pending = ""; // may still turn into a marker on the next delta
  let started = false;

  function emit(text: string) {
    if (!started) {
      text = text.trimStart(); // a stripped leading wrapper leaves its whitespace behind
      started = text.length > 0;
    }
    return text;
  }

  return {
    push(chunk: string) {
      pending = (pending + chunk).replace(CONTROL_MARKER, "");
      // A marker starts at the first '<' in a run, not the last one.
      let start = pending.lastIndexOf("<");
      while (start > 0 && pending[start - 1] === "<") start -= 1;
      const tail = start < 0 ? "" : pending.slice(start);
      const cut =
        start >= 0 && tail.length <= MAX_HOLD && PARTIAL_MARKER.test(tail)
          ? start
          : pending.length;
      const ready = pending.slice(0, cut).replace(DOUBLE_SPACE, " ");
      pending = pending.slice(cut);
      return emit(ready);
    },
    flush() {
      const ready = pending.replace(DOUBLE_SPACE, " ");
      pending = "";
      return emit(ready);
    },
  };
}
