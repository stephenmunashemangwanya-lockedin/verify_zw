const {
  normalizeText,
} = require(
  "./semanticCanonicalisationService"
);

const cleanItemText =
  value =>
    String(value ?? "")
      .normalize("NFKC")
      .replace(/\s+/g, " ");

const mergeBounds =
  rows => {
    const usable =
      rows.filter(Boolean);

    if (!usable.length) {
      return null;
    }

    return {
      x1:
        Math.min(
          ...usable.map(
            row => row.x1
          )
        ),

      x2:
        Math.max(
          ...usable.map(
            row => row.x2
          )
        ),

      y:
        usable[0].y,

      height:
        Math.max(
          ...usable.map(
            row =>
              row.height || 1
          )
        ),
    };
  };

const combineRows =
  (
    rows,
    start,
    span = 1
  ) =>
    normalizeText(
      rows
        .slice(
          start,
          start + span
        )
        .map(
          row => row.text
        )
        .join(" ")
    );

const visualRowsFromItems =
  (
    items,
    pageWidth,
    pageHeight
  ) => {
    const glyphs =
      items
        .filter(
          item =>
            typeof item.str ===
              "string" &&
            Number.isFinite(
              item.transform?.[4]
            ) &&
            Number.isFinite(
              item.transform?.[5]
            )
        )
        .map(
          item => ({
            text:
              cleanItemText(
                item.str
              ),

            raw:
              String(
                item.str ?? ""
              ),

            x:
              Number(
                item.transform[4]
              ),

            y:
              Number(
                item.transform[5]
              ),

            width:
              Math.max(
                0,
                Number(
                  item.width || 0
                )
              ),

            height:
              Math.max(
                1,
                Number(
                  item.height || 0
                ) ||
                  Math.abs(
                    Number(
                      item.transform?.[3] ||
                        1
                    )
                  )
              ),

            hasEOL:
              Boolean(
                item.hasEOL
              ),
          })
        );

    glyphs.sort(
      (a, b) =>
        b.y - a.y ||
        a.x - b.x
    );

    const buckets = [];

    for (
      const glyph of glyphs
    ) {
      let best =
        null;

      let bestDistance =
        Infinity;

      for (
        const bucket of buckets
      ) {
        const tolerance =
          Math.max(
            2.5,
            Math.min(
              8,
              Math.max(
                bucket.height ||
                  1,
                glyph.height ||
                  1
              ) * 0.35
            )
          );

        const distance =
          Math.abs(
            bucket.y -
              glyph.y
          );

        if (
          distance <=
            tolerance &&
          distance <
            bestDistance
        ) {
          best =
            bucket;

          bestDistance =
            distance;
        }
      }

      if (!best) {
        best = {
          y:
            glyph.y,

          height:
            glyph.height,

          items: [],
        };

        buckets.push(
          best
        );
      }

      best.items.push(
        glyph
      );

      best.height =
        Math.max(
          best.height,
          glyph.height
        );
    }

    buckets.sort(
      (a, b) =>
        b.y - a.y
    );

    return buckets
      .map(
        bucket => {
          bucket.items.sort(
            (a, b) =>
              a.x - b.x
          );

          let text = "";
          let previousRight =
            null;
          let pendingSpace =
            false;

          for (
            const item of
            bucket.items
          ) {
            const raw =
              item.raw;

            const right =
              item.x +
              item.width;

            /*
             * This is critical:
             * PDF.js may emit the visible space
             * as its own text object.
             *
             * Do NOT throw that object away and
             * then concatenate the surrounding
             * words.
             */
            if (
              !raw ||
              !raw.trim()
            ) {
              if (text) {
                pendingSpace =
                  true;
              }

              previousRight =
                right;

              continue;
            }

            const cleaned =
              cleanItemText(
                raw
              ).trim();

            if (!cleaned) {
              continue;
            }

            const gap =
              previousRight ===
                null
                ? 0
                : item.x -
                  previousRight;

            const inferredSpace =
              text &&
              gap >
                Math.max(
                  0.8,
                  item.height *
                    0.12
                );

            if (
              text &&
              (
                pendingSpace ||
                inferredSpace
              ) &&
              !text.endsWith(" ")
            ) {
              text += " ";
            }

            text +=
              cleaned;

            pendingSpace =
              false;

            previousRight =
              right;
          }

          const useful =
            bucket.items.filter(
              item =>
                item.raw &&
                item.raw.trim()
            );

          const x1 =
            useful.length
              ? Math.min(
                  ...useful.map(
                    item =>
                      item.x
                  )
                )
              : 0;

          const x2 =
            useful.length
              ? Math.max(
                  ...useful.map(
                    item =>
                      item.x +
                      item.width
                  )
                )
              : 0;

          const width =
            Math.max(
              1,
              Number(
                pageWidth || 1
              )
            );

          const height =
            Math.max(
              1,
              Number(
                pageHeight || 1
              )
            );

          return {
            text:
              text.trim(),

            norm:
              normalizeText(
                text
              ),

            x1,
            x2,
            y:
              bucket.y,

            height:
              bucket.height,

            nx1:
              x1 / width,

            nx2:
              x2 / width,

            ny:
              bucket.y /
              height,

            nheight:
              bucket.height /
              height,
          };
        }
      )
      .filter(
        row =>
          Boolean(
            row.norm
          )
      );
  };

async function extractSemanticLayout(
  bytes
) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const loadingTask =
    pdfjs.getDocument({
      data:
        new Uint8Array(
          bytes
        ),

      disableWorker:
        true,
    });

  try {
    const pdf =
      await loadingTask.promise;

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

      pages.push({
        pageNumber,

        width:
          viewport.width,

        height:
          viewport.height,

        rows:
          visualRowsFromItems(
            content.items,
            viewport.width,
            viewport.height
          ),
      });
    }

    return pages;
  } finally {
    await loadingTask
      .destroy()
      .catch(() => {});
  }
}

module.exports = {
  extractSemanticLayout,
  visualRowsFromItems,
  combineRows,
  mergeBounds,
};
