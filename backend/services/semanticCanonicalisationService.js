const MONTHS = new Map([
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["may", 5],
  ["june", 6],
  ["july", 7],
  ["august", 8],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
]);

const normalizeText =
  (value) =>
    String(
      value ?? ""
    )
      .normalize("NFKC")
      .replace(
        /[\u2012\u2013\u2014\u2212]/g,
        "-"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .toLowerCase();

const validDate =
  (
    year,
    month,
    day
  ) => {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return false;
    }

    if (
      year < 1900 ||
      year > 2200 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return false;
    }

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    return (
      date.getUTCFullYear() ===
        year &&
      date.getUTCMonth() ===
        month - 1 &&
      date.getUTCDate() ===
        day
    );
  };

const formatDate =
  (
    year,
    month,
    day
  ) => {
    if (
      !validDate(
        year,
        month,
        day
      )
    ) {
      return null;
    }

    return [
      String(year).padStart(
        4,
        "0"
      ),

      String(month).padStart(
        2,
        "0"
      ),

      String(day).padStart(
        2,
        "0"
      ),
    ].join("-");
  };

const canonicalizeDate =
  (value) => {
    const text =
      String(
        value ?? ""
      )
        .normalize("NFKC")
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (!text) {
      return null;
    }

    let match;

    match =
      text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
      );

    if (match) {
      return formatDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3])
      );
    }

    match =
      text.match(
        /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/
      );

    if (match) {
      return formatDate(
        Number(match[3]),
        Number(match[2]),
        Number(match[1])
      );
    }

    match =
      text.match(
        /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i
      );

    if (match) {
      const month =
        MONTHS.get(
          match[2]
            .toLowerCase()
        );

      return month
        ? formatDate(
            Number(match[3]),
            month,
            Number(match[1])
          )
        : null;
    }

    match =
      text.match(
        /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i
      );

    if (match) {
      const month =
        MONTHS.get(
          match[1]
            .toLowerCase()
        );

      return month
        ? formatDate(
            Number(match[3]),
            month,
            Number(match[2])
          )
        : null;
    }

    return null;
  };

const canonicalizeFieldValue =
  (
    field,
    value
  ) => {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return null;
    }

    if (
      field ===
        "issue_date" ||
      field ===
        "award_date"
    ) {
      return canonicalizeDate(
        value
      );
    }

    return normalizeText(
      value
    );
  };

module.exports = {
  normalizeText,
  canonicalizeDate,
  canonicalizeFieldValue,
};
