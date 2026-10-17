const fs = require("fs/promises");

let pdfjsPromise;

const loadPdfJs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );
  }

  return pdfjsPromise;
};

const round = (value) =>
  Number.isFinite(
    Number(value)
  )
    ? Math.round(
        Number(value) * 10
      ) / 10
    : null;

const different = (
  first,
  second,
  tolerance = 0
) => {
  if (
    first === null ||
    second === null
  ) {
    return first !== second;
  }

  return (
    Math.abs(
      Number(first) -
        Number(second)
    ) > tolerance
  );
};

const safeGatewayUrl = (
  cid
) => {
  const gateway =
    String(
      process.env
        .PINATA_GATEWAY ||
        ""
    )
      .trim()
      .replace(
        /\/+$/,
        ""
      );

  if (
    !gateway ||
    !cid
  ) {
    return null;
  }

  let base;

  try {
    base =
      new URL(
        `${gateway}/`
      );
  } catch {
    return null;
  }

  const safeHttps =
    base.protocol ===
    "https:";

  const safeLocalHttp =
    base.protocol ===
      "http:" &&
    [
      "localhost",
      "127.0.0.1",
    ].includes(
      base.hostname
    );

  if (
    !safeHttps &&
    !safeLocalHttp
  ) {
    return null;
  }

  return new URL(
    encodeURIComponent(
      String(cid)
    ),
    base
  ).toString();
};

async function fetchOfficialPdf(
  credential
) {
  if (
    process.env
      .TAMPER_STRUCTURE_COMPARE_ENABLED !==
    "true"
  ) {
    return {
      available: false,
      reason:
        "STRUCTURAL_COMPARISON_DISABLED",
      bytes: null,
    };
  }

  const url =
    safeGatewayUrl(
      credential?.ipfs_cid
    );

  if (!url) {
    return {
      available: false,
      reason:
        "AUTHORITATIVE_PDF_UNAVAILABLE",
      bytes: null,
    };
  }

  const controller =
    new AbortController();

  const timeout =
    Math.min(
      Math.max(
        Number(
          process.env
            .TAMPER_BASELINE_FETCH_TIMEOUT_MS ||
            5000
        ),
        1000
      ),
      10000
    );

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeout
    );

  try {
    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,
          redirect:
            "follow",
        }
      );

    if (!response.ok) {
      return {
        available:
          false,
        reason:
          "AUTHORITATIVE_PDF_UNAVAILABLE",
        bytes:
          null,
      };
    }

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    const maximumBytes =
      12 * 1024 * 1024;

    if (
      buffer.length === 0 ||
      buffer.length >
        maximumBytes
    ) {
      return {
        available:
          false,
        reason:
          "AUTHORITATIVE_PDF_INVALID",
        bytes:
          null,
      };
    }

    if (
      buffer
        .subarray(
          0,
          5
        )
        .toString(
          "ascii"
        ) !== "%PDF-"
    ) {
      return {
        available:
          false,
        reason:
          "AUTHORITATIVE_PDF_INVALID",
        bytes:
          null,
      };
    }

    return {
      available: true,
      reason: null,
      bytes:
        new Uint8Array(
          buffer
        ),
    };
  } catch {
    return {
      available: false,
      reason:
        "AUTHORITATIVE_PDF_UNAVAILABLE",
      bytes: null,
    };
  } finally {
    clearTimeout(
      timer
    );
  }
}

async function extractStructure(
  bytes
) {
  const pdfjs =
    await loadPdfJs();

  const task =
    pdfjs.getDocument({
      data:
        bytes instanceof
        Uint8Array
          ? bytes
          : new Uint8Array(
              bytes
            ),
      disableWorker:
        true,
    });

  const pdf =
    await task.promise;

  const metadataResult =
    await pdf
      .getMetadata()
      .catch(() => ({
        info: {},
      }));

  const info =
    metadataResult?.info &&
    typeof metadataResult
      .info ===
      "object"
      ? metadataResult.info
      : {};

  const metadataKeys = [
    "Title",
    "Author",
    "Subject",
    "Creator",
    "Producer",
    "CreationDate",
    "ModDate",
    "Keywords",
  ];

  const metadata = {};

  for (
    const key of
    metadataKeys
  ) {
    metadata[key] =
      info[key] ?? null;
  }

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <=
    pdf.numPages;
    pageNumber += 1
  ) {
    const page =
      await pdf.getPage(
        pageNumber
      );

    const viewport =
      page.getViewport({
        scale: 1,
      });

    const content =
      await page
        .getTextContent();

    const items =
      content.items.map(
        (item) => {
          const transform =
            Array.isArray(
              item.transform
            )
              ? item.transform
              : [];

          return {
            text:
              String(
                item.str ??
                  ""
              ),

            fontName:
              typeof item
                .fontName ===
              "string"
                ? item
                    .fontName
                : null,

            x:
              round(
                transform[4]
              ),

            y:
              round(
                transform[5]
              ),

            width:
              round(
                item.width
              ),

            height:
              round(
                item.height
              ),

            hasEOL:
              Boolean(
                item.hasEOL
              ),
          };
        }
      );

    pages.push({
      pageNumber,

      width:
        round(
          viewport.width
        ),

      height:
        round(
          viewport.height
        ),

      items,
    });
  }

  return {
    pageCount:
      pdf.numPages,

    metadata,

    pages,
  };
}

