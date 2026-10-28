const path = require("path");
const fs = require("fs");

async function inspect(file) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const bytes =
    new Uint8Array(
      fs.readFileSync(file)
    );

  const task =
    pdfjs.getDocument({
      data: bytes,
      disableWorker: true,
    });

  const pdf =
    await task.promise;

  const pages = [];

  try {

    for (
      let pageNo = 1;
      pageNo <= pdf.numPages;
      pageNo++
    ) {

      const page =
        await pdf.getPage(pageNo);

      const content =
        await page.getTextContent();

      pages.push({
        page: pageNo,

        items:
          content.items
            .filter(
              item =>
                typeof item.str ===
                "string"
            )
            .map(
              (item, index) => ({
                index,

                text:
                  item.str,

                x:
                  item.transform?.[4],

                y:
                  item.transform?.[5],

                width:
                  item.width,

                height:
                  item.height,

                hasEOL:
                  Boolean(
                    item.hasEOL
                  ),
              })
            ),
      });
    }

  } finally {
    await task.destroy();
  }

  return pages;
}

(async () => {

  const files =
    process.argv.slice(2);

  for (const file of files) {

    console.log(
      "\n========================================"
    );

    console.log(
      path.basename(file)
    );

    console.log(
      "========================================"
    );

    const pages =
      await inspect(file);

    for (const page of pages) {

      console.log(
        `\nPAGE ${page.page}`
      );

      for (const item of page.items) {

        console.log(
          [
            String(item.index)
              .padStart(3, "0"),

            `x=${Number(item.x || 0)
              .toFixed(1)}`,

            `y=${Number(item.y || 0)
              .toFixed(1)}`,

            `w=${Number(item.width || 0)
              .toFixed(1)}`,

            `EOL=${item.hasEOL}`,

            JSON.stringify(
              item.text
            ),
          ].join(" | ")
        );
      }
    }
  }

})().catch(error => {
  console.error(error);
  process.exit(1);
});
