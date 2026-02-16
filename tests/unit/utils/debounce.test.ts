import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce } from "@/lib/utils/debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays function execution by specified ms", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets timer on repeated calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes arguments to the debounced function", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a", "b");
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith("a", "b");
  });
});
