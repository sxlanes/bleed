import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  IconAgregadores,
  IconVelocidad,
  IconCanalPropio,
  IconMovil,
  IconReservas,
  IconTecnico,
  LeakCategoryIcon,
} from "../components/icons/LeakIcons";
import type { LeakCategory } from "../lib/types";

const ALL_CATEGORIES: LeakCategory[] = [
  "agregadores",
  "velocidad",
  "canal_propio",
  "movil",
  "reservas",
  "tecnico",
];

test("every leak category has a pure standalone SVG in public/icons/ and public/", () => {
  for (const cat of ALL_CATEGORIES) {
    const filename = cat === "canal_propio" ? "canal-propio.svg" : `${cat}.svg`;
    const iconPath = path.join(process.cwd(), "public", "icons", filename);
    const publicPath = path.join(process.cwd(), "public", filename);

    assert.ok(fs.existsSync(iconPath), `missing public/icons/${filename}`);
    assert.ok(fs.existsSync(publicPath), `missing public/${filename}`);

    const content = fs.readFileSync(iconPath, "utf8");
    assert.ok(content.includes('viewBox="0 0 24 24"'), `${filename} must have viewBox 0 0 24 24`);
    assert.ok(content.includes('fill="currentColor"'), `${filename} must use currentColor`);
    assert.ok(!content.includes("#0e1113"), `${filename} must not hardcode dark background colors`);
    assert.ok(!content.includes("#ffffff"), `${filename} must not hardcode white colors`);
    assert.ok(!content.includes("#f5f4f1"), `${filename} must not hardcode paper colors`);
  }
});

test("LeakCategoryIcon renders the correct brutalist SVG for every LeakCategory", () => {
  for (const cat of ALL_CATEGORIES) {
    const html = renderToStaticMarkup(
      React.createElement(LeakCategoryIcon, {
        category: cat,
        size: 24,
        className: `fuga-${cat}`,
      })
    );

    assert.ok(html.startsWith("<svg"), `Category ${cat} should render an <svg> tag`);
    assert.ok(html.includes('viewBox="0 0 24 24"'), `Category ${cat} should have viewBox="0 0 24 24"`);
    assert.ok(html.includes(`class="fuga-${cat}"`), `Category ${cat} should carry className`);
    assert.ok(html.includes('width="24"'), `Category ${cat} should respect size prop`);
  }
});

test("individual icon components render valid markup with customized size and attributes", () => {
  const compMap = [
    { name: "IconAgregadores", comp: IconAgregadores },
    { name: "IconVelocidad", comp: IconVelocidad },
    { name: "IconCanalPropio", comp: IconCanalPropio },
    { name: "IconMovil", comp: IconMovil },
    { name: "IconReservas", comp: IconReservas },
    { name: "IconTecnico", comp: IconTecnico },
  ];

  for (const { name, comp } of compMap) {
    const html = renderToStaticMarkup(
      React.createElement(comp, {
        size: 32,
        className: "test-icon",
        "data-testid": "leak-symbol",
      })
    );

    assert.ok(html.includes('width="32"'), `${name} rendered width="32"`);
    assert.ok(html.includes('height="32"'), `${name} rendered height="32"`);
    assert.ok(html.includes('data-testid="leak-symbol"'), `${name} passed through custom props`);
  }
});
