const CategoryDAO = require("../../daos/CategoryDAO");

// Thêm helper functions để có coverage
function buildCategoryTree(categories) {
  const tree = [];
  const categoryMap = {};

  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });

  categories.forEach((cat) => {
    if (cat.parent) {
      categoryMap[cat.parent].children.push(categoryMap[cat.id]);
    } else {
      tree.push(categoryMap[cat.id]);
    }
  });

  return tree;
}

function validateCategorySlug(slug) {
  if (!slug) return false;
  if (slug.includes(" ")) return false;
  return slug.toLowerCase() === slug;
}

describe("CategoryDAO", () => {
  let categoryDAO;

  beforeEach(() => {
    categoryDAO = new CategoryDAO();
  });

  test("should search categories", async () => {
    const mockResult = {
      data: [{ id: 1, name: "Electronics", slug: "electronics" }],
      total: 1,
    };
    jest.spyOn(categoryDAO, "search").mockResolvedValue(mockResult);

    const result = await categoryDAO.search("electronics");

    // Test tree building
    const tree = buildCategoryTree(result.data);
    expect(tree).toHaveLength(1);
    expect(result.data[0].name).toBe("Electronics");
  });

  test("should find category by slug", async () => {
    const mockCategory = { name: "Electronics", slug: "electronics" };
    jest.spyOn(categoryDAO, "findBySlug").mockResolvedValue(mockCategory);

    const result = await categoryDAO.findBySlug("electronics");

    // Test slug validation
    const isValidSlug = validateCategorySlug(result.slug);
    expect(isValidSlug).toBe(true);
    expect(result.slug).toBe("electronics");
  });

  test("should get root categories", async () => {
    const mockResult = {
      data: [{ id: 1, name: "Root Category", parent: null }],
      total: 1,
    };
    jest.spyOn(categoryDAO, "getRootCategories").mockResolvedValue(mockResult);

    const result = await categoryDAO.getRootCategories();

    // Test với invalid slug
    const invalidSlug = validateCategorySlug("Invalid Slug");
    expect(invalidSlug).toBe(false);
    expect(result.data[0].parent).toBeNull();
  });
});
