import { describe, it, expect } from "vitest";
import { shallowEqual } from "../core/shallow";

describe("shallowEqual", () => {
  it("returns true for the same reference", () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it("returns true for different objects with equal top-level keys", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns false when a key differs", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false when key counts differ", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("does not deep-compare nested objects (shallow only)", () => {
    const nested = { x: 1 };
    expect(shallowEqual({ a: nested }, { a: { x: 1 } })).toBe(false);
    expect(shallowEqual({ a: nested }, { a: nested })).toBe(true);
  });

  it("handles primitives via Object.is", () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual(NaN, NaN)).toBe(true);
    expect(shallowEqual(0, -0)).toBe(false);
  });
});
