const parsePositiveInteger = (value, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    const error = new Error("Pagination value is outside the allowed range.");
    error.statusCode = 400; error.code = "VALIDATION_ERROR"; throw error;
  }
  return parsed;
};
const parsePage = (value) => parsePositiveInteger(value, 1);
const parseLimit = (value) => parsePositiveInteger(value, 20, 100);
const calculateOffset = (page, limit) => (page - 1) * limit;
const buildPaginationMetadata = ({ page, limit, total }) => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && totalPages > 0 };
};
const paginationFromQuery = (query = {}) => { const page = parsePage(query.page); const limit = parseLimit(query.limit); return { page, limit, offset: calculateOffset(page, limit) }; };
module.exports = { parsePage, parseLimit, calculateOffset, buildPaginationMetadata, paginationFromQuery };
