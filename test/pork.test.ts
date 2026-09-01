/**
 * Unit tests for the pork matcher. Pure function, no server needed.
 *
 * The interesting cases are the word boundaries: naive substring matching
 * rejects "graham crackers" and "hamburger", which would quietly hide a lot of
 * perfectly good recipes.
 */
import { describe, expect, it } from "vitest";
import { hasPork, textHasPork } from "../src/worker/pork";

describe("textHasPork", () => {
  it.each([
    "pork",
    "Pork Belly",
    "smoked bacon",
    "BACON",
    "serrano ham",
    "thick-cut ham",
    "prosciutto di Parma",
    "pancetta cubes",
    "chorizo",
    "pepperoni",
    "italian sausage",
    "lardons",
    "gammon steak",
    "spam",
  ])("flags %j", (text) => {
    expect(textHasPork(text)).toBe(true);
  });

  it.each([
    "graham crackers",
    "hamburger buns",
    "hammered steak",
    "chicken",
    "beef brisket",
    "porcini mushrooms",
    "larder staples",
    "champagne",
    "shampoo",
    "hamper",
    "",
  ])("does not flag %j", (text) => {
    expect(textHasPork(text)).toBe(false);
  });

  it("handles null and undefined", () => {
    expect(textHasPork(null)).toBe(false);
    expect(textHasPork(undefined)).toBe(false);
  });
});

describe("hasPork", () => {
  it("catches pork named only in the title", () => {
    expect(
      hasPork({ title: "Pulled Pork Tacos", ingredients: [{ name: "tortilla" }] }),
    ).toBe(true);
  });

  it("catches pork hiding in an ingredient", () => {
    expect(
      hasPork({
        title: "Carbonara",
        ingredients: [{ name: "guanciale", original: "150g guanciale" }],
      }),
    ).toBe(true);
  });

  it("catches pork in the original line when the name is vague", () => {
    expect(
      hasPork({ title: "Stew", ingredients: [{ name: "meat", original: "200g diced pork" }] }),
    ).toBe(true);
  });

  it("passes a clean recipe", () => {
    expect(
      hasPork({
        title: "Chicken and Hamburger Buns",
        ingredients: [
          { name: "chicken thigh", original: "4 chicken thighs" },
          { name: "graham crackers", original: "100g graham crackers" },
        ],
      }),
    ).toBe(false);
  });

  it("copes with a recipe that has no ingredients", () => {
    expect(hasPork({ title: "Toast" })).toBe(false);
    expect(hasPork({ title: "Toast", ingredients: null })).toBe(false);
  });
});
