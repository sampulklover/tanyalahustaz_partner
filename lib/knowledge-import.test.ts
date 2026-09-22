import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDocumentFilename,
  reindexImportRows,
  validateImportRow,
} from "./knowledge-import";
import {
  cleanExtractedText,
  documentKindFromFilename,
  isSupportedDocument,
} from "./knowledge-extract";

describe("isDocumentFilename", () => {
  it("detects supported document uploads", () => {
    assert.equal(isDocumentFilename("fiqh-notes.pdf"), true);
    assert.equal(isDocumentFilename("ARTICLE.DOCX"), true);
    assert.equal(isDocumentFilename("notes.txt"), true);
  });

  it("leaves structured formats to the existing importer", () => {
    assert.equal(isDocumentFilename("articles.json"), false);
    assert.equal(isDocumentFilename("articles.csv"), false);
    assert.equal(isDocumentFilename("article.md"), false);
  });
});

describe("reindexImportRows", () => {
  it("renumbers rows after merging uploads", () => {
    const rows = reindexImportRows([
      { index: 9, row: null, error: "a" },
      { index: 9, row: null, error: "b" },
    ]);

    assert.deepEqual(
      rows.map((row) => row.index),
      [1, 2],
    );
  });
});

describe("validateImportRow", () => {
  it("derives a slug from the title when none is given", () => {
    const parsed = validateImportRow(
      {
        title: "Combining Prayers While Traveling",
        summary: "A concise overview of jamak and qasar for travellers.",
        content: "When traveling beyond the defined distance a Muslim may combine prayers.",
      },
      1,
      { defaultPublished: true },
    );

    assert.equal(parsed.row?.slug, "combining-prayers-while-traveling");
    assert.equal(parsed.row?.category, "general");
    assert.equal(parsed.row?.published, true);
  });

  it("flags rows that are too short to import", () => {
    const parsed = validateImportRow({ title: "Hi" }, 1, { defaultPublished: false });
    assert.equal(parsed.row, null);
    assert.match(parsed.error ?? "", /Title is required/);
  });
});

describe("documentKindFromFilename", () => {
  it("maps extensions to a document kind", () => {
    assert.equal(documentKindFromFilename("a.pdf"), "pdf");
    assert.equal(documentKindFromFilename("b.Docx"), "docx");
    assert.equal(documentKindFromFilename("c.txt"), "text");
    assert.equal(documentKindFromFilename("d.png"), null);
    assert.equal(isSupportedDocument("d.png"), false);
  });
});

describe("cleanExtractedText", () => {
  it("normalizes whitespace and strips control characters", () => {
    const cleaned = cleanExtractedText("Line one  \r\n\r\n\r\n\r\nLine   two\u0000");
    assert.equal(cleaned, "Line one\n\nLine two");
  });
});