const pushChange = (
  changes,
  type,
  label,
  count
) => {
  if (
    Number(count) >
    0
  ) {
    changes.push({
      type,
      label,
      count:
        Number(count),
    });
  }
};

function compareStructures(
  official,
  submitted
) {
  const changes = [];

  if (
    official.pageCount !==
    submitted.pageCount
  ) {
    pushChange(
      changes,
      "PAGE_COUNT_CHANGED",
      "Page count changed",
      1
    );
  }

  let pageDimensions =
    0;

  let textObjectCount =
    0;

  let positionChanges =
    0;

  let fontChanges =
    0;

  let fontSizeChanges =
    0;

  let widthChanges =
    0;

  const pages =
    Math.min(
      official.pages
        .length,
      submitted.pages
        .length
    );

  for (
    let index = 0;
    index < pages;
    index += 1
  ) {
    const originalPage =
      official.pages[
        index
      ];

    const submittedPage =
      submitted.pages[
        index
      ];

    if (
      different(
        originalPage.width,
        submittedPage.width,
        0.5
      ) ||
      different(
        originalPage.height,
        submittedPage.height,
        0.5
      )
    ) {
      pageDimensions +=
        1;
    }

    if (
      originalPage.items
        .length !==
      submittedPage.items
        .length
    ) {
      textObjectCount +=
        1;
    }

    const itemCount =
      Math.min(
        originalPage.items
          .length,
        submittedPage.items
          .length
      );

    for (
      let itemIndex = 0;
      itemIndex <
      itemCount;
      itemIndex += 1
    ) {
      const original =
        originalPage.items[
          itemIndex
        ];

      const current =
        submittedPage.items[
          itemIndex
        ];

      if (
        different(
          original.x,
          current.x,
          1
        ) ||
        different(
          original.y,
          current.y,
          1
        )
      ) {
        positionChanges +=
          1;
      }

      if (
        original.fontName !==
        current.fontName
      ) {
        fontChanges +=
          1;
      }

      if (
        different(
          original.height,
          current.height,
          0.5
        )
      ) {
        fontSizeChanges +=
          1;
      }

      if (
        different(
          original.width,
          current.width,
          1
        )
      ) {
        widthChanges +=
          1;
      }
    }
  }

  const metadataChanges =
    [];

  const metadataKeys =
    new Set([
      ...Object.keys(
        official.metadata ||
          {}
      ),
      ...Object.keys(
        submitted.metadata ||
          {}
      ),
    ]);

  for (
    const key of
    metadataKeys
  ) {
    const first =
      String(
        official
          .metadata?.[
          key
        ] ?? ""
      );

    const second =
      String(
        submitted
          .metadata?.[
          key
        ] ?? ""
      );

    if (
      first !== second
    ) {
      metadataChanges.push(
        key
      );
    }
  }

  pushChange(
    changes,
    "PAGE_DIMENSIONS_CHANGED",
    "Page dimensions changed",
    pageDimensions
  );

  pushChange(
    changes,
    "TEXT_OBJECT_COUNT_CHANGED",
    "Text / whitespace structure changed",
    textObjectCount
  );

  pushChange(
    changes,
    "TEXT_POSITION_CHANGED",
    "Text position changed",
    positionChanges
  );

  pushChange(
    changes,
    "FONT_CHANGED",
    "Font changed",
    fontChanges
  );

  pushChange(
    changes,
    "FONT_SIZE_CHANGED",
    "Font size changed",
    fontSizeChanges
  );

  pushChange(
    changes,
    "TEXT_WIDTH_CHANGED",
    "Text spacing or width changed",
    widthChanges
  );

  pushChange(
    changes,
    "PDF_METADATA_CHANGED",
    "PDF metadata changed",
    metadataChanges.length
  );

  return {
    structureModified:
      changes.length >
      0,

    changes,

    metadataChanges,
  };
}

async function analysePdfStructureAgainstOfficial({
  filePath,
  credential,
}) {
  try {
    const official =
      await fetchOfficialPdf(
        credential
      );

    if (
      !official.available ||
      !official.bytes
    ) {
      return {
        analysisAvailable:
          false,

        reason:
          official.reason,

        structureModified:
          null,

        changes: [],

        metadataChanges:
          [],
      };
    }

    const submittedBytes =
      new Uint8Array(
        await fs.readFile(
          filePath
        )
      );

    const [
      officialStructure,
      submittedStructure,
    ] =
      await Promise.all([
        extractStructure(
          official.bytes
        ),

        extractStructure(
          submittedBytes
        ),
      ]);

    const comparison =
      compareStructures(
        officialStructure,
        submittedStructure
      );

    return {
      analysisAvailable:
        true,

      baseline:
        "AUTHORITATIVE_IPFS_ORIGINAL",

      ...comparison,
    };
  } catch {
    return {
      analysisAvailable:
        false,

      reason:
        "STRUCTURAL_ANALYSIS_UNAVAILABLE",

      structureModified:
        null,

      changes: [],

      metadataChanges:
        [],
    };
  }
}

module.exports = {
  analysePdfStructureAgainstOfficial,
  extractStructure,
  compareStructures,
};
